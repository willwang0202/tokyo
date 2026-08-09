import { useState } from 'react';
import { Check, Trash2, TriangleAlert, X } from 'lucide-react';
import BuyListDeleteConfirm from './BuyListDeleteConfirm.jsx';
import ImagePicker from './ImagePicker.jsx';
import { MAX_LINK_LENGTH, MAX_NAME_LENGTH, MAX_NOTE_LENGTH } from '../lib/buyListItem.js';

const FIELD_CLASS =
  'w-full px-3 py-1.5 rounded-lg bg-stone-100 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus-visible:ring-2';

/** Shown under whichever of the two views is up; they never appear together. */
function Warning({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-rose-600">
      <TriangleAlert size={13} />
      {message}
    </div>
  );
}

/**
 * Inline editor for everything about an item that can still change: what it is,
 * the note, the link and the photo. Which area it belongs to and who asked for
 * it are fixed when the item is added — the database will not accept them here.
 *
 * Only what actually differs is sent, so saving without touching the photo
 * leaves the stored photo alone. Emptying the link box does clear the link;
 * that is the only way to remove one.
 *
 * Removing the item lives here too, behind the bin and a confirmation. Putting
 * it in the row itself would have meant a third icon stacked beside the
 * thumbnail, undoing the vertical tightening the row was just given — and this
 * panel is already where an item is dealt with.
 */
export default function BuyListEditor({ item, isSaving, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState({
    name: item.name,
    note: item.note ?? '',
    link: item.link ?? '',
  });
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const update = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
    setMessage(null);
  };

  /** Compared against the stored value so an untouched field is never sent. */
  const changedFields = () => {
    const changes = {};
    if (draft.name.trim() !== item.name) changes.name = draft.name;
    if (draft.note.trim() !== (item.note ?? '')) changes.note = draft.note;
    if (draft.link.trim() !== (item.link ?? '')) changes.link = draft.link;
    if (image) {
      changes.imageThumb = image.thumb;
      changes.imageFull = image.full;
    }
    return changes;
  };

  const handleSave = async () => {
    const changes = changedFields();
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    const result = await onSave(item, changes);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    const result = await onDelete(item);
    // On success the item leaves the list and this panel unmounts along with
    // its row, so only a refusal has anywhere to go. The confirmation stays up
    // behind the message, keeping both retry and cancel under the same thumb.
    if (!result.ok) setMessage(result.message);
  };

  if (isConfirmingDelete) {
    return (
      <div className="px-3 pb-3 pt-0.5 space-y-1.5">
        <BuyListDeleteConfirm
          name={item.name}
          isSaving={isSaving}
          onCancel={() => {
            setIsConfirmingDelete(false);
            setMessage(null);
          }}
          onConfirm={handleDelete}
        />
        <Warning message={message} />
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-0.5 space-y-1.5">
      <input
        value={draft.name}
        onChange={update('name')}
        maxLength={MAX_NAME_LENGTH}
        placeholder="想買什麼？"
        aria-label="品項"
        className={FIELD_CLASS}
      />

      <input
        value={draft.note}
        onChange={update('note')}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="備註（選填）"
        aria-label="備註"
        className={FIELD_CLASS}
      />

      <input
        value={draft.link}
        onChange={update('link')}
        maxLength={MAX_LINK_LENGTH}
        placeholder="商品連結（選填）"
        aria-label="連結"
        inputMode="url"
        className={FIELD_CLASS}
      />

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1.5">
          <ImagePicker
            image={image}
            onChange={(picked) => {
              setImage(picked);
              setMessage(null);
            }}
            onError={setMessage}
            label={item.imageThumb ? '換照片' : '加照片'}
            disabled={isSaving}
          />

          {/* Sits with the photo controls rather than beside Save, so the two
              destructive-if-mistaken taps are at opposite ends of the row. */}
          <button
            type="button"
            onClick={() => {
              setIsConfirmingDelete(true);
              setMessage(null);
            }}
            aria-label={`移除 ${item.name}`}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 bg-rose-50 focus:outline-none focus-visible:ring-2"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="取消"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 bg-stone-100 focus:outline-none focus-visible:ring-2"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="儲存"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2"
            style={{ backgroundColor: '#1C1F26' }}
          >
            <Check size={13} />
          </button>
        </div>
      </div>

      <Warning message={message} />
    </div>
  );
}
