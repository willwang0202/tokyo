import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import Lightbox from './Lightbox.jsx';
import { fetchItemImage, BuyListError } from '../lib/buyListApi.js';

/**
 * The full-size photo for one item.
 *
 * `image_full` is deliberately left out of the list read (see COLUMNS in
 * buyListApi), so opening a photo costs one request of its own. The thumbnail
 * we already have is stretched underneath while that lands, which reads as the
 * photo sharpening rather than as a blank wait.
 */
export default function BuyListPhotoLightbox({ item, onClose }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let isCurrent = true;

    fetchItemImage(item.id)
      .then((image) => {
        if (!isCurrent) return;
        setState(
          image ? { status: 'ready', image } : { status: 'error', message: '找不到這張照片' }
        );
      })
      .catch((cause) => {
        if (!isCurrent) return;
        if (!(cause instanceof BuyListError)) console.error('Buy list photo fetch failed', cause);
        setState({
          status: 'error',
          message: cause instanceof BuyListError ? cause.message : '載入照片失敗，請稍後再試',
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [item.id]);

  return (
    <Lightbox label={`${item.name} 的照片`} onClose={onClose} className="bg-stone-900/95">
      {state.status === 'error' ? (
        <div className="flex items-center gap-2 text-sm text-rose-300">
          <TriangleAlert size={15} />
          {state.message}
        </div>
      ) : (
        <img
          src={state.status === 'ready' ? state.image : item.imageThumb}
          alt={item.name}
          className="max-w-full rounded-xl transition-[filter] duration-300"
          style={{
            maxHeight: '78vh',
            objectFit: 'contain',
            filter: state.status === 'ready' ? 'none' : 'blur(12px)',
          }}
        />
      )}

      <div className="mt-5 text-sm text-white/90 text-center font-medium">{item.name}</div>
      {item.note && <div className="mt-1 text-xs text-white/50 text-center">{item.note}</div>}
    </Lightbox>
  );
}
