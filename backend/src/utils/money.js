// Decimal-safe money helpers. All amounts are handled as integer cents (BigInt)
// internally, so no floating-point rounding ever touches a monetary value.
// MySQL DECIMAL(15,2) columns arrive from mysql2 as strings ("1234.50").

const AMOUNT_RE = /^-?\d+(\.\d{1,2})?$/;

export function toCents(value) {
  if (typeof value === 'bigint') return value;
  if (value === null || value === undefined || value === '') return 0n;
  const str = typeof value === 'number' ? value.toFixed(2) : String(value).trim();
  if (!AMOUNT_RE.test(str)) {
    throw new TypeError(`Invalid monetary amount: ${str}`);
  }
  const negative = str.startsWith('-');
  const [whole, frac = ''] = str.replace('-', '').split('.');
  const cents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0'));
  return negative ? -cents : cents;
}

export function fromCents(cents) {
  const c = BigInt(cents);
  const negative = c < 0n;
  const abs = negative ? -c : c;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

export function sumCents(values) {
  return values.reduce((acc, v) => acc + toCents(v), 0n);
}

// Returns (numerator / denominator * 100) as a string with 2 decimals,
// rounded half away from zero. Returns null when the denominator is zero
// (the caller decides how to present "not available").
export function percentage(numerator, denominator) {
  const num = toCents(numerator);
  const den = toCents(denominator);
  if (den === 0n) return null;
  const sign = (num < 0n) !== (den < 0n) ? -1n : 1n;
  const n = num < 0n ? -num : num;
  const d = den < 0n ? -den : den;
  // result scaled by 100 (2 decimals): n * 100 * 100 / d
  const scaled = (n * 10000n * 2n + d) / (2n * d);
  return fromCents(sign * scaled);
}
