import { describe, test, expect, vi, afterEach } from 'vitest';

/**
 * The module reads its Supabase credentials once at import time, so each test
 * loads a fresh copy with the environment already stubbed.
 */
const loadApi = async () => {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_test');
  return import('./buyListApi.js');
};

const respondWith = (rows, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => rows,
    text: async () => JSON.stringify(rows),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const ROW = {
  id: 'abc',
  name: '皮卡丘玩偶',
  note: null,
  area_key: 'akiba',
  added_by: '小明',
  is_bought: false,
  created_at: '2026-08-19T09:00:00Z',
  link: 'https://example.com/',
  image_thumb: 'data:image/webp;base64,AAAA',
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('COLUMNS', () => {
  test('never selects image_full', async () => {
    // Arrange
    const { COLUMNS } = await loadApi();

    // Act + Assert
    //
    // image_full is up to 400 KB per row and the list is re-read on every
    // visibilitychange — i.e. every time a phone unlocks in Tokyo. Adding it
    // here would quietly put megabytes on roaming data.
    expect(COLUMNS).not.toContain('image_full');
  });

  test('does select the thumbnail and the link, which the rows render inline', async () => {
    const { COLUMNS } = await loadApi();

    expect(COLUMNS).toContain('image_thumb');
    expect(COLUMNS).toContain('link');
  });
});

describe('fromRow', () => {
  test('maps snake_case columns onto the shape the components use', async () => {
    const { fromRow } = await loadApi();

    expect(fromRow(ROW)).toEqual({
      id: 'abc',
      name: '皮卡丘玩偶',
      note: null,
      areaKey: 'akiba',
      addedBy: '小明',
      isBought: false,
      createdAt: '2026-08-19T09:00:00Z',
      link: 'https://example.com/',
      imageThumb: 'data:image/webp;base64,AAAA',
    });
  });

  test('normalises absent media to null rather than undefined', async () => {
    const { fromRow } = await loadApi();
    const bare = { ...ROW, link: undefined, image_thumb: undefined };

    expect(fromRow(bare)).toMatchObject({ link: null, imageThumb: null });
  });
});

describe('updateItem', () => {
  test('writes corrected wording under the column names Postgres uses', async () => {
    const { updateItem } = await loadApi();
    const fetchMock = respondWith([ROW]);

    await updateItem('abc', { name: '皮卡丘玩偶', note: '兩個' }, 'a-write-token');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: '皮卡丘玩偶',
      note: '兩個',
    });
  });

  // area_key and added_by have no UPDATE grant; sending them would make
  // Postgres reject the whole PATCH, taking the valid changes down with it.
  test.each(['areaKey', 'addedBy'])('never sends %s, which has no UPDATE grant', async (field) => {
    const { updateItem } = await loadApi();
    const fetchMock = respondWith([ROW]);

    await updateItem('abc', { name: '藥妝', [field]: 'shibuya' }, 'a-write-token');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: '藥妝' });
  });

  test('sends only the keys being changed, so a link never blanks a photo', async () => {
    // Arrange
    const { updateItem } = await loadApi();
    const fetchMock = respondWith([ROW]);

    // Act
    await updateItem('abc', { link: 'https://example.com/' }, 'a-write-token');

    // Assert
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ link: 'https://example.com/' });
  });

  test('moves both image columns together, because a CHECK requires the pair', async () => {
    const { updateItem } = await loadApi();
    const fetchMock = respondWith([ROW]);

    await updateItem(
      'abc',
      { imageThumb: 'data:image/webp;base64,AAAA', imageFull: 'data:image/jpeg;base64,BBBB' },
      'a-write-token'
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      image_thumb: 'data:image/webp;base64,AAAA',
      image_full: 'data:image/jpeg;base64,BBBB',
    });
  });

  test('carries the write token in the header the RLS policy reads', async () => {
    const { updateItem } = await loadApi();
    const fetchMock = respondWith([ROW]);

    await updateItem('abc', { link: 'https://example.com/' }, 'a-write-token');

    expect(fetchMock.mock.calls[0][1].headers['x-buy-list-token']).toBe('a-write-token');
  });

  test('refuses a patch with nothing in it instead of sending an empty PATCH', async () => {
    const { updateItem } = await loadApi();
    const fetchMock = respondWith([ROW]);

    await expect(updateItem('abc', {}, 'a-write-token')).rejects.toThrow('沒有要更新的內容');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('reads zero returned rows as a stale token, since RLS filters rather than refuses', async () => {
    const { updateItem } = await loadApi();
    respondWith([]);

    await expect(updateItem('abc', { link: 'https://example.com/' }, 'stale')).rejects.toThrow(
      '無法更新，請重新解鎖通行碼或重新整理'
    );
  });
});

describe('fetchItemImage', () => {
  test('asks for the one big column the list read leaves out', async () => {
    const { fetchItemImage } = await loadApi();
    const fetchMock = respondWith([{ image_full: 'data:image/jpeg;base64,BBBB' }]);

    const image = await fetchItemImage('abc');

    expect(fetchMock.mock.calls[0][0]).toContain('select=image_full');
    expect(image).toBe('data:image/jpeg;base64,BBBB');
  });

  test('returns null for an item that has no photo', async () => {
    const { fetchItemImage } = await loadApi();
    respondWith([]);

    expect(await fetchItemImage('abc')).toBeNull();
  });
});
