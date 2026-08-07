import { useCallback, useState } from 'react';
import envelope from '../data/vault.encrypted.json';
import { decryptJson, WrongPassphraseError } from '../lib/vaultCrypto.js';
import { deriveWriteToken } from '../lib/buyListToken.js';

// v2 adds the buy-list write token to the cached session; a v1 entry has no
// token to offer, so it is ignored and the passphrase is asked for once more.
const CACHE_KEY = 'tokyo.vault.v2';

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
    return cached?.fingerprint === FINGERPRINT ? cached.session : null;
  } catch {
    // Corrupt or unavailable storage (private mode, quota) — just re-unlock.
    return null;
  }
}

function writeCache(session) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fingerprint: FINGERPRINT, session }));
  } catch {
    // Caching is a convenience; failing to persist must not block the unlock.
  }
}

/**
 * Holds what the trip passphrase unlocks: the decrypted travel document vault,
 * and the token that lets this browser add to the shared buy list. Both are
 * cached locally so a later visit comes straight up without re-deriving keys.
 */
export function useVault() {
  const [session, setSession] = useState(readCache);
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
      // Decrypt first: it is what proves the passphrase is right. Deriving the
      // write token from a wrong passphrase would just yield a token Supabase
      // rejects, with no way to tell the user why.
      const vault = await decryptJson(envelope, passphrase);
      const unlocked = { vault, writeToken: await deriveWriteToken(passphrase) };
      writeCache(unlocked);
      setSession(unlocked);
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
    setSession(null);
    setError(null);
  }, []);

  const groupsForDay = useCallback(
    (dayId) => session?.vault?.days?.[String(dayId)] ?? [],
    [session]
  );

  let status = VAULT_STATUS.locked;
  if (session) status = VAULT_STATUS.unlocked;
  else if (isUnlocking) status = VAULT_STATUS.unlocking;

  return { status, error, unlock, lock, groupsForDay, writeToken: session?.writeToken ?? null };
}
