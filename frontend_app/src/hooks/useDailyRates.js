import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDailyRates, getSymbols } from '../services/api';

/**
 * useDailyRates
 * Fetches currency symbols and latest daily rates with 24h localStorage caching.
 * Exposes payload shape, loading/error state, lastUpdated timestamp and manual refresh.
 *
 * Storage schema:
 *  - Key: 'cc_hub_daily_payload_v1::<base>'
 *  - Value: JSON.stringify({
 *      base: string,
 *      date?: string,
 *      rates: Record<string, number>,
 *      symbols: Record<string, { code: string, description: string }>,
 *      lastUpdated: number (epoch ms)
 *    })
 */

// Cache constants
const CACHE_PREFIX = 'cc_hub_daily_payload_v1::';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Safely parse JSON string.
 */
function safeParse(json) {
  if (typeof json !== 'string') return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 * Build localStorage cache key by base currency
 */
function cacheKey(base) {
  return `${CACHE_PREFIX}${(base || 'USD').toUpperCase()}`;
}

/**
 * Determine if cached item is still valid by TTL
 */
function isFresh(ts) {
  if (!ts || typeof ts !== 'number') return false;
  return Date.now() - ts < TTL_MS;
}

/**
 * Save payload to localStorage (best-effort).
 */
function saveCache(base, payload) {
  try {
    const key = cacheKey(base);
    const data = {
      base: payload.base,
      date: payload.date,
      rates: payload.rates || {},
      symbols: payload.symbols || {},
      lastUpdated: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage issues
  }
}

/**
 * Load payload from localStorage.
 */
function loadCache(base) {
  try {
    const key = cacheKey(base);
    const raw = window.localStorage.getItem(key);
    const data = safeParse(raw);
    if (data && isFresh(data.lastUpdated)) {
      return data;
    }
  } catch {
    // ignore storage issues
  }
  return undefined;
}

/**
 * PUBLIC_INTERFACE
 * useDailyRates
 * React hook to load currency symbols and daily rates with caching and refresh.
 *
 * @param {{ base?: string, disableCache?: boolean }} [options]
 * @returns {{
 *   rates: Record<string, number>,
 *   symbols: Record<string, { code: string, description: string }>,
 *   base: string,
 *   date?: string,
 *   loading: boolean,
 *   error: Error | null,
 *   lastUpdated?: number,
 *   refresh: () => Promise<void>
 * }}
 */
export function useDailyRates(options = {}) {
  const defaultBase = typeof options.base === 'string' && options.base.trim()
    ? options.base.trim().toUpperCase()
    : 'USD';
  const [base, setBase] = useState(defaultBase);

  // state
  const [rates, setRates] = useState({});
  const [symbols, setSymbols] = useState({});
  const [date, setDate] = useState(undefined);
  const [lastUpdated, setLastUpdated] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // track in-flight to avoid races
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // sync base from options if changed
  useEffect(() => {
    const nextBase = (options.base || 'USD').toUpperCase();
    if (nextBase !== base) setBase(nextBase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.base]);

  const applyPayload = useCallback((payload) => {
    if (!mountedRef.current) return;
    setRates(payload.rates || {});
    setSymbols(payload.symbols || {});
    setDate(payload.date);
    setLastUpdated(payload.lastUpdated || Date.now());
  }, []);

  const fetchFresh = useCallback(async (b) => {
    // Fetch symbols and daily rates concurrently
    const [symbolsData, ratesData] = await Promise.all([
      getSymbols(),
      getDailyRates({ base: b }),
    ]);

    const merged = {
      base: ratesData?.base || b,
      date: ratesData?.date,
      rates: ratesData?.rates || {},
      symbols: symbolsData || {},
      lastUpdated: Date.now(),
    };

    // Save to cache (best-effort)
    saveCache(b, merged);

    return merged;
  }, []);

  const load = useCallback(
    async (opts = { force: false }) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const b = base;

      try {
        if (!opts.force && !options.disableCache) {
          // try cache first
          const cached = loadCache(b);
          if (cached) {
            applyPayload(cached);
            setLoading(false);
            loadingRef.current = false;
            return;
          }
        }

        // fetch fresh
        const fresh = await fetchFresh(b);
        applyPayload(fresh);
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mountedRef.current) setLoading(false);
        loadingRef.current = false;
      }
    },
    [applyPayload, base, fetchFresh, options.disableCache]
  );

  // initial load
  useEffect(() => {
    mountedRef.current = true;
    load({ force: false });
    return () => {
      mountedRef.current = false;
    };
  }, [base, load]);

  // PUBLIC_INTERFACE
  const refresh = useCallback(async () => {
    // force bypass cache
    await load({ force: true });
  }, [load]);

  // Derived memoized object to keep stable identity where possible
  const result = useMemo(
    () => ({
      rates,
      symbols,
      base,
      date,
      loading,
      error,
      lastUpdated,
      refresh,
    }),
    [rates, symbols, base, date, loading, error, lastUpdated, refresh]
  );

  return result;
}

export default useDailyRates;
