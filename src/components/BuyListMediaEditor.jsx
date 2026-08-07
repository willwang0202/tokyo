import { useState } from 'react';
import { Check, TriangleAlert, X } from 'lucide-react';
import ImagePicker from './ImagePicker.jsx';
import { MAX_LINK_LENGTH } from '../lib/buyListItem.js';

/**
 * Inline editor for the two fields on an existing item that can still change.
 *
 * Only what actually differs is sent, so opening this and saving without
 * touching the photo leaves the stored photo alone. Emptying the link box does
 * clear the link — that is the only way to remove one.
 */
export default function BuyListMediaEditor({ item, isSaving, onSave, onClose }) {
  const [link, setLink] = useState(item.link ?? '');
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSave = async () => {
    const changes = {};
    if (link.trim() !== (item.link ?? '')) changes.link = link;
    if (image) {
      changes.imageThumb = image.thumb;
      changes.imageFull = image.full;
    }

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

  return (
    <div className="px-4 pb-4 pt-1 space-y-2.5">
      <input
        value={link}
        onChange={(event) => {
          setLink(event.target.value);
          setMessage(null);
        }}
        maxLength={MAX_LINK_LENGTH}
        placeholder="貼上商品連結（選填）"
        aria-label="連結"
        inputMode="url"
        className="w-full px-3 py-2 rounded-lg bg-stone-100 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus-visible:ring-2"
      />

      <div className="flex items-center justify-between gap-2">
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="取消"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 bg-stone-100 focus:outline-none focus-visible:ring-2"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="儲存"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2"
            style={{ backgroundColor: '#1C1F26' }}
          >
            <Check size={14} />
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600">
          <TriangleAlert size={13} />
          {message}
        </div>
      )}
    </div>
  );
}
