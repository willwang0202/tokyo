import { useMemo } from 'react';
import { ShoppingBag, TriangleAlert } from 'lucide-react';
import BuyListForm from './BuyListForm.jsx';
import BuyListRow from './BuyListRow.jsx';
import PassphrasePrompt from './PassphrasePrompt.jsx';
import { useBuyList, BUY_LIST_STATUS } from '../hooks/useBuyList.js';

const HERO_COLOR = '#8C5A2B';

function Section({ title, items, areas, canWrite, isSaving, onToggle, onEdit }) {
  if (!items.length) return null;

  return (
    <div>
      <h3 className="text-xs tracking-widest text-stone-400 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <BuyListRow
            key={item.id}
            item={item}
            area={item.areaKey ? areas[item.areaKey] : null}
            canWrite={canWrite}
            isSaving={isSaving}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm text-sm text-stone-500 leading-relaxed">
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
  const { items, status, error, isSaving, canWrite, addItem, toggleBought, editItem } =
    useBuyList(vault.writeToken, areaKeys);

  const outstanding = items.filter((item) => !item.isBought);
  const bought = items.filter((item) => item.isBought);

  return (
    <div className="pb-24 px-5 pt-3 space-y-3.5" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
      <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: HERO_COLOR }}>
        <div className="text-white/50 text-[11px] tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          BUY LIST
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-white text-xl font-bold">購物清單</h2>
          {status === BUY_LIST_STATUS.ready && (
            <div className="text-white/60 text-[11px] flex-shrink-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {outstanding.length} TO BUY · {bought.length} DONE
            </div>
          )}
        </div>
        <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
          五個人共用一張清單，買到了打勾，項目不會消失。
        </p>
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
            <div className="space-y-4">
              <Section
                title="TO BUY・還沒買"
                items={outstanding}
                areas={areas}
                canWrite={canWrite}
                isSaving={isSaving}
                onToggle={toggleBought}
                onEdit={editItem}
              />
              <Section
                title="DONE・已入手"
                items={bought}
                areas={areas}
                canWrite={canWrite}
                isSaving={isSaving}
                onToggle={toggleBought}
                onEdit={editItem}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
