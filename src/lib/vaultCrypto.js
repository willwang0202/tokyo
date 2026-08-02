/**
 * Passphrase-based encryption for the travel document vault.
 *
 * The repository is public and auto-deploys to GitHub Pages, so park tickets
 * and Visit Japan Web codes are committed only as AES-GCM ciphertext. Plaintext
 * never leaves the encrypt script (see scripts/encrypt-vault.mjs).
 *
 * Runs on the WebCrypto API, which is available unprefixed in both the browser
 * and Node 18+, so the same code encrypts at build time and decrypts at runtime.
 */

const KDF_HASH = 'SHA-256';
const KDF_ITERATIONS = 600_000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const SALT_BYTES = 16;
const IV_BYTES = 12; // 96-bit IV, the size AES-GCM is specified for
const KEY_BITS = 256;
const ENVELOPE_VERSION = 1;

export class WrongPassphraseError extends Error {
  constructor() {
    super('Passphrase did not decrypt the vault');
    this.name = 'WrongPassphraseError';
  }
}

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));

const fromBase64 = (text) =>
  Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

async function deriveKey(passphrase, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: KDF_HASH },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * @param {unknown} data JSON-serialisable vault contents
 * @param {string} passphrase
 * @returns {Promise<object>} Envelope safe to commit to a public repository
 */
export async function encryptJson(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );

  return {
    v: ENVELOPE_VERSION,
    kdf: {
      name: 'PBKDF2',
      hash: KDF_HASH,
      iterations: KDF_ITERATIONS,
      salt: toBase64(salt),
    },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    data: toBase64(new Uint8Array(ciphertext)),
  };
}

/**
 * @param {object} envelope Output of {@link encryptJson}
 * @param {string} passphrase
 * @returns {Promise<unknown>} Decrypted vault contents
 * @throws {WrongPassphraseError} when the passphrase is wrong or data is tampered with
 */
export async function decryptJson(envelope, passphrase) {
  if (envelope?.v !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported vault envelope version: ${envelope?.v}`);
  }

  const key = await deriveKey(
    passphrase,
    fromBase64(envelope.kdf.salt),
    envelope.kdf.iterations
  );

  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.cipher.iv) },
      key,
      fromBase64(envelope.data)
    );
  } catch {
    // AES-GCM authentication failure — wrong passphrase or corrupted ciphertext.
    throw new WrongPassphraseError();
  }

  return JSON.parse(new TextDecoder().decode(plaintext));
}
