import { useState } from 'react';
import { Check, ImagePlus, Link2, Pencil } from 'lucide-react';
import BuyListMediaEditor from './BuyListMediaEditor.jsx';
import BuyListPhotoLightbox from './BuyListPhotoLightbox.jsx';

/**
 * One item on the list. Ticking it sets the bought flag — the row itself stays
 * forever, it just drops to the bottom of the list.
 *
 * The card is a plain div rather than one big button, because a photo, a link
 * and an edit control all need to be tappable and nesting those inside a button
 * is invalid markup that screen readers mangle. The toggle is still the large
 * target it always was; the extras sit beside it as siblings.
 */
export default function BuyListRow({ item, area, canWrite, isSaving, onToggle, onAttachMedia }) {
  const { name, note, addedBy, isBought, link, imageThumb } = item;
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const iconClass =
    'w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 bg-stone-50 hover:bg-stone-100 transition-colors focus:outline-none focus-visible:ring-2';

  return (
    <div
      className="rounded-xl bg-white shadow-sm transition-all duration-200 hover:shadow-md"
      style={{
        borderLeft: area ? `3px solid ${area.color}` : undefined,
        opacity: isBought ? 0.55 : 1,
      }}
    >
      <div className="flex items-start">
        <button
          onClick={() => onToggle(item)}
          disabled={!canWrite}
          aria-pressed={isBought}
          aria-label={`${name}${isBought ? '，已購買' : ''}`}
          className="flex-1 min-w-0 flex items-start gap-3 p-4 text-left disabled:cursor-default focus:outline-none focus-visible:ring-2 rounded-xl"
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-200"
            style={{
              backgroundColor: isBought ? '#1C1F26' : 'transparent',
              border: isBought ? 'none' : '1.5px solid #D6D3D1',
            }}
          >
            {isBought && <Check size={12} color="#FFFFFF" />}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className="block text-sm font-semibold text-stone-800"
              style={{ textDecoration: isBought ? 'line-through' : undefined }}
            >
              {name}
            </span>

            {note && <span className="block text-xs text-stone-500 mt-1 leading-relaxed">{note}</span>}

            {(area || addedBy) && (
              <span className="flex items-center gap-1.5 flex-wrap mt-2">
                {area && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: area.tint, color: area.color }}
                  >
                    {area.short}
                  </span>
                )}
                {addedBy && <span className="text-[11px] text-stone-400">{addedBy}</span>}
              </span>
            )}
          </span>
        </button>

        <div className="flex flex-col items-center gap-1.5 py-4 pr-4 pl-1 flex-shrink-0">
          {imageThumb && (
            <button
              onClick={() => setIsPhotoOpen(true)}
              aria-label={`看 ${name} 的照片`}
              className="focus:outline-none focus-visible:ring-2 rounded-lg"
            >
              <img
                src={imageThumb}
                alt=""
                className="w-12 h-12 rounded-lg object-cover bg-stone-100"
              />
            </button>
          )}

          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`打開 ${name} 的連結`}
              className={iconClass}
            >
              <Link2 size={14} />
            </a>
          )}

          {canWrite && (
            <button
              onClick={() => setIsEditing((open) => !open)}
              aria-label={`編輯 ${name} 的照片和連結`}
              aria-expanded={isEditing}
              className={iconClass}
            >
              {imageThumb || link ? <Pencil size={14} /> : <ImagePlus size={14} />}
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <BuyListMediaEditor
          item={item}
          isSaving={isSaving}
          onSave={onAttachMedia}
          onClose={() => setIsEditing(false)}
        />
      )}

      {isPhotoOpen && (
        <BuyListPhotoLightbox item={item} onClose={() => setIsPhotoOpen(false)} />
      )}
    </div>
  );
}
