/**
 * Validation for a buy-list entry on its way into the database.
 *
 * Rows are append-only — nothing can be deleted and only the bought flag can
 * ever change — so a typo or an empty row is permanent. Everything is checked
 * here before it is sent, and again by CHECK constraints in the migration.
 *
 * Lengths are counted in code points rather than `String.length` so a Japanese
 * or Chinese item name is not cut short by surrogate pairs (e.g. emoji).
 */

export const MAX_NAME_LENGTH = 60;
export const MAX_NOTE_LENGTH = 140;
export const MAX_ADDED_BY_LENGTH = 16;

const countCharacters = (text) => [...text].length;

const trimmedOrNull = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed === '' ? null : trimmed;
};

const invalid = (message) => ({ ok: false, message });

/**
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

  return { ok: true, item: { name, note, areaKey, addedBy } };
}
