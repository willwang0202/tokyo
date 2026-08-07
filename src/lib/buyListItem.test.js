import { describe, test, expect } from 'vitest';
import {
  normaliseDraft,
  normaliseMedia,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_ADDED_BY_LENGTH,
  MAX_LINK_LENGTH,
} from './buyListItem.js';
import { MAX_FULL_CHARS, MAX_THUMB_CHARS } from './imageCompression.js';

const AREA_KEYS = ['akiba', 'shibuya'];

const THUMB = 'data:image/webp;base64,AAAA';
const FULL = 'data:image/jpeg;base64,BBBB==';

const draft = (overrides = {}) => ({
  name: 'RG 獨角獸鋼彈',
  note: '',
  areaKey: '',
  addedBy: '',
  ...overrides,
});

/** What every field-less draft normalises to, so the tests state it once. */
const NO_MEDIA = { link: null, imageThumb: null, imageFull: null };

describe('normaliseDraft', () => {
  test('accepts a minimal draft and trims the item name', () => {
    // Arrange
    const input = draft({ name: '  皮卡丘玩偶  ' });

    // Act
    const result = normaliseDraft(input, AREA_KEYS);

    // Assert
    expect(result).toEqual({
      ok: true,
      item: { name: '皮卡丘玩偶', note: null, areaKey: null, addedBy: null, ...NO_MEDIA },
    });
  });

  test('keeps the optional fields when they are filled in', () => {
    const result = normaliseDraft(
      draft({ note: ' 本館限定 ', areaKey: 'akiba', addedBy: ' 小明 ' }),
      AREA_KEYS
    );

    expect(result.item).toEqual({
      name: 'RG 獨角獸鋼彈',
      note: '本館限定',
      areaKey: 'akiba',
      addedBy: '小明',
      ...NO_MEDIA,
    });
  });

  test('rejects a blank item name rather than storing an empty row', () => {
    const result = normaliseDraft(draft({ name: '   ' }), AREA_KEYS);

    expect(result.ok).toBe(false);
    expect(result.message).toBe('請輸入想買的東西');
  });

  test('rejects an item name longer than the column allows', () => {
    const result = normaliseDraft(draft({ name: 'あ'.repeat(MAX_NAME_LENGTH + 1) }), AREA_KEYS);

    expect(result.ok).toBe(false);
    expect(result.message).toBe(`品項最多 ${MAX_NAME_LENGTH} 個字`);
  });

  test('accepts an item name exactly at the length limit', () => {
    const name = 'あ'.repeat(MAX_NAME_LENGTH);

    expect(normaliseDraft(draft({ name }), AREA_KEYS)).toEqual({
      ok: true,
      item: { name, note: null, areaKey: null, addedBy: null, ...NO_MEDIA },
    });
  });

  test('rejects a note longer than the column allows', () => {
    const result = normaliseDraft(draft({ note: 'x'.repeat(MAX_NOTE_LENGTH + 1) }), AREA_KEYS);

    expect(result.ok).toBe(false);
    expect(result.message).toBe(`備註最多 ${MAX_NOTE_LENGTH} 個字`);
  });

  test('rejects a name longer than the column allows', () => {
    const result = normaliseDraft(draft({ addedBy: 'x'.repeat(MAX_ADDED_BY_LENGTH + 1) }), AREA_KEYS);

    expect(result.ok).toBe(false);
    expect(result.message).toBe(`名字最多 ${MAX_ADDED_BY_LENGTH} 個字`);
  });

  test('rejects an area that is not one of the trip areas', () => {
    const result = normaliseDraft(draft({ areaKey: 'kyoto' }), AREA_KEYS);

    expect(result.ok).toBe(false);
    expect(result.message).toBe('請選擇行程中的區域');
  });

  test('treats missing optional fields the same as blank ones', () => {
    const result = normaliseDraft({ name: '藥妝' }, AREA_KEYS);

    expect(result.item).toEqual({ name: '藥妝', note: null, areaKey: null, addedBy: null, ...NO_MEDIA });
  });

  test('carries a validated photo and link through to the item', () => {
    const result = normaliseDraft(
      draft({ link: 'amiami.jp/item/1', imageThumb: THUMB, imageFull: FULL }),
      AREA_KEYS
    );

    expect(result.item).toMatchObject({
      link: 'https://amiami.jp/item/1',
      imageThumb: THUMB,
      imageFull: FULL,
    });
  });

  test.each([null, undefined, 'RG 獨角獸鋼彈', 42])('rejects a non-object draft: %s', (input) => {
    expect(normaliseDraft(input, AREA_KEYS)).toEqual({ ok: false, message: '請輸入想買的東西' });
  });
});

