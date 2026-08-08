import { useCallback, useEffect, useState } from 'react';
import {
  fetchItems,
  insertItem,
  setItemBought,
  updateItem,
  isBuyListConfigured,
  BuyListError,
} from '../lib/buyListApi.js';
import { normaliseDraft, normaliseEdit } from '../lib/buyListItem.js';

export const BUY_LIST_STATUS = {
  unconfigured: 'unconfigured',
  loading: 'loading',
  ready: 'ready',
  error: 'error',
};

/** Outstanding items first, then oldest first, matching the server's ordering. */
const byOutstandingThenAge = (a, b) =>
  Number(a.isBought) - Number(b.isBought) || a.createdAt.localeCompare(b.createdAt);

const sorted = (items) => [...items].sort(byOutstandingThenAge);

/** Swaps one item for an updated copy, keeping the list ordered. */
const replaceItem = (replacement) => (current) =>
  sorted(current.map((each) => (each.id === replacement.id ? replacement : each)));

const messageFor = (cause, fallback) => {
  if (cause instanceof BuyListError) return cause.message;
  console.error(fallback, cause);
  return '購物清單發生問題，請稍後再試';
};

/**
 * The shared buy list. Reading is open to anyone; adding an item and marking it
 * bought both need the write token that `useVault` hands out after an unlock.
 *
 * Five people share this list, so it is re-read whenever the tab comes back to
 * the foreground rather than trusting whatever was fetched on mount.
 *
 * @param {string|null} writeToken
 * @param {string[]} areaKeys Area keys an item may be filed under
 */
export function useBuyList(writeToken, areaKeys) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState(
    isBuyListConfigured ? BUY_LIST_STATUS.loading : BUY_LIST_STATUS.unconfigured
  );
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!isBuyListConfigured) return;

    try {
      setItems(sorted(await fetchItems()));
      setError(null);
      setStatus(BUY_LIST_STATUS.ready);
    } catch (cause) {
      setError(messageFor(cause, 'Buy list refresh failed'));
      setStatus(BUY_LIST_STATUS.error);
    }
  }, []);

  useEffect(() => {
    refresh();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [refresh]);

  /**
   * @param {object} draft Raw form values
   * @returns {Promise<{ok: boolean, message?: string}>} `message` is user-facing
   */
  const addItem = useCallback(
    async (draft) => {
      const validation = normaliseDraft(draft, areaKeys);
      if (!validation.ok) return validation;
      if (!writeToken) return { ok: false, message: '請先用通行碼解鎖才能新增' };

      setIsSaving(true);
      try {
        const saved = await insertItem(validation.item, writeToken);
        setItems((current) => sorted([...current, saved]));
        setError(null);
        return { ok: true };
      } catch (cause) {
        return { ok: false, message: messageFor(cause, 'Buy list insert failed') };
      } finally {
        setIsSaving(false);
      }
    },
    [areaKeys, writeToken]
  );

  /**
   * Flips the bought flag optimistically, rolling back if the write is refused.
   * Nothing is ever removed — a bought item just moves down the list.
   */
  const toggleBought = useCallback(
    async (item) => {
      if (!writeToken) {
        setError('請先用通行碼解鎖才能勾選');
        return;
      }

      const next = { ...item, isBought: !item.isBought };
      setItems(replaceItem(next));
      setError(null);

      try {
        setItems(replaceItem(await setItemBought(item.id, next.isBought, writeToken)));
      } catch (cause) {
        setItems(replaceItem(item));
        setError(messageFor(cause, 'Buy list toggle failed'));
      }
    },
    [writeToken]
  );

  /**
   * Corrects an item already on the list: its wording, its link, its photo.
   *
   * Only the keys passed are written, so fixing a typo leaves a photo alone.
   * The area and who asked for it are not editable and are not accepted here.
   *
   * @param {object} item
   * @param {{name?: string, note?: string, link?: string,
   *          imageThumb?: string, imageFull?: string}} changes
   * @returns {Promise<{ok: boolean, message?: string}>} `message` is user-facing
   */
  const editItem = useCallback(
    async (item, changes) => {
      const validation = normaliseEdit(changes);
      if (!validation.ok) return validation;
      if (!writeToken) return { ok: false, message: '請先用通行碼解鎖才能編輯' };

      setIsSaving(true);
      try {
        setItems(replaceItem(await updateItem(item.id, validation.edit, writeToken)));
        setError(null);
        return { ok: true };
      } catch (cause) {
        return { ok: false, message: messageFor(cause, 'Buy list edit failed') };
      } finally {
        setIsSaving(false);
      }
    },
    [writeToken]
  );

  return {
    items,
    status,
    error,
    isSaving,
    canWrite: Boolean(writeToken),
    addItem,
    toggleBought,
    editItem,
    refresh,
  };
}
