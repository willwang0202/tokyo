import { useState } from 'react';
import { Check, Link2, Pencil } from 'lucide-react';
import BuyListEditor from './BuyListEditor.jsx';
import BuyListPhotoLightbox from './BuyListPhotoLightbox.jsx';

/**
 * One item on the list. Ticking it sets the bought flag — the row itself stays
 * forever, it just drops to the bottom of the list.
 *
 * The card is a plain div rather than one big button, because a photo, a link
 * and an edit control all need to be tappable and nesting those inside a button
 * is invalid markup that screen readers mangle. The toggle is still the large
 * target it always was; the extras sit beside it as siblings.
 *
 * Those extras are laid out as a thumbnail with a narrow column of icons beside
 * it rather than one tall stack, so a row with a photo is about the height of
 * the photo instead of nearly three times it.
 */
export default function BuyListRow({ item, area, canWrite, isSaving, onToggle, onEdit }) {
  const { name, note, addedBy, isBought, link, imageThumb } = item;
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const iconClass =
    'w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 bg-stone-50 hover:bg-stone-100 transition-colors focus:outline-none focus-visible:ring-2';

  return (
    <div
      className="rounded-xl bg-white shadow-sm transition-all duration-200 hover:shadow-md"
      style={{
        borderLeft: area ? `3px solid ${area.color}` : undefined,
        opacity: isBought ? 0.55 : 1,
      }}
    >
      <div className="flex items-center">
        <button
          onClick={() => onToggle(item)}
          disabled={!canWrite}
          aria-pressed={isBought}
          aria-label={`${name}${isBought ? '，已購買' : ''}`}
          className="flex-1 min-w-0 flex items-start gap-2.5 px-3 py-2.5 text-left disabled:cursor-default focus:outline-none focus-visible:ring-2 rounded-xl"
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-px transition-colors duration-200"
            style={{
              backgroundColor: isBought ? '#1C1F26' : 'transparent',
              border: isBought ? 'none' : '1.5px solid #D6D3D1',
            }}
          >
            {isBought && <Check size={12} color="#FFFFFF" />}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className="block text-sm font-semibold text-stone-800 leading-snug"
              style={{ textDecoration: isBought ? 'line-through' : undefined }}
            >
              {name}
            </span>

            {note && <span className="block text-xs text-stone-500 mt-0.5 leading-snug">{note}</span>}

            {(area || addedBy) && (
              <span className="flex items-center gap-1 flex-wrap mt-1">
                {area && (
                  <span
                    className="text-[11px] leading-4 px-1.5 rounded-full"
                    style={{ backgroundColor: area.tint, color: area.color }}
                  >
                    {area.short}
                  </span>
                )}
                {addedBy && <span className="text-[11px] leading-4 text-stone-400">{addedBy}</span>}
              </span>
            )}
          </span>
        </button>

        <div className="flex items-center gap-1.5 py-2 pr-2.5 pl-1 flex-shrink-0">
          {imageThumb && (
            <button
              onClick={() => setIsPhotoOpen(true)}
              aria-label={`看 ${name} 的照片`}
              className="focus:outline-none focus-visible:ring-2 rounded-lg"
            >
              <img
                src={imageThumb}
                alt=""
                className="w-11 h-11 rounded-lg object-cover bg-stone-100"
              />
            </button>
          )}

          {(link || canWrite) && (
            <div className="flex flex-col gap-1">
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`打開 ${name} 的連結`}
                  className={iconClass}
                >
                  <Link2 size={13} />
                </a>
              )}

              {canWrite && (
                <button
                  onClick={() => setIsEditing((open) => !open)}
                  aria-label={`編輯 ${name}`}
                  aria-expanded={isEditing}
                  className={iconClass}
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <BuyListEditor
          item={item}
          isSaving={isSaving}
          onSave={onEdit}
          onClose={() => setIsEditing(false)}
        />
      )}

      {isPhotoOpen && (
        <BuyListPhotoLightbox item={item} onClose={() => setIsPhotoOpen(false)} />
      )}
    </div>
  );
}
