import { describe, test, expect } from 'vitest';
import { deriveWriteToken } from './buyListToken.js';

describe('deriveWriteToken', () => {
  test('derives the same token every time for a given passphrase', async () => {
    // Arrange
    const passphrase = 'synthetic-passphrase';

    // Act
    const [first, second] = await Promise.all([
      deriveWriteToken(passphrase),
      deriveWriteToken(passphrase),
    ]);

    // Assert
    expect(first).toBe(second);
  });

  test('derives a different token for a different passphrase', async () => {
    const mine = await deriveWriteToken('synthetic-passphrase');
    const theirs = await deriveWriteToken('synthetic-passphras');

    expect(mine).not.toBe(theirs);
  });

  test('derives a 256-bit token as lowercase hex', async () => {
    const token = await deriveWriteToken('synthetic-passphrase');

    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  test('rejects an empty passphrase rather than deriving a guessable token', async () => {
    await expect(deriveWriteToken('')).rejects.toThrow(TypeError);
  });

  test('rejects a non-string passphrase', async () => {
    await expect(deriveWriteToken(null)).rejects.toThrow(TypeError);
  });
});
