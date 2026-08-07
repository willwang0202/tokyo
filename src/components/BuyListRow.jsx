import { Check } from 'lucide-react';

/**
 * One item on the list. Ticking it sets the bought flag — the row itself stays
 * forever, it just drops to the bottom of the list.
 */
export default function BuyListRow({ item, area, canWrite, onToggle }) {
  const { name, note, addedBy, isBought } = item;

  return (
    <button
      onClick={() => onToggle(item)}
      disabled={!canWrite}
      aria-pressed={isBought}
      aria-label={`${name}${isBought ? '，已購買' : ''}`}
      className="w-full flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm text-left transition-all duration-200 enabled:hover:shadow-md disabled:cursor-default focus:outline-none focus-visible:ring-2"
      style={{
        borderLeft: area ? `3px solid ${area.color}` : undefined,
        opacity: isBought ? 0.55 : 1,
      }}
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
  );
}
