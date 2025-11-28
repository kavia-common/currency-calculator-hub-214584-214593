import { getBaseUrl } from '../config/env';

/**
 * Lightweight API client for currency data.
 * - Resolves base URL from env using getBaseUrl()
 * - Falls back to exchangerate.host if environment base points to same origin or is missing
 * - Provides a small fetch wrapper with timeout and graceful error handling
 */

const EXTERNAL_FALLBACK_BASE = 'https://api.exchangerate.host';

/**
 * Determine if we should use the external public API fallback.
 * If REACT_APP_API_BASE / REACT_APP_BACKEND_URL are unset, getBaseUrl()
 * will return window.location.origin (or localhost in tests).
 * In that scenario, we want to call the public API directly.
 */
function resolveApiBase() {
  const envBase = safeString(getBaseUrl());
  // If envBase is empty or points to same origin (likely frontend host), use external fallback
  try {
    if (!envBase) return EXTERNAL_FALLBACK_BASE;
    const currentOrigin =
      typeof window !== 'undefined' && window?.location?.origin
        ? window.location.origin
        : undefined;

    if (currentOrigin && stripTrailingSlash(envBase) === stripTrailingSlash(currentOrigin)) {
      return EXTERNAL_FALLBACK_BASE;
    }
  } catch {
    // ignore parsing issues and continue
  }
  return envBase || EXTERNAL_FALLBACK_BASE;
}

/**
 * Remove a single trailing slash for comparison and URL joining.
 */
function stripTrailingSlash(s) {
  return typeof s === 'string' ? s.replace(/\/+$/, '') : s;
}

/**
 * Ensure string or undefined
 */
function safeString(v) {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Join base and path segments with single slash separation.
 */
function joinUrl(base, path) {
  const b = stripTrailingSlash(base || '');
  const p = path?.startsWith('/') ? path : `/${path || ''}`;
  return `${b}${p}`;
}

/**
 * Core fetch wrapper with:
 * - timeout
 * - JSON parsing
 * - helpful error messages
 * - optional query params
 *
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number, query?: Record<string,string|number|boolean|undefined> }} [options]
 * @returns {Promise<any>}
 */
async function httpGet(url, options = {}) {
  const { timeoutMs = 12000, query, headers, ...rest } = options;

  // Build URL with query params if provided
  let fullUrl = url;
  if (query && typeof query === 'object') {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      usp.append(k, String(v));
    }
    const q = usp.toString();
    if (q) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + q;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(headers || {}),
      },
      signal: controller.signal,
      ...rest,
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!res.ok) {
      // Try to parse error details if JSON
      let detail = '';
      if (isJson) {
        try {
          const body = await res.json();
          detail = body?.message || body?.error || JSON.stringify(body);
        } catch {
          // ignore
        }
      } else {
        try {
          detail = await res.text();
        } catch {
          // ignore
        }
      }
      const error = new Error(
        `[api] Request failed: ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ''}`
      );
      error.status = res.status;
      error.statusText = res.statusText;
      throw error;
    }

    if (isJson) {
      return await res.json();
    }
    // Fallback to text if not JSON
    return await res.text();
  } catch (err) {
    if (err?.name === 'AbortError') {
      const e = new Error('[api] Request timed out');
      e.code = 'ETIMEDOUT';
      throw e;
    }
    // Re-throw with normalized message
    const e = new Error(`[api] ${err?.message || 'Unknown error'}`);
    e.cause = err;
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

const API_BASE = resolveApiBase();

/**
 * PUBLIC_INTERFACE
 * getDailyRates
 * Fetch latest daily exchange rates.
 * Uses exchangerate.host format when falling back:
 *   GET https://api.exchangerate.host/latest?base=USD
 *
 * If pointing to a custom backend that mirrors this route, it should
 * expose a similar /latest endpoint.
 *
 * @param {{ base?: string }} [opts]
 * @returns {Promise<{ base: string, date?: string, rates: Record<string, number> }>}
 */
export async function getDailyRates(opts = {}) {
  const base = safeString(opts.base) || 'USD';
  const url = joinUrl(API_BASE, detectLatestPath(API_BASE));
  const data = await httpGet(url, { query: { base } });

  // Normalize common shapes to a consistent response
  // exchangerate.host returns: { base, date, rates: { ... } }
  if (data && typeof data === 'object') {
    // Direct passthrough if already in expected shape
    if (data.rates && data.base) {
      return {
        base: data.base,
        date: data.date,
        rates: data.rates,
      };
    }
    // If backend wrapped payload differently, attempt to unwrap
    if (data.data && data.data.rates) {
      return {
        base: data.data.base || base,
        date: data.data.date,
        rates: data.data.rates,
      };
    }
  }

  // Fallback shape
  return {
    base,
    rates: {},
  };
}

/**
 * PUBLIC_INTERFACE
 * getSymbols
 * Fetch currency symbols map.
 * Uses exchangerate.host symbols endpoint when falling back:
 *   GET https://api.exchangerate.host/symbols
 * Response example:
 * {
 *   "symbols": {
 *     "AED": { "description": "United Arab Emirates Dirham", "code": "AED" },
 *     ...
 *   }
 * }
 *
 * @returns {Promise<Record<string, { code: string, description: string }>>}
 */
export async function getSymbols() {
  const url = joinUrl(API_BASE, detectSymbolsPath(API_BASE));
  const data = await httpGet(url);

  if (data && typeof data === 'object') {
    // exchangerate.host format
    if (data.symbols && typeof data.symbols === 'object') {
      return data.symbols;
    }
    // attempt unwrap if backend uses { data: { symbols: ... } }
    if (data.data && data.data.symbols) {
      return data.data.symbols;
    }
  }

  return {};
}

/**
 * Detect path for "latest rates" depending on base.
 * - If using external fallback, path is '/latest'
 * - Otherwise assume '/latest' exists on backend as well
 */
function detectLatestPath(base) {
  if (isExternal(base)) return '/latest';
  return '/latest';
}

/**
 * Detect path for "symbols" depending on base.
 * - If using external fallback, path is '/symbols'
 * - Otherwise assume '/symbols' exists on backend as well
 */
function detectSymbolsPath(base) {
  if (isExternal(base)) return '/symbols';
  return '/symbols';
}

/**
 * Determine if the base points to the external public API.
 */
function isExternal(base) {
  try {
    return stripTrailingSlash(base).startsWith(EXTERNAL_FALLBACK_BASE);
  } catch {
    return true;
  }
}