describe('normaliseMedia link handling', () => {
  test('assumes https for a bare host, since typing a scheme on a phone is a chore', () => {
    const result = normaliseMedia({ link: 'amiami.jp' });

    expect(result).toEqual({ ok: true, media: { link: 'https://amiami.jp/' } });
  });

  test('leaves an explicit scheme alone', () => {
    expect(normaliseMedia({ link: 'http://example.com/a?b=1' }).media.link).toBe(
      'http://example.com/a?b=1'
    );
  });

  test('keeps a host with a port intact when the scheme is spelled out', () => {
    expect(normaliseMedia({ link: 'https://shop.example.com:8080/x' }).media.link).toBe(
      'https://shop.example.com:8080/x'
    );
  });

  // The price of refusing unknown schemes outright: a bare host:port reads as
  // one. Pasting it with https:// in front works, and product links have no
  // ports anyway.
  test('asks for a scheme when a bare host carries a port', () => {
    const result = normaliseMedia({ link: 'shop.example.com:8080/x' });

    expect(result).toEqual({ ok: false, message: '連結請用 http 或 https 開頭' });
  });

  test('treats a blank link as no link at all', () => {
    expect(normaliseMedia({ link: '   ' })).toEqual({ ok: true, media: { link: null } });
  });

  // The database CHECK is the real gate, but a rejected paste should never
  // reach an <a href> in the first place.
  test.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'javascript://comment%0Aalert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('refuses a non-http(s) URL: %s', (link) => {
    const result = normaliseMedia({ link });

    expect(result.ok).toBe(false);
  });

  test('rejects a link longer than the column allows', () => {
    const result = normaliseMedia({ link: `https://example.com/${'a'.repeat(MAX_LINK_LENGTH)}` });

    expect(result.ok).toBe(false);
    expect(result.message).toBe(`連結最多 ${MAX_LINK_LENGTH} 個字`);
  });
});

describe('normaliseMedia image handling', () => {
  test('accepts a well-formed pair', () => {
    expect(normaliseMedia({ imageThumb: THUMB, imageFull: FULL })).toEqual({
      ok: true,
      media: { imageThumb: THUMB, imageFull: FULL },
    });
  });

  test.each([
    ['thumbnail without a full image', { imageThumb: THUMB }],
    ['full image without a thumbnail', { imageFull: FULL }],
  ])('refuses a half pair — %s', (_label, changes) => {
    const result = normaliseMedia(changes);

    expect(result.ok).toBe(false);
    expect(result.message).toBe('照片處理失敗，請重新選一次');
  });

  test.each([
    ['a text data URL', 'data:text/html;base64,AAAA'],
    ['a png, which the constraint does not allow', 'data:image/png;base64,AAAA'],
    ['a bare URL', 'https://example.com/a.webp'],
    ['something with no base64 payload', 'data:image/webp;base64,'],
  ])('refuses %s', (_label, imageThumb) => {
    expect(normaliseMedia({ imageThumb, imageFull: FULL }).ok).toBe(false);
  });

  test('refuses an image over the column cap', () => {
    const oversized = `data:image/webp;base64,${'A'.repeat(MAX_FULL_CHARS)}`;

    expect(normaliseMedia({ imageThumb: THUMB, imageFull: oversized }).ok).toBe(false);
  });

  test('refuses a thumbnail over its own, much smaller cap', () => {
    const oversized = `data:image/webp;base64,${'A'.repeat(MAX_THUMB_CHARS)}`;

    expect(normaliseMedia({ imageThumb: oversized, imageFull: FULL }).ok).toBe(false);
  });
});

describe('normaliseMedia as a patch', () => {
  // The whole point: attaching a link must not blank out someone else's photo.
  test('returns only the keys it was given', () => {
    expect(normaliseMedia({ link: 'https://example.com/' })).toEqual({
      ok: true,
      media: { link: 'https://example.com/' },
    });
  });

  test('omits the link entirely when only a photo is being attached', () => {
    const result = normaliseMedia({ imageThumb: THUMB, imageFull: FULL });

    expect('link' in result.media).toBe(false);
  });

  test('an explicitly blank link is a removal, not an omission', () => {
    const result = normaliseMedia({ link: '' });

    expect('link' in result.media).toBe(true);
    expect(result.media.link).toBeNull();
  });

  test('an empty patch is valid and changes nothing', () => {
    expect(normaliseMedia({})).toEqual({ ok: true, media: {} });
  });
});
