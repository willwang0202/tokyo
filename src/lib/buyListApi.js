/**
 * Buy-list persistence, talking to Supabase's PostgREST endpoint directly.
 *
 * Three calls (list, add, toggle) do not justify the supabase-js bundle, and
 * the write token has to travel as a per-request header — which the client
 * only accepts at construction time. Plain `fetch` keeps both simple.
 *
 * The anon key is public by design; every rule that matters (append-only, no
 * deletes, write token) is enforced by Row Level Security in the migration.
 */

const TABLE = 'buy_list_items';

/**
 * What a list read pulls back.
 *
 * `image_full` is deliberately absent and must stay that way. It is up to
 * 400 KB per row and the list is re-read every time the tab becomes visible —
 * i.e. every time a phone unlocks in Tokyo — so including it would put
 * megabytes on roaming data. `image_thumb` is a couple of KB and rides along.
 * A test asserts this.
 */
export const COLUMNS = 'id,name,note,area_key,added_by,is_bought,created_at,link,image_thumb';

/** Fetched one row at a time, only when someone opens a photo. */
const FULL_IMAGE_COLUMN = 'image_full';

const WRITE_TOKEN_HEADER = 'x-buy-list-token';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** False until the deploy is given its Supabase credentials; the UI says so. */
export const isBuyListConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Carries zh-TW copy safe to show the user; the cause holds the real detail. */
export class BuyListError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'BuyListError';
  }
}

const endpoint = (path) => `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`;

const baseHeaders = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
});

export const fromRow = (row) => ({
  id: row.id,
  name: row.name,
  note: row.note,
  areaKey: row.area_key,
  addedBy: row.added_by,
  isBought: row.is_bought,
  createdAt: row.created_at,
  link: row.link ?? null,
  imageThumb: row.image_thumb ?? null,
});

async function describeFailure(response) {
  // PostgREST answers with {message, code, details, hint}; log it, don't show it.
  const detail = await response.text().catch(() => '');
  console.error(`Buy list request failed (${response.status})`, detail);

  if (response.status === 401 || response.status === 403) {
    return new BuyListError('沒有寫入權限，請重新解鎖通行碼');
  }
  return new BuyListError('連線購物清單失敗，請稍後再試');
}

async function request(path, init) {
  if (!isBuyListConfigured) {
    throw new BuyListError('購物清單尚未設定資料庫連線');
  }

  let response;
  try {
    response = await fetch(endpoint(path), init);
  } catch (cause) {
    console.error('Buy list request could not reach Supabase', cause);
    throw new BuyListError('連線購物清單失敗，請檢查網路', { cause });
  }

  if (!response.ok) throw await describeFailure(response);

  return response.status === 204 ? null : response.json();
}

/**
 * @returns {Promise<object[]>} Every item, outstanding ones first, oldest first
 */
export async function fetchItems() {
  const rows = await request(
    `${TABLE}?select=${COLUMNS}&order=is_bought.asc,created_at.asc`,
    { headers: baseHeaders() }
  );
  return rows.map(fromRow);
}

/**
 * @param {object} item Output of `normaliseDraft`
 * @param {string} writeToken Output of `deriveWriteToken`
 * @returns {Promise<object>} The stored item
 */
export async function insertItem(item, writeToken) {
  const rows = await request(`${TABLE}?select=${COLUMNS}`, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      [WRITE_TOKEN_HEADER]: writeToken,
    },
    body: JSON.stringify({
      name: item.name,
      note: item.note,
      area_key: item.areaKey,
      added_by: item.addedBy,
      link: item.link,
      image_thumb: item.imageThumb,
      image_full: item.imageFull,
    }),
  });

  return fromRow(rows[0]);
}

/**
 * Pulls the large version of one item's photo. Kept out of the list read on
 * purpose — see COLUMNS.
 *
 * @param {string} id
 * @returns {Promise<string|null>} A data URL, or null if the item has no photo
 */
export async function fetchItemImage(id) {
  const rows = await request(
    `${TABLE}?id=eq.${encodeURIComponent(id)}&select=${FULL_IMAGE_COLUMN}`,
    { headers: baseHeaders() }
  );
  return rows[0]?.image_full ?? null;
}

/**
 * Attaches or replaces the photo and link on an existing item.
 *
 * Unlike the name and the note, these two are rewritable — migration 0003
 * grants UPDATE on them so a photo can be added to something already on the
 * list. The two image columns always move together because a CHECK constraint
 * requires both or neither.
 *
 * @param {string} id
 * @param {{link?: string|null, imageThumb?: string|null, imageFull?: string|null}} media
 *        Only the keys present are written
 * @param {string} writeToken
 * @returns {Promise<object>} The updated item
 */
export async function setItemMedia(id, media, writeToken) {
  const body = {};
  if ('link' in media) body.link = media.link;
  if ('imageThumb' in media) {
    body.image_thumb = media.imageThumb;
    body.image_full = media.imageFull ?? null;
  }

  if (Object.keys(body).length === 0) {
    throw new BuyListError('沒有要更新的內容');
  }

  const rows = await request(
    `${TABLE}?id=eq.${encodeURIComponent(id)}&select=${COLUMNS}`,
    {
      method: 'PATCH',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        [WRITE_TOKEN_HEADER]: writeToken,
      },
      body: JSON.stringify(body),
    }
  );

  // As with the bought flag, RLS filters a rejected update rather than
  // refusing it, so a stale token comes back as zero rows.
  if (!rows.length) throw new BuyListError('無法更新，請重新解鎖通行碼或重新整理');

  return fromRow(rows[0]);
}

/**
 * Flips the bought flag. This is the only column an update is allowed to touch —
 * a trigger rejects anything else, and there is no delete policy at all.
 *
 * @param {string} id
 * @param {boolean} isBought
 * @param {string} writeToken
 * @returns {Promise<object>} The updated item
 */
export async function setItemBought(id, isBought, writeToken) {
  const rows = await request(
    `${TABLE}?id=eq.${encodeURIComponent(id)}&select=${COLUMNS}`,
    {
      method: 'PATCH',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        [WRITE_TOKEN_HEADER]: writeToken,
      },
      body: JSON.stringify({ is_bought: isBought }),
    }
  );

  // An update the RLS policy rejects is filtered rather than refused, so a
  // stale write token comes back as zero rows rather than a 403.
  if (!rows.length) throw new BuyListError('無法更新，請重新解鎖通行碼或重新整理');

  return fromRow(rows[0]);
}
