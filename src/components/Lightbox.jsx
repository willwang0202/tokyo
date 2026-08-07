import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Full-screen overlay, shared by the QR view and the buy-list photo view.
 *
 * Portalled to <body>: the animated ancestors carry a transform, which would
 * otherwise make this fixed element position against the card rather than the
 * viewport.
 *
 * @param {string} label Announced to screen readers as the dialog's name
 * @param {string} [className] Backdrop styling — white for a scanner, dark for a photo
 */
export default function Lightbox({ label, onClose, className = '', children }) {
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center px-6 py-8 ${className}`}
      style={{ animation: 'fadeUp 0.2s ease-out both' }}
    >
      <button
        onClick={onClose}
        aria-label="關閉"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors focus:outline-none focus-visible:ring-2"
      >
        <X size={20} />
      </button>

      {children}
    </div>,
    document.body
  );
}
