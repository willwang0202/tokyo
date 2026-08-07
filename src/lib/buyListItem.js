/**
 * Validation for a buy-list entry on its way into the database.
 *
 * Rows are append-only — nothing can be deleted, and of the original fields
 * only the bought flag can ever change — so a typo or an empty row is
 * permanent. Everything is checked here before it is sent, and again by CHECK
 * constraints in the migrations.
 *
 * A photo and a link are the exception: both can be attached to an item that is
 * already on the list, and both can be replaced. `normaliseMedia` is the path
 * for that, and it deliberately does not require a name.
 *
 * Lengths are counted in code points rather than `String.length` so a Japanese
 * or Chinese item name is not cut short by surrogate pairs (e.g. emoji).
 */

import {
  IMAGE_DATA_URL_PATTERN,
  MAX_FULL_CHARS,
  MAX_THUMB_CHARS,
} from './imageCompression.js';

export const MAX_NAME_LENGTH = 60;
export const MAX_NOTE_LENGTH = 140;
export const MAX_ADDED_BY_LENGTH = 16;
export const MAX_LINK_LENGTH = 500;

const HTTP_SCHEME_PATTERN = /^https?:\/\//i;

const countCharacters = (text) => [...text].length;

const trimmedOrNull = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed === '' ? null : trimmed;
};

const invalid = (message) => ({ ok: false, message });

/**
 * Parses a pasted URL, assuming https only when no scheme was given at all.
 *
 * A scheme we do not accept is refused outright rather than repaired. Blindly
 * prefixing would turn `file:///etc/passwd` into the perfectly valid but
 * meaningless `https://file//etc/passwd` and store it forever, which is worse
 * than saying no — `javascript:` and `data:` payloads survive the same way.
 *
 * The cost is that a bare `shop.example.com:8080` reads as a scheme and is
 * rejected; pasting it with `https://` in front works. Consumer product links
 * do not carry ports, so that trade is worth the clarity.
 *
 * Storing `href` normalises and percent-encodes, so what reaches the database
 * always satisfies the `^https?://[^[:space:]]+$` constraint.
 */
const linkFrom = (value) => {
  const trimmed = trimmedOrNull(value);
  if (!trimmed) return { ok: true, link: null };

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !HTTP_SCHEME_PATTERN.test(trimmed)) {
    return invalid('連結請用 http 或 https 開頭');
  }

  // Typing a scheme on a phone keyboard is a chore, and a bare host is what you
  // get copying a shop out of a message.
  let url;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return invalid('連結格式不正確');
  }

  if (countCharacters(url.href) > MAX_LINK_LENGTH) {
    return invalid(`連結最多 ${MAX_LINK_LENGTH} 個字`);
  }

  return { ok: true, link: url.href };
};

/**
 * Both images or neither, each already compressed by `compressImage`. Anything
 * else means the picker was bypassed or something went wrong mid-compression,
 * and the database would reject it anyway.
 */
const imagesFrom = (draft) => {
  const thumb = trimmedOrNull(draft.imageThumb);
  const full = trimmedOrNull(draft.imageFull);

  if (!thumb && !full) return { ok: true, imageThumb: null, imageFull: null };
  if (!thumb || !full) return invalid('照片處理失敗，請重新選一次');

  if (thumb.length > MAX_THUMB_CHARS || full.length > MAX_FULL_CHARS) {
    return invalid('照片處理失敗，請重新選一次');
  }
  if (!IMAGE_DATA_URL_PATTERN.test(thumb) || !IMAGE_DATA_URL_PATTERN.test(full)) {
    return invalid('照片處理失敗，請重新選一次');
  }

  return { ok: true, imageThumb: thumb, imageFull: full };
};

/**
 * The photo and link half of an item, on its own.
 *
 * Only the keys actually present on `draft` come back, because this doubles as
 * a patch for an item already on the list: adding a link must not blank out a
 * photo someone else attached. The two image keys always travel together.
 *
 * @param {unknown} draft Any of `{link, imageThumb, imageFull}`
 * @returns {{ok: true, media: object} | {ok: false, message: string}}
 *          `message` is user-facing zh-TW copy, safe to render as-is
 */
export function normaliseMedia(draft) {
  if (typeof draft !== 'object' || draft === null) return invalid('照片處理失敗，請重新選一次');

  const media = {};

  if ('link' in draft) {
    const link = linkFrom(draft.link);
    if (!link.ok) return link;
    media.link = link.link;
  }

  if ('imageThumb' in draft || 'imageFull' in draft) {
    const images = imagesFrom(draft);
    if (!images.ok) return images;
    media.imageThumb = images.imageThumb;
    media.imageFull = images.imageFull;
  }

  return { ok: true, media };
}

/**
 * A whole new item.
 *
 * @param {unknown} draft Raw form values
 * @param {string[]} areaKeys Area keys the trip actually covers
 * @returns {{ok: true, item: object} | {ok: false, message: string}}
 *          `message` is user-facing zh-TW copy, safe to render as-is
 */
export function normaliseDraft(draft, areaKeys) {
  if (typeof draft !== 'object' || draft === null) return invalid('請輸入想買的東西');

  const name = trimmedOrNull(draft.name);
  if (!name) return invalid('請輸入想買的東西');
  if (countCharacters(name) > MAX_NAME_LENGTH) return invalid(`品項最多 ${MAX_NAME_LENGTH} 個字`);

  const note = trimmedOrNull(draft.note);
  if (note && countCharacters(note) > MAX_NOTE_LENGTH) {
    return invalid(`備註最多 ${MAX_NOTE_LENGTH} 個字`);
  }

  const addedBy = trimmedOrNull(draft.addedBy);
  if (addedBy && countCharacters(addedBy) > MAX_ADDED_BY_LENGTH) {
    return invalid(`名字最多 ${MAX_ADDED_BY_LENGTH} 個字`);
  }

  const areaKey = trimmedOrNull(draft.areaKey);
  if (areaKey && !areaKeys.includes(areaKey)) return invalid('請選擇行程中的區域');

  const media = normaliseMedia(draft);
  if (!media.ok) return media;

  // A new row states every column, so absent media is an explicit null.
  return {
    ok: true,
    item: {
      name,
      note,
      areaKey,
      addedBy,
      link: media.media.link ?? null,
      imageThumb: media.media.imageThumb ?? null,
      imageFull: media.media.imageFull ?? null,
    },
  };
}
