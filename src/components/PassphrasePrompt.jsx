import { useState } from 'react';
import { LockKeyhole, TriangleAlert } from 'lucide-react';
import { VAULT_STATUS } from '../hooks/useVault.js';

/**
 * Asks for the shared trip passphrase. The same unlock backs both the document
 * vault and adding to the buy list, so this is rendered in both places with
 * different copy.
 */
export default function PassphrasePrompt({ title, subtitle, status, error, onUnlock }) {
  const [passphrase, setPassphrase] = useState('');
  const isUnlocking = status === VAULT_STATUS.unlocking;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const succeeded = await onUnlock(passphrase);
    if (succeeded) setPassphrase('');
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1C1F26' }}>
          <LockKeyhole size={16} color="#FFFFFF" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-stone-800 text-sm">{title}</div>
          <div className="text-xs text-stone-400 mt-0.5">{subtitle}</div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          placeholder="通行碼"
          aria-label="通行碼"
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-stone-100 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus-visible:ring-2"
        />
        <button
          type="submit"
          disabled={isUnlocking}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2"
          style={{ backgroundColor: '#1C1F26' }}
        >
          {isUnlocking ? '解鎖中…' : '解鎖'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-rose-600">
          <TriangleAlert size={13} />
          {error}
        </div>
      )}
    </form>
  );
}
