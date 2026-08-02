import { describe, test, expect } from 'vitest';
import { encryptJson, decryptJson, WrongPassphraseError } from './vaultCrypto.js';

const PASSPHRASE = 'correct horse battery staple';
const SAMPLE = {
  days: { 1: [{ id: 'sample', items: [{ label: 'TRAVELLER', payload: 'PAYLOAD-abc123' }] }] },
};

describe('vault encryption', () => {
  test('round-trips the vault contents through an envelope', async () => {
    // Arrange / Act
    const envelope = await encryptJson(SAMPLE, PASSPHRASE);
    const decrypted = await decryptJson(envelope, PASSPHRASE);

    // Assert
    expect(decrypted).toEqual(SAMPLE);
  });

  test('leaves no plaintext in the committed envelope', async () => {
    const envelope = await encryptJson(SAMPLE, PASSPHRASE);

    expect(JSON.stringify(envelope)).not.toContain('TRAVELLER');
    expect(JSON.stringify(envelope)).not.toContain('PAYLOAD');
  });

  test('uses a fresh salt and IV per run so identical input differs', async () => {
    const first = await encryptJson(SAMPLE, PASSPHRASE);
    const second = await encryptJson(SAMPLE, PASSPHRASE);

    expect(first.kdf.salt).not.toBe(second.kdf.salt);
    expect(first.cipher.iv).not.toBe(second.cipher.iv);
    expect(first.data).not.toBe(second.data);
  });

  test('throws WrongPassphraseError for a bad passphrase', async () => {
    const envelope = await encryptJson(SAMPLE, PASSPHRASE);

    await expect(decryptJson(envelope, 'wrong')).rejects.toThrow(WrongPassphraseError);
  });

  test('throws WrongPassphraseError when the ciphertext is tampered with', async () => {
    const envelope = await encryptJson(SAMPLE, PASSPHRASE);
    const flipped = envelope.data.startsWith('A') ? 'B' : 'A';
    const tampered = { ...envelope, data: flipped + envelope.data.slice(1) };

    await expect(decryptJson(tampered, PASSPHRASE)).rejects.toThrow(WrongPassphraseError);
  });

  test('rejects an envelope from an unsupported version', async () => {
    const envelope = await encryptJson(SAMPLE, PASSPHRASE);

    await expect(decryptJson({ ...envelope, v: 99 }, PASSPHRASE)).rejects.toThrow(
      /Unsupported vault envelope version/
    );
  });
});
