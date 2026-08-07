/**
 * Derives the shared write token for the buy list from the vault passphrase.
 *
 * The site is static and public, so the Supabase anon key ships in the bundle
 * and anyone could otherwise POST to the table. Since nothing can be deleted,
 * spam would be permanent. Writes are therefore gated on an `x-buy-list-token`
 * header that a Row Level Security policy checks against a secret only the
 * database can read (see supabase/migrations).
 *
 * The token is derived from the passphrase the five of us already share for the
 * document vault, so there is nothing extra to remember and nothing extra to
 * commit. PBKDF2 is used rather than a bare hash so that the passphrase itself
 * stays expensive to recover if a token ever turns up in a request log.
 */

const KDF_HASH = 'SHA-256';
const KDF_ITERATIONS = 200_000;
const TOKEN_BITS = 256;

/**
 * Fixed salt rather than a random one: every traveller's browser has to arrive
 * at the same token from the same passphrase. Domain-separated so this token
 * can never collide with the vault's AES key.
 */
const SALT = new TextEncoder().encode('tokyo-app/buy-list-write-token/v1');

const toHex = (bytes) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * @param {string} passphrase The document vault passphrase
 * @returns {Promise<string>} 64-character lowercase hex token
 * @throws {TypeError} when the passphrase is missing or not a string
 */
export async function deriveWriteToken(passphrase) {
  if (typeof passphrase !== 'string' || passphrase === '') {
    throw new TypeError('A passphrase is required to derive the buy-list write token');
  }

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: SALT, iterations: KDF_ITERATIONS, hash: KDF_HASH },
    baseKey,
    TOKEN_BITS
  );

  return toHex(new Uint8Array(bits));
}
