import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sun } from 'lucide-react';
import QrCode from './QrCode.jsx';

/**
 * Full-screen view of a single code. Scanners at an immigration desk or park
 * gate need a large, bright, high-contrast target, so this takes over the
 * viewport on a white background.
 */
export default function QrLightbox({ item, groupTitle, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Portalled to <body>: the animated ancestors carry a transform, which would
  // otherwise make this fixed element position against the card, not the viewport.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${groupTitle} — ${item.label}`}
      onClick={onClose}
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center px-6 py-8 bg-white"
      style={{ animation: 'fadeUp 0.2s ease-out both' }}
    >
      <button
        onClick={onClose}
        aria-label="關閉"
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors focus:outline-none focus-visible:ring-2"
      >
        <X size={20} />
      </button>

      <div className="text-xs tracking-widest text-stone-400 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {groupTitle}
      </div>
      <div className="text-lg font-bold text-stone-900 mb-5 text-center">{item.label}</div>

      <QrCode
        payload={item.payload}
        label={item.label}
        className="w-full"
        style={{ maxWidth: 'min(88vw, 420px)', height: 'auto' }}
      />

      {item.sub && (
        <div className="mt-5 text-sm text-stone-600 tracking-wide text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {item.sub}
        </div>
      )}

      <div className="mt-6 flex items-center gap-1.5 text-xs text-stone-400">
        <Sun size={13} />
        掃描前請把螢幕亮度調到最亮
      </div>
    </div>,
    document.body
  );
}
