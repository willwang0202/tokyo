import { useRef, useState } from 'react';
import { Camera, LoaderCircle, X } from 'lucide-react';
import { compressImage, ImageCompressionError } from '../lib/imageCompression.js';

/**
 * Picks a photo and compresses it before it goes anywhere near the network.
 *
 * The parent never sees the original file — only the `{thumb, full}` pair that
 * comes back, or null once cleared. Compression runs on the main thread and a
 * large photo takes a moment, hence the busy state.
 *
 * @param {{thumb: string, full: string}|null} image Current selection
 * @param {(image: object|null) => void} onChange
 * @param {(message: string|null) => void} onError User-facing zh-TW copy
 */
export default function ImagePicker({ image, onChange, onError, label = '加照片', disabled }) {
  const inputRef = useRef(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    // Clearing the input lets the same photo be picked again after a removal.
    event.target.value = '';
    if (!file) return;

    setIsCompressing(true);
    onError(null);

    try {
      onChange(await compressImage(file));
    } catch (cause) {
      onChange(null);
      if (cause instanceof ImageCompressionError) {
        onError(cause.message);
      } else {
        console.error('Image compression failed', cause);
        onError('照片處理失敗，請再試一次');
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const controlClass =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-stone-600 bg-stone-100 transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2';

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      {image ? (
        <>
          <img
            src={image.thumb}
            alt="已選擇的照片"
            className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
          />
          <button type="button" onClick={() => onChange(null)} className={controlClass}>
            <X size={13} />
            移除
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isCompressing}
          className={controlClass}
        >
          {isCompressing ? (
            <LoaderCircle size={13} className="animate-spin" />
          ) : (
            <Camera size={13} />
          )}
          {isCompressing ? '壓縮中…' : label}
        </button>
      )}
    </div>
  );
}
