import { useMemo } from 'react';
import { ShoppingBag, TriangleAlert } from 'lucide-react';
import BuyListForm from './BuyListForm.jsx';
import BuyListRow from './BuyListRow.jsx';
import PassphrasePrompt from './PassphrasePrompt.jsx';
import { useBuyList, BUY_LIST_STATUS } from '../hooks/useBuyList.js';

const HERO_COLOR = '#8C5A2B';

function Section({ title, items, areas, canWrite, onToggle }) {
  if (!items.length) return null;

  return (
    <div>
      <h3 className="text-xs tracking-widest text-stone-400 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <BuyListRow
            key={item.id}
            item={item}
            area={item.areaKey ? areas[item.areaKey] : null}
            canWrite={canWrite}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm text-sm text-stone-500 leading-relaxed">
      {children}
    </div>
  );
}

/**
 * The shared buy list. Everyone sees the same list; adding an item or ticking
 * one off needs the trip passphrase. Items are never removed — bought ones just
 * move to the bottom — so the list doubles as a record of what was picked up.
 */
export default function BuyList({ areas, vault }) {
  const areaKeys = useMemo(() => Object.keys(areas), [areas]);
  const { items, status, error, isSaving, canWrite, addItem, toggleBought } = useBuyList(
    vault.writeToken,
    areaKeys
  );

  const outstanding = items.filter((item) => !item.isBought);
  const bought = items.filter((item) => item.isBought);

  return (
    <div className="pb-24 px-5 pt-4 space-y-5" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
      <div className="rounded-2xl px-6 py-6" style={{ backgroundColor: HERO_COLOR }}>
        <div className="text-white/50 text-xs tracking-widest mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          BUY LIST
        </div>
        <h2 className="text-white text-2xl font-bold">購物清單</h2>
        <p className="text-white/80 text-sm mt-3 leading-relaxed">
          五個人共用一張清單，加進來就會留著。買到了打勾，項目不會消失，回台灣也查得到誰要什麼。
        </p>
        {status === BUY_LIST_STATUS.ready && (
          <div className="text-white/60 text-xs mt-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {outstanding.length} TO BUY · {bought.length} DONE
          </div>
        )}
      </div>

      {status === BUY_LIST_STATUS.unconfigured && (
        <Notice>購物清單還沒接上資料庫，請先設定 Supabase 連線後重新部署。</Notice>
      )}

      {status === BUY_LIST_STATUS.loading && <Notice>載入清單中…</Notice>}

      {status === BUY_LIST_STATUS.error && (
        <div className="rounded-2xl bg-white p-5 shadow-sm flex items-start gap-2 text-sm text-rose-600">
          <TriangleAlert size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {status === BUY_LIST_STATUS.ready && (
        <>
          {canWrite ? (
            <BuyListForm areas={areas} isSaving={isSaving} onAdd={addItem} />
          ) : (
            <PassphrasePrompt
              title="新增購物項目"
              subtitle="用行程通行碼解鎖就能新增、打勾"
              status={vault.status}
              error={vault.error}
              onUnlock={vault.unlock}
            />
          )}

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600">
              <TriangleAlert size={13} />
              {error}
            </div>
          )}

          {items.length === 0 ? (
            <Notice>
              <span className="flex items-center gap-2 text-stone-400">
                <ShoppingBag size={15} />
                清單還是空的，把想買的東西加進來吧。
              </span>
            </Notice>
          ) : (
            <div className="space-y-6">
              <Section
                title="TO BUY・還沒買"
                items={outstanding}
                areas={areas}
                canWrite={canWrite}
                onToggle={toggleBought}
              />
              <Section
                title="DONE・已入手"
                items={bought}
                areas={areas}
                canWrite={canWrite}
                onToggle={toggleBought}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
