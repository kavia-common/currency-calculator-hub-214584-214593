/**
 * PUBLIC_INTERFACE
 * RateBadge
 * Small visual tag for a currency rate. Shows 1 BASE = rate CODE informational badge.
 *
 * Props:
 * - code: string - currency code (e.g., EUR)
 * - rate: number - rate value relative to base
 */
import React, { useMemo } from 'react';
import { formatNumberCompact } from '../utils/currency';

export default function RateBadge({ code, rate }) {
  const label = useMemo(() => {
    if (!(typeof rate === 'number' && Number.isFinite(rate))) return '—';
    return formatNumberCompact(rate);
  }, [rate]);

  return (
    <span className="rate-badge" title={`Rate: ${rate}`}>
      <span className="rb-code">{code}</span>
      <span className="rb-dot" aria-hidden="true">•</span>
      <span className="rb-val">{label}</span>
    </span>
  );
}

// Minimal styles using theme tokens
const rbStyle = document.createElement('style');
rbStyle.innerHTML = `
.rate-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid var(--border);
  color: var(--text);
  background: color-mix(in srgb, var(--surface), transparent 6%);
  box-shadow: var(--shadow-sm);
}
.rate-badge .rb-code { color: var(--text); opacity: 0.9; }
.rate-badge .rb-val { color: var(--text); opacity: 0.9; }
.rate-badge .rb-dot { opacity: 0.5; }
`;
document.head.appendChild(rbStyle);
