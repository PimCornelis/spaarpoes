// Money is always a whole number of euro cents. No decimals are ever calculated with.

const euroFormat = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

export function isCents(value) {
  return Number.isSafeInteger(value);
}

/** Splits cents into sign, whole euros and two cent digits, without dividing into decimals. */
function parts(cents) {
  if (!isCents(cents)) throw new TypeError(`not whole cents: ${cents}`);
  const digits = String(Math.abs(cents)).padStart(3, '0');
  return { sign: cents < 0 ? '-' : '', euros: digits.slice(0, -2), rest: digits.slice(-2) };
}

/** 123456 -> "€ 1.234,56" */
export function formatEuro(cents) {
  const { sign, euros, rest } = parts(cents);
  // The number is handed over as text, so it is not rounded on the way.
  return euroFormat.format(`${sign}${euros}.${rest}`);
}

/** 123456 -> "1234,56" (for the CSV file and for filling in a form). */
export function formatDecimal(cents) {
  const { sign, euros, rest } = parts(cents);
  return `${sign}${euros},${rest}`;
}

const GROUPED = /^[1-9]\d{0,2}(\.\d{3})+$/; // 1.234 or 12.345.678
const MAX_EURO_DIGITS = 8;

/**
 * Reads a typed amount and returns cents, or null when it is not a clear, positive-or-zero amount.
 * A comma is the decimal separator. A dot is also accepted as one (some keypads only offer a dot),
 * except where it can only be a thousands separator: "1.234".
 */
export function parseAmount(text) {
  const clean = String(text).replace(/[\s €]/g, '');
  let euros;
  let rest = '';
  if (clean.includes(',')) {
    const pieces = clean.split(',');
    if (pieces.length !== 2 || !/^\d{1,2}$/.test(pieces[1])) return null;
    [euros, rest] = pieces;
    if (GROUPED.test(euros)) euros = euros.replaceAll('.', '');
    else if (!/^\d*$/.test(euros)) return null;
  } else if (GROUPED.test(clean)) {
    euros = clean.replaceAll('.', '');
  } else {
    const match = /^(\d*)\.(\d{1,2})$/.exec(clean);
    if (match) [, euros, rest] = match;
    else if (/^\d+$/.test(clean)) euros = clean;
    else return null;
  }
  if (euros.length > MAX_EURO_DIGITS) return null;
  return Number(euros || '0') * 100 + Number(rest.padEnd(2, '0'));
}

/** Divides two whole numbers (both zero or positive) and rounds half up. */
export function roundDiv(value, by) {
  return Math.floor((2 * value + by) / (2 * by));
}
