import React, { useCallback, useMemo, useState } from 'react';
import useDailyRates from '../hooks/useDailyRates';
import { defaultBaseCurrency, buildCurrencyOptions, formatNumberCompact } from '../utils/currency';
import RateBadge from './RateBadge';

/**
 * PUBLIC_INTERFACE
 * DailyRates
 * Displays a searchable/filterable list of top currency rates relative to the current base.
 * Integrates with useDailyRates for data, handles loading and error states, and provides manual refresh.
 *
 * Features:
 * - Search by currency code or description
 * - Filter to show Top N currencies by market prevalence (static list) or alphabetical
 * - Manual refresh button with last updated timestamp badge
 * - Accessible semantics with aria-live updates for loading and error
 *
 * Props: none
 * Returns: JSX.Element
 */
export default function DailyRates() {
  // Load daily rates and symbols
  const { rates, symbols, base, date, loading, error, lastUpdated, refresh } = useDailyRates({ base: defaultBaseCurrency });

  // UI state
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('alpha'); // 'alpha' | 'top'
  const [limit, setLimit] = useState(20);

  // Build options and quick-access symbol map
  const options = useMemo(() => buildCurrencyOptions(symbols), [symbols]);

  // Known top/traded currency list for default prioritization
  const topCodes = useMemo(
    () => [
      'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD',
      'SEK', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL',
    ],
    []
  );

  // Derived rows from rates+symbols, excluding base
  const rows = useMemo(() => {
    const out = [];
    for (const code of Object.keys(rates || {})) {
      if (code === base) continue;
      const value = rates[code];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const sym = symbols?.[code] || {};
      out.push({
        code,
        description: sym.description || '',
        rate: value,
      });
    }
    return out;
  }, [rates, symbols, base]);

  // Filter by query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.code.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }, [rows, query]);

  // Sort logic
  const sorted = useMemo(() => {
    if (sortBy === 'top') {
      // First topCodes (by the order in topCodes), then alphabetically
      const topSet = new Set(topCodes);
      const top = filtered.filter((r) => topSet.has(r.code));
      const rest = filtered.filter((r) => !topSet.has(r.code));
      top.sort((a, b) => topCodes.indexOf(a.code) - topCodes.indexOf(b.code));
      rest.sort((a, b) => a.code.localeCompare(b.code));
      return [...top, ...rest];
    }
    // alpha
    return [...filtered].sort((a, b) => a.code.localeCompare(b.code));
  }, [filtered, sortBy, topCodes]);

  const limited = useMemo(() => sorted.slice(0, Math.max(1, Number(limit) || 20)), [sorted, limit]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '—';
    try {
      return new Date(lastUpdated).toLocaleString();
    } catch {
      return String(lastUpdated);
    }
  }, [lastUpdated]);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <section className="daily-rates">
      {/* Controls */}
      <div className="dr-controls">
        <div className="dr-row">
          <div className="dr-group">
            <label htmlFor="dr-search" className="sr-only">Search currencies</label>
            <input
              id="dr-search"
              className="dr-input"
              type="text"
              placeholder="Search (e.g., USD, Euro)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search currencies"
            />
          </div>
          <div className="dr-group">
            <label htmlFor="dr-sort" className="sr-only">Sort by</label>
            <select
              id="dr-sort"
              className="dr-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort by"
            >
              <option value="alpha">Alphabetical</option>
              <option value="top">Top currencies first</option>
            </select>
          </div>
          <div className="dr-group">
            <label htmlFor="dr-limit" className="sr-only">Show limit</label>
            <select
              id="dr-limit"
              className="dr-select"
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              aria-label="Show limit"
            >
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
            </select>
          </div>

          <div className="dr-float">
            <span className="badge badge-neutral" title={`Base currency: ${base}`}>Base: {base}</span>
            <span className="badge badge-blue" title="Last updated timestamp">Updated: {lastUpdatedLabel}{date ? ` • ${date}` : ''}</span>
            <button className="btn btn-ghost" onClick={onRefresh} title="Refresh latest rates" aria-label="Refresh latest rates">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Loading/Error/Content */}
      {loading && (
        <div className="placeholder" role="status" aria-live="polite">
          <p>Loading latest rates…</p>
        </div>
      )}

      {error && !loading && (
        <div className="placeholder" role="alert">
          <p>Failed to load daily rates: {error.message || 'Unknown error'}</p>
          <button className="btn" onClick={onRefresh}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {limited.length === 0 ? (
            <div className="placeholder" role="status" aria-live="polite">
              <p>No results for your current filter.</p>
            </div>
          ) : (
            <ul className="dr-list" role="list">
              {limited.map((item) => (
                <li key={item.code} className="dr-item">
                  <div className="dr-left">
                    <div className="dr-code">{item.code}</div>
                    <div className="dr-desc muted">{item.description || '—'}</div>
                  </div>
                  <div className="dr-right">
                    <RateBadge code={item.code} rate={item.rate} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// Component-scoped styles leveraging theme tokens
const drStyle = document.createElement('style');
drStyle.innerHTML = `
.daily-rates { display: grid; gap: 12px; }
.dr-controls { display: grid; gap: 10px; }
.dr-row { display: grid; grid-template-columns: 1fr 160px 140px auto; gap: 10px; align-items: center; }
.dr-group { display: grid; gap: 6px; }
.dr-input, .dr-select {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface), transparent 4%);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition), box-shadow var(--transition);
  font-size: 0.95rem;
}
.dr-input:focus, .dr-select:focus { outline: none; box-shadow: 0 0 0 4px var(--ring); border-color: color-mix(in srgb, var(--color-primary), var(--border) 70%); }
.dr-float { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }

.dr-list {
  list-style: none;
  padding: 0; margin: 0;
  display: grid; gap: 8px;
}
.dr-item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background:
    radial-gradient(140px 70px at 100% -20%, rgba(37,99,235,0.06), transparent 60%),
    color-mix(in srgb, var(--surface), transparent 2%);
  box-shadow: var(--shadow-sm);
}
.dr-left { display: grid; gap: 2px; }
.dr-code { font-weight: 800; letter-spacing: 0.02em; }
.dr-desc { font-size: 0.85rem; }
.dr-right { display: flex; align-items: center; gap: 8px; }

@media (max-width: 940px) {
  .dr-row { grid-template-columns: 1fr; }
  .dr-float { justify-content: flex-start; flex-wrap: wrap; }
}

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`;
document.head.appendChild(drStyle);
