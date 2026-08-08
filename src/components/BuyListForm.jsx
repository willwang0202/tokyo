import { useState } from 'react';
import { Plus, TriangleAlert } from 'lucide-react';
import ImagePicker from './ImagePicker.jsx';
import {
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_ADDED_BY_LENGTH,
  MAX_LINK_LENGTH,
} from '../lib/buyListItem.js';

const NAME_KEY = 'tokyo.buyList.addedBy';

const readRememberedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    // Private mode or blocked storage — just start with an empty name.
    return '';
  }
};

const rememberName = (addedBy) => {
  try {
    localStorage.setItem(NAME_KEY, addedBy);
  } catch {
    // Remembering the name is a convenience; never block the add on it.
  }
};

const emptyDraft = () => ({
  name: '',
  note: '',
  link: '',
  areaKey: '',
  addedBy: readRememberedName(),
});

// Width is left to each field. Baking `w-full` in here would win over the
// `w-24` on the row below — Tailwind resolves that by stylesheet order, not by
// the order the classes are written — and collapse the area dropdown.
const FIELD_CLASS =
  'px-3.5 py-2 rounded-xl bg-stone-100 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus-visible:ring-2';

const WIDE_FIELD_CLASS = `${FIELD_CLASS} w-full`;

/**
 * Adds an item to the shared list. The area and who asked for it are fixed for
 * good once submitted — unlike the name, note, link and photo, which the row's
 * own edit button can correct later — so the draft is validated before it goes.
 */
export default function BuyListForm({ areas, isSaving, onAdd }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState(null);

  const update = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await onAdd({
      ...draft,
      ...(image ? { imageThumb: image.thumb, imageFull: image.full } : {}),
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    rememberName(draft.addedBy.trim());
    // Keep the area and the name filled in: adding several things from one shop
    // in a row is the common case.
    setDraft((current) => ({ ...current, name: '', note: '', link: '' }));
    setImage(null);
    setMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
      <input
        value={draft.name}
        onChange={update('name')}
        maxLength={MAX_NAME_LENGTH}
        placeholder="想買什麼？例如 RG 獨角獸鋼彈"
        aria-label="品項"
        className={WIDE_FIELD_CLASS}
      />

      <input
        value={draft.note}
        onChange={update('note')}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="備註（選填）例如 本館限定、兩個"
        aria-label="備註"
        className={WIDE_FIELD_CLASS}
      />

      <input
        value={draft.link}
        onChange={update('link')}
        maxLength={MAX_LINK_LENGTH}
        placeholder="商品連結（選填）"
        aria-label="連結"
        inputMode="url"
        className={WIDE_FIELD_CLASS}
      />

      <div className="flex gap-2">
        <select
          value={draft.areaKey}
          onChange={update('areaKey')}
          aria-label="區域"
          className={`${FIELD_CLASS} flex-1 min-w-0`}
        >
          <option value="">哪一區（選填）</option>
          {Object.values(areas).map((area) => (
            <option key={area.key} value={area.key}>{area.name}</option>
          ))}
        </select>

        <input
          value={draft.addedBy}
          onChange={update('addedBy')}
          maxLength={MAX_ADDED_BY_LENGTH}
          placeholder="誰要買"
          aria-label="誰要買"
          className={`${FIELD_CLASS} w-24 flex-shrink-0`}
        />
      </div>

      {/* The photo control and the submit share a row: both are one-tap, and it
          keeps the whole form inside a phone screen alongside the list. */}
      <div className="flex items-center gap-2">
        <ImagePicker image={image} onChange={setImage} onError={setMessage} disabled={isSaving} />

        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2"
          style={{ backgroundColor: '#1C1F26' }}
        >
          <Plus size={15} />
          {isSaving ? '新增中…' : '加入清單'}
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-1.5 pt-0.5 text-xs text-rose-600">
          <TriangleAlert size={13} />
          {message}
        </div>
      )}
    </form>
  );
}
