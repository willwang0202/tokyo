import { describe, test, expect } from 'vitest';
import {
  normaliseDraft,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_ADDED_BY_LENGTH,
} from './buyListItem.js';

const AREA_KEYS = ['akiba', 'shibuya'];

const draft = (overrides = {}) => ({
  name: 'RG 獨角獸鋼彈',
  note: '',
  areaKey: '',
  addedBy: '',
  ...overrides,
});

describe('normaliseDraft', () => {
  test('accepts a minimal draft and trims the item name', () => {
    // Arrange
    const input = draft({ name: '  皮卡丘玩偶  ' });

    // Act
    const result = normaliseDraft(input, AREA_KEYS);

    // Assert
    expect(result).toEqual({
      ok: true,
      item: { name: '皮卡丘玩偶', note: null, areaKey: null, addedBy: null },
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
      item: { name, note: null, areaKey: null, addedBy: null },
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

    expect(result.item).toEqual({ name: '藥妝', note: null, areaKey: null, addedBy: null });
  });

  test.each([null, undefined, 'RG 獨角獸鋼彈', 42])('rejects a non-object draft: %s', (input) => {
    expect(normaliseDraft(input, AREA_KEYS)).toEqual({ ok: false, message: '請輸入想買的東西' });
  });
});
