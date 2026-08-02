import { describe, test, expect } from 'vitest';
import { toDisneyQrPayload } from './qrPayload.js';

/**
 * Synthetic ticket numbers only — real ones live in the encrypted vault and
 * must never be committed. These pin the transformation rule that was verified
 * against the QR images in the reservation PDFs: `T0` plus the digits, with
 * every separator stripped.
 */
const SAMPLES = [
  ['1234567-890-12345678-9', 'T01234567890123456789'],
  ['0000000-000-00000000-0', 'T00000000000000000000'],
  ['9876543-210-98765432-1', 'T09876543210987654321'],
];

describe('toDisneyQrPayload', () => {
  test.each(SAMPLES)('derives the scanned payload for ticket %s', (ticketNumber, expected) => {
    expect(toDisneyQrPayload(ticketNumber)).toBe(expected);
  });

  test('accepts a ticket number that already has its separators stripped', () => {
    expect(toDisneyQrPayload('1234567890123456789')).toBe('T01234567890123456789');
  });

  test('ignores separator style rather than assuming one layout', () => {
    expect(toDisneyQrPayload('1234567 890 12345678 9')).toBe('T01234567890123456789');
  });

  test('throws when the digit count does not match a real ticket number', () => {
    expect(() => toDisneyQrPayload('1234567-890-1234567')).toThrow(RangeError);
  });

  test('throws when given a non-string', () => {
    expect(() => toDisneyQrPayload(null)).toThrow(TypeError);
  });
});
