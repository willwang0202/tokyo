/**
 * Tokyo Disney Resort park tickets encode their QR as the literal string
 * `T0` followed by the printed ticket number with separators stripped.
 * Verified by decoding every QR image in the reservation PDFs and comparing
 * against the ticket number printed beneath it.
 */

const DISNEY_QR_PREFIX = 'T0';
const DISNEY_TICKET_DIGITS = 19;

/**
 * @param {string} ticketNumber Printed ticket number, e.g. '1234567-890-12345678-9'
 * @returns {string} QR payload, e.g. 'T01234567890123456789'
 */
export function toDisneyQrPayload(ticketNumber) {
  if (typeof ticketNumber !== 'string') {
    throw new TypeError(`Ticket number must be a string, got ${typeof ticketNumber}`);
  }

  const digits = ticketNumber.replace(/\D/g, '');
  if (digits.length !== DISNEY_TICKET_DIGITS) {
    throw new RangeError(
      `Ticket number "${ticketNumber}" has ${digits.length} digits, expected ${DISNEY_TICKET_DIGITS}`
    );
  }

  return `${DISNEY_QR_PREFIX}${digits}`;
}
