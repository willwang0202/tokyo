import { TriangleAlert } from 'lucide-react';

/**
 * The step between tapping the bin and an item leaving the list.
 *
 * Rendered *in place of* the editor's fields rather than beside them, so the
 * destructive button is never one mis-tap away from Save — the two never share
 * a screen. Cancel sits closest to where the bin was, which is where a thumb
 * already is.
 *
 * The wording avoids promising the item is gone forever, because it is not:
 * removal raises a flag and the row stays in the database. It also avoids
 * mentioning that, since "we still have it" reads as an invitation to undo and
 * there is no undo here.
 *
 * @param {string} name Item name, quoted back so a mis-tap is obvious
 * @param {boolean} isSaving
 * @param {() => void} onCancel
 * @param {() => void} onConfirm
 */
export default function BuyListDeleteConfirm({ name, isSaving, onCancel, onConfirm }) {
  const buttonClass =
    'px-3 py-1.5 rounded-lg text-xs transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2';

  return (
    <div className="space-y-2 pt-0.5">
      <p className="flex items-start gap-1.5 text-xs text-stone-600 leading-snug">
        <TriangleAlert size={13} className="flex-shrink-0 mt-0.5 text-rose-500" />
        <span>
          要把「<span className="font-semibold text-stone-800">{name}</span>」從清單移除嗎？
        </span>
      </p>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className={`${buttonClass} text-stone-600 bg-stone-100`}
        >
          取消
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSaving}
          className={`${buttonClass} text-white bg-rose-600`}
        >
          移除
        </button>
      </div>
    </div>
  );
}
