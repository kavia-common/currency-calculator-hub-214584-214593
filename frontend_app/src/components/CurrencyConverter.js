import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDailyRates from '../hooks/useDailyRates';
import { buildCurrencyOptions, convertAmount, defaultBaseCurrency, formatCurrency, parseNumber, loadSelection, persistSelection } from '../utils/currency';

/**
 * PUBLIC_INTERFACE
 * CurrencyConverter
 * A functional converter UI that:
 * - Loads symbols and latest rates via useDailyRates
 * - Provides amount input and From/To currency selects
 * - Debounces conversion to avoid over-render
 * - Supports Swap action
 * - Persists last selections and amount in localStorage
 * - Displays last updated time and loading/error states
 *
 * Props: none
 * Returns: JSX.Element section
 */
export default function CurrencyConverter() {
  // Load daily rates and symbols; base can be the default
  const { rates, symbols, base, date, loading, error, lastUpdated, refresh } = useDailyRates({ base: defaultBaseCurrency });

  // Restore last state from localStorage
  const restored = useMemo(() => loadSelection(), []);
  const [amountInput, setAmountInput] = useState(restored?.amount ?? '');
  const [from, setFrom] = useState(restored?.from ?? defaultBaseCurrency);
  const [to, setTo] = useState(restored?.to ?? 'EUR');

  // Derived options
  const currencyOptions = useMemo(() => buildCurrencyOptions(symbols), [symbols]);

  // Computed result (debounced)
  const [result, setResult] = useState('');
  const [debouncing, setDebouncing] = useState(false);
  const debounceTimer = useRef(null);

  const compute = useCallback(() => {
    const amt = parseNumber(amountInput);
    const n = convertAmount(amt, from, to, rates, base);
    if (!Number.isFinite(n)) {
      setResult('');
      return;
    }
    setResult(formatCurrency(n, to));
  }, [amountInput, from, to, rates, base]);

  // Debounce changes
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setDebouncing(true);
    debounceTimer.current = setTimeout(() => {
      compute();
      setDebouncing(false);
    }, 250);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [amountInput, from, to, compute]);

  // Persist state
  useEffect(() => {
    persistSelection({ amount: amountInput, from, to });
  }, [amountInput, from, to]);

  // When symbols/rates load initially, ensure we have valid codes
  useEffect(() => {
    const codes = new Set(Object.keys(symbols || {}));
    const safeFrom = codes.has(from) ? from : defaultBaseCurrency;
    const safeTo = codes.has(to) ? to : 'EUR';
    if (safeFrom !== from) setFrom(safeFrom);
    if (safeTo !== to) setTo(safeTo);
  }, [symbols, from, to]);

  const onSwap = useCallback(() => {
    setFrom((f) => {
      const newFrom = to;
      setTo(f);
      return newFrom;
    });
  }, [to]);

  // Formatting last updated time
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '—';
    try {
      const d = new Date(lastUpdated);
      return d.toLocaleString();
    } catch {
      return String(lastUpdated);
    }
  }, [lastUpdated]);

  // UI classes from theme
  const rowCls = 'conv-row';
  const inputCls = 'conv-input';
  const selectCls = 'conv-select';
  const resultCls = 'conv-result';
  const muted = 'muted';

  return (
    <section className="converter">
      {loading && (
        <div className="placeholder" role="status" aria-live="polite">
          <p>Loading symbols and rates…</p>
        </div>
      )}

      {error && !loading && (
        <div className="placeholder" role="alert">
          <p>Unable to load rates: {error.message || 'Unknown error'}</p>
          <button className="btn" onClick={refresh}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={rowCls}>
            <label htmlFor="amount" className="sr-only">Amount</label>
            <input
              id="amount"
              className={inputCls}
              type="text"
              inputMode="decimal"
              placeholder="Enter amount"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
          <div className={rowCls} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center' }}>
            <div>
              <label htmlFor="from" className="sr-only">From currency</label>
              <select
                id="from"
                className={selectCls}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="From currency"
              >
                {currencyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-ghost" onClick={onSwap} aria-label="Swap currencies" title="Swap">
              ⇄
            </button>

            <div>
              <label htmlFor="to" className="sr-only">To currency</label>
              <select
                id="to"
                className={selectCls}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="To currency"
              >
                {currencyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={resultCls} aria-live="polite" aria-atomic="true">
            {debouncing ? 'Calculating…' : (result || '—')}
          </div>

          <div className={muted} style={{ fontSize: '0.85rem', marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="badge badge-neutral">Base: {base}</span>
            <span className="badge badge-blue">Last updated: {lastUpdatedLabel}{date ? ` • ${date}` : ''}</span>
            <button className="btn btn-ghost" onClick={refresh} title="Refresh rates">Refresh</button>
          </div>
        </>
      )}
    </section>
  );
}

// Component-scoped styles appended leveraging theme tokens.
const cvStyle = document.createElement('style');
cvStyle.innerHTML = `
.converter {
  display: grid;
  gap: 12px;
}
.conv-row { display: grid; gap: 8px; }
.conv-input, .conv-select {
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
.conv-input:focus, .conv-select:focus {
  outline: none;
  box-shadow: 0 0 0 4px var(--ring);
  border-color: color-mix(in srgb, var(--color-primary), var(--border) 70%);
}
.conv-result {
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background:
    radial-gradient(160px 80px at 100% -20%, rgba(37,99,235,0.08), transparent 60%),
    radial-gradient(160px 80px at 0% -20%, rgba(245,158,11,0.10), transparent 60%),
    color-mix(in srgb, var(--surface), transparent 2%);
  box-shadow: var(--shadow);
  font-weight: 700;
  font-size: 1.05rem;
  min-height: 48px;
  display: flex;
  align-items: center;
}
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`;
document.head.appendChild(cvStyle);
