import { useMemo } from 'react';
import QRCode from 'qrcode';

const QUIET_ZONE_MODULES = 4; // ISO/IEC 18004 requires a 4-module light border
const ERROR_CORRECTION = 'M';

/**
 * Renders a QR code as crisp vector output so it stays scannable at any size,
 * from the inline thumbnail up to the full-screen view held at a gate.
 */
export default function QrCode({ payload, label, className, style }) {
  const { viewBox, path } = useMemo(() => {
    const { modules } = QRCode.create(payload, { errorCorrectionLevel: ERROR_CORRECTION });
    const { size, data } = modules;

    let d = '';
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (data[y * size + x]) {
          d += `M${x + QUIET_ZONE_MODULES} ${y + QUIET_ZONE_MODULES}h1v1h-1z`;
        }
      }
    }

    const total = size + QUIET_ZONE_MODULES * 2;
    return { viewBox: `0 0 ${total} ${total}`, path: d };
  }, [payload]);

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label ? `${label} QR code` : 'QR code'}
      shapeRendering="crispEdges"
      className={className}
      style={style}
    >
      <rect width="100%" height="100%" fill="#FFFFFF" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
