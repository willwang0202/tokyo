import { useState } from 'react';
import { Lock, ChevronRight } from 'lucide-react';
import QrCode from './QrCode.jsx';
import QrLightbox from './QrLightbox.jsx';
import PassphrasePrompt from './PassphrasePrompt.jsx';
import { VAULT_STATUS } from '../hooks/useVault.js';

const THUMBNAIL_PX = 56;

function VaultGroup({ group, onSelectItem }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: group.accent }} />
        <div className="min-w-0">
          <div className="font-bold text-stone-800 text-sm">{group.title}</div>
          <div className="text-xs text-stone-400 mt-0.5">{group.subtitle}</div>
        </div>
      </div>

      {group.note && <p className="text-xs text-stone-500 leading-relaxed mt-3">{group.note}</p>}

      <div className="mt-4 space-y-2">
        {group.items.map((item) => (
          <button
            key={item.label}
            onClick={() => onSelectItem(item, group.title)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors text-left focus:outline-none focus-visible:ring-2"
          >
            <QrCode
              payload={item.payload}
              label={item.label}
              style={{ width: THUMBNAIL_PX, height: THUMBNAIL_PX, flexShrink: 0, borderRadius: 4 }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-800 truncate">{item.label}</div>
              {item.sub && (
                <div className="text-xs text-stone-400 mt-0.5 truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {item.sub}
                </div>
              )}
            </div>
            <ChevronRight size={16} className="text-stone-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the encrypted travel documents attached to a given day: Visit Japan
 * Web entry codes and the Tokyo Disney park tickets that back up the official
 * app.
 */
export default function DocumentVault({ groups, status, error, onUnlock, onLock }) {
  const [selected, setSelected] = useState(null);

  const handleSelectItem = (item, groupTitle) => setSelected({ item, groupTitle });

  return (
    <div className="px-5 pb-6 space-y-3" style={{ animation: 'fadeUp 0.4s ease-out 120ms both' }}>
      <h3 className="text-xs tracking-widest text-stone-400 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        <Lock size={13} />
        DOCUMENTS・備用證件
      </h3>

      {status === VAULT_STATUS.unlocked ? (
        <>
          {groups.map((group) => (
            <VaultGroup key={group.id} group={group} onSelectItem={handleSelectItem} />
          ))}
          <button
            onClick={onLock}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline decoration-dotted underline-offset-4 focus:outline-none focus-visible:ring-2 rounded"
          >
            重新鎖上
          </button>
        </>
      ) : (
        <PassphrasePrompt
          title="備用證件 QR"
          subtitle="入境 QR・迪士尼門票，需要通行碼"
          status={status}
          error={error}
          onUnlock={onUnlock}
        />
      )}

      {selected && (
        <QrLightbox
          item={selected.item}
          groupTitle={selected.groupTitle}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
