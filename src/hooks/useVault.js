import { useCallback, useState } from 'react';
import envelope from '../data/vault.encrypted.json';
import { decryptJson, WrongPassphraseError } from '../lib/vaultCrypto.js';

const CACHE_KEY = 'tokyo.vault.v1';

/** Ties the cache to this exact ciphertext so re-encrypting invalidates it. */
const FINGERPRINT = envelope.data.slice(0, 32);

/** Published in the clear so the locked UI knows which days have documents. */
export const hasDocuments = (dayId) => envelope.dayIds.includes(dayId);

export const VAULT_STATUS = {
  locked: 'locked',
  unlocking: 'unlocking',
  unlocked: 'unlocked',
};

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return cached?.fingerprint === FINGERPRINT ? cached.vault : null;
  } catch {
    // Corrupt or unavailable storage (private mode, quota) — just re-unlock.
    return null;
  }
}

function writeCache(vault) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fingerprint: FINGERPRINT, vault }));
  } catch {
    // Caching is a convenience; failing to persist must not block the unlock.
  }
}

/**
 * Holds the decrypted travel document vault for the session. Once unlocked the
 * contents are cached locally so the QR codes come straight up on later visits
 * without re-deriving the key.
 */
export function useVault() {
  const [vault, setVault] = useState(readCache);
  const [error, setError] = useState(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const unlock = useCallback(async (passphrase) => {
    if (!passphrase) {
      setError('請輸入通行碼');
      return false;
    }

    setIsUnlocking(true);
    setError(null);
    try {
      const decrypted = await decryptJson(envelope, passphrase);
      writeCache(decrypted);
      setVault(decrypted);
      return true;
    } catch (cause) {
      setError(cause instanceof WrongPassphraseError ? '通行碼錯誤，請再試一次' : '解鎖失敗，請重新整理後再試');
      console.error('Vault unlock failed', cause);
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, []);

  const lock = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
    setVault(null);
    setError(null);
  }, []);

  const groupsForDay = useCallback((dayId) => vault?.days?.[String(dayId)] ?? [], [vault]);

  let status = VAULT_STATUS.locked;
  if (vault) status = VAULT_STATUS.unlocked;
  else if (isUnlocking) status = VAULT_STATUS.unlocking;

  return { status, error, unlock, lock, groupsForDay };
}
