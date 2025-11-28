import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCalcState, inputDigit, inputDecimal, clearAll, deleteLast, setOperator, equals, inputKey } from '../utils/calc';

/**
 * PUBLIC_INTERFACE
 * Calculator
 * A11y-friendly calculator component with keyboard support.
 * - Digits 0-9, decimal
 * - C (clear), DEL (delete)
 * - Operators: +, -, ×, ÷
 * - Equals =
 *
 * Props: none
 * Returns: <section> element rendering the calculator UI
 */
export default function Calculator() {
  const [state, setState] = useState(() => createCalcState());
  const containerRef = useRef(null);

  // keyboard handling when focused inside calculator
  const onKeyDown = useCallback((e) => {
    // Prevent page scroll on space etc. for calculator keys
    const prev = state;
    const next = inputKey(prev, e.key);
    if (next !== prev) {
      e.preventDefault();
      setState(next);
    }
  }, [state]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  // Actions
  const pressDigit = useCallback((d) => setState((s) => inputDigit(s, d)), []);
  const pressDecimal = useCallback(() => setState((s) => inputDecimal(s)), []);
  const pressClear = useCallback(() => setState(() => clearAll()), []);
  const pressDelete = useCallback(() => setState((s) => deleteLast(s)), []);
  const pressOp = useCallback((op) => setState((s) => setOperator(s, op)), []);
  const pressEquals = useCallback(() => setState((s) => equals(s)), []);

  // Accessible label for current expression state
  const liveLabel = useMemo(() => {
    if (state.error) return state.display;
    const parts = [];
    if (state.accumulator !== null) parts.push(`${state.accumulator}`);
    if (state.operator) {
      const map = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' };
      parts.push(map[state.operator] || state.operator);
    }
    parts.push(state.display);
    return parts.join(' ');
  }, [state]);

  // Style hooks from theme
  const boxCls = 'calc-box';
  const screenCls = 'calc-screen';
  const gridCls = 'calc-grid';
  const btnCls = 'btn';
  const btnPrimary = 'btn-primary';

  return (
    <section
      ref={containerRef}
      className={boxCls}
      role="group"
      aria-label="Calculator"
      tabIndex={0}
      style={{
        outline: 'none'
      }}
    >
      {/* Display */}
      <div className={screenCls} aria-live="polite" aria-atomic="true">
        {state.display}
      </div>
      <div className="sr-only" aria-live="polite">{liveLabel}</div>

      {/* Keypad */}
      <div className={gridCls}>
        {/* Row: C, DEL, ÷ */}
        <button className={`${btnCls} btn-ghost`} onClick={pressClear} aria-label="Clear" title="Clear (C)">
          C
        </button>
        <button className={`${btnCls} btn-ghost`} onClick={pressDelete} aria-label="Delete" title="Delete (Backspace)">
          DEL
        </button>
        <button className={`${btnCls} btn-ghost`} onClick={() => pressOp('/')} aria-label="Divide" title="Divide (/)">
          ÷
        </button>

        {/* Row: 7 8 9 × */}
        <button className={btnCls} onClick={() => pressDigit('7')} aria-label="Seven">7</button>
        <button className={btnCls} onClick={() => pressDigit('8')} aria-label="Eight">8</button>
        <button className={btnCls} onClick={() => pressDigit('9')} aria-label="Nine">9</button>
        <button className={`${btnCls} btn-ghost`} onClick={() => pressOp('*')} aria-label="Multiply" title="Multiply (*)">×</button>

        {/* Row: 4 5 6 − */}
        <button className={btnCls} onClick={() => pressDigit('4')} aria-label="Four">4</button>
        <button className={btnCls} onClick={() => pressDigit('5')} aria-label="Five">5</button>
        <button className={btnCls} onClick={() => pressDigit('6')} aria-label="Six">6</button>
        <button className={`${btnCls} btn-ghost`} onClick={() => pressOp('-')} aria-label="Subtract" title="Subtract (-)">−</button>

        {/* Row: 1 2 3 + */}
        <button className={btnCls} onClick={() => pressDigit('1')} aria-label="One">1</button>
        <button className={btnCls} onClick={() => pressDigit('2')} aria-label="Two">2</button>
        <button className={btnCls} onClick={() => pressDigit('3')} aria-label="Three">3</button>
        <button className={`${btnCls} btn-ghost`} onClick={() => pressOp('+')} aria-label="Add" title="Add (+)">+</button>

        {/* Row: 0 . = */}
        <button className={`${btnCls} span-2`} onClick={() => pressDigit('0')} aria-label="Zero">0</button>
        <button className={btnCls} onClick={pressDecimal} aria-label="Decimal point">.</button>
        <button className={`${btnCls} ${btnPrimary}`} onClick={pressEquals} aria-label="Equals" title="Equals (Enter)">
          =
        </button>
      </div>
    </section>
  );
}

/* Minimal component-scoped styles appended here to leverage existing theme tokens.
   Could be moved to App.css if preferred. */
const styleTag = document.createElement('style');
styleTag.innerHTML = `
.calc-box {
  display: grid;
  gap: 12px;
}

.calc-screen {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 1.6rem;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--surface), transparent 4%);
  border: 1px solid var(--border);
  text-align: right;
  box-shadow: var(--shadow-sm);
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.calc-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 10px;
}

.calc-grid .btn.span-2 {
  grid-column: span 2;
}
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`;
document.head.appendChild(styleTag);
