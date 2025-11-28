//
// Currency utilities: parsing, formatting, common operations for converter UI.
//
// PUBLIC_INTERFACE
// defaultBaseCurrency
// Default base currency used across the app. Not hardcoded to env to keep UI deterministic.
// If you need to make it configurable, inject from settings or env at a higher level.
//
export const defaultBaseCurrency = 'USD';

/**
 * Normalize a numeric input string to a JS number.
 * Handles commas, spaces, and common number formats.
 *
 * - Accepts "1,234.56" => 1234.56
 * - Accepts "  12 345,67 " if configured for comma decimal? This utility is locale-agnostic; we strip all commas then parse.
 * - Returns NaN if not parseable.
 *
 * PUBLIC_INTERFACE
 * @param {string | number | null | undefined} value
 * @returns {number}
 */
export function parseNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  if (typeof value !== 'string') return NaN;
  let s = value.trim();
  if (!s) return NaN;
  // Remove spaces
  s = s.replace(/\s+/g, '');
  // If there are both '.' and ',' present, assume ',' is thousands sep -> remove commas
  // Else if only ',' present and not '.', we can try to treat ',' as decimal by replacing with '.'
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/,/g, '');
  } else if (!s.includes('.') && s.includes(',')) {
    s = s.replace(/,/g, '.');
  } else {
    // remove any thousands separators (commas)
    s = s.replace(/,/g, '');
  }
  // Remove any non-numeric except leading - and one dot
  s = s.replace(/(?!^-)[^0-9.]/g, '');
  // Ensure single dot
  const parts = s.split('.');
  if (parts.length > 2) {
    s = parts.shift() + '.' + parts.join('');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * PUBLIC_INTERFACE
 * formatCurrency
 * Format number in a currency-like way with Intl.NumberFormat.
 * If Intl fails or currency missing, falls back to a simple fixed format.
 *
 * @param {number} amount
 * @param {string} currencyCode ISO 4217 e.g., 'USD'
 * @param {string} [locale] Optional BCP 47 locale, defaults to browser or 'en-US'
 * @returns {string}
 */
export function formatCurrency(amount, currencyCode, locale) {
  const safeLocale = typeof locale === 'string' && locale ? locale : (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  try {
    const fmt = new Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency: currencyCode || defaultBaseCurrency,
      maximumFractionDigits: 6,
    });
    return fmt.format(amount);
  } catch {
    // Fallback: plain number with 2-6 decimals depending on value
    if (!Number.isFinite(amount)) return String(amount);
    const abs = Math.abs(amount);
    const decimals = abs === 0 ? 2 : abs < 1 ? 6 : abs < 1000 ? 4 : 2;
    return `${currencyCode || ''} ${amount.toFixed(decimals)}`.trim();
  }
}

/**
 * PUBLIC_INTERFACE
 * formatNumberCompact
 * Format number using compact notation to display rates or amounts nicely.
 *
 * @param {number} n
 * @param {string} [locale]
 * @returns {string}
 */
export function formatNumberCompact(n, locale) {
  const safeLocale = typeof locale === 'string' && locale ? locale : (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  try {
    return new Intl.NumberFormat(safeLocale, {
      notation: 'compact',
      maximumFractionDigits: 4,
    }).format(n);
  } catch {
    if (!Number.isFinite(n)) return String(n);
    return String(+n.toFixed(4));
  }
}

/**
 * PUBLIC_INTERFACE
 * buildCurrencyOptions
 * Builds a sorted array of { value, label } options from a symbols map.
 * Sorting is alphabetical by code. Label includes description for clarity.
 *
 * @param {Record<string, { code: string, description: string }>} symbols
 * @returns {{ value: string, label: string }[]}
 */
export function buildCurrencyOptions(symbols) {
  if (!symbols || typeof symbols !== 'object') return [];
  const list = Object.keys(symbols).map((code) => {
    const item = symbols[code] || {};
    const desc = item.description || '';
    const c = (item.code || code || '').toUpperCase();
    return {
      value: c,
      label: desc ? `${c} — ${desc}` : c,
    };
  });
  // Ensure unique and sorted by value (code)
  const seen = new Set();
  const unique = [];
  for (const opt of list) {
    if (!opt.value || seen.has(opt.value)) continue;
    seen.add(opt.value);
    unique.push(opt);
  }
  unique.sort((a, b) => a.value.localeCompare(b.value));
  return unique;
}

/**
 * PUBLIC_INTERFACE
 * convertAmount
 * Convert amount from 'from' currency to 'to' currency using provided rates table keyed to base currency.
 * If rates are with respect to base, and we need from->to:
 *   amount_in_base = amount / rate(from)
 *   converted = amount_in_base * rate(to)
 * Special case: if from === base, amount_in_base = amount; if to === base, converted = amount_in_base.
 *
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @param {Record<string, number>} rates rates relative to base (base->X)
 * @param {string} base base code of rates
 * @returns {number}
 */
export function convertAmount(amount, from, to, rates, base = defaultBaseCurrency) {
  if (!Number.isFinite(amount)) return NaN;
  const f = (from || '').toUpperCase();
  const t = (to || '').toUpperCase();
  const b = (base || '').toUpperCase();

  if (f === t) return amount;

  // Helper to get rate for code relative to base.
  function r(code) {
    if (code === b) return 1;
    const val = rates?.[code];
    return typeof val === 'number' && Number.isFinite(val) ? val : NaN;
    }

  const rf = r(f);
  const rt = r(t);

  // If either rate is missing, cannot compute.
  if (!Number.isFinite(rf) || !Number.isFinite(rt)) return NaN;

  // Convert via base
  // amount_in_base = amount / rf (since base->from = rf, then from->base = 1/rf)
  const inBase = f === b ? amount : amount / rf;
  const result = t === b ? inBase : inBase * rt;
  return result;
}

/**
 * PUBLIC_INTERFACE
 * persistSelection
 * Save last-used converter selections and amount to localStorage.
 *
 * @param {{ amount: string, from: string, to: string }} state
 */
export function persistSelection(state) {
  try {
    const payload = {
      amount: String(state.amount ?? ''),
      from: String(state.from ?? defaultBaseCurrency).toUpperCase(),
      to: String(state.to ?? 'EUR').toUpperCase(),
      ts: Date.now(),
    };
    window.localStorage.setItem('cc_hub_conv_last_v1', JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * PUBLIC_INTERFACE
 * loadSelection
 * Load last-used converter selections from localStorage, if present.
 *
 * @returns {{ amount: string, from: string, to: string } | undefined}
 */
export function loadSelection() {
  try {
    const raw = window.localStorage.getItem('cc_hub_conv_last_v1');
    if (!raw) return undefined;
    const data = JSON.parse(raw);
    if (!data) return undefined;
    const result = {
      amount: typeof data.amount === 'string' ? data.amount : '',
      from: typeof data.from === 'string' ? data.from.toUpperCase() : defaultBaseCurrency,
      to: typeof data.to === 'string' ? data.to.toUpperCase() : 'EUR',
    };
    return result;
  } catch {
    return undefined;
  }
}
