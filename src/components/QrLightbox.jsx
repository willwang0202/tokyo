import { Sun } from 'lucide-react';
import Lightbox from './Lightbox.jsx';
import QrCode from './QrCode.jsx';

/**
 * Full-screen view of a single code. Scanners at an immigration desk or park
 * gate need a large, bright, high-contrast target, so this takes over the
 * viewport on a white background.
 */
export default function QrLightbox({ item, groupTitle, onClose }) {
  return (
    <Lightbox label={`${groupTitle} — ${item.label}`} onClose={onClose} className="bg-white">
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
    </Lightbox>
  );
}
