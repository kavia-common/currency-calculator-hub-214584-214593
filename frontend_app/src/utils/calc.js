//
// Calculator core logic helpers - safe math without eval
// Supports sequential operations, clear, delete, and keyboard-friendly updates.
// Designed to be pure and easily testable.
//

/**
 * Normalize a numeric string:
 * - Remove leading zeros unless before decimal
 * - Ensure only one decimal point
 * - Keep a leading '-' if present
 * @param {string} s
 * @returns {string}
 */
function normalizeNumberString(s) {
  if (typeof s !== 'string') return '0';
  let out = s.trim();

  // handle sign
  let sign = '';
  if (out.startsWith('-')) {
    sign = '-';
    out = out.slice(1);
  }

  // remove non-numeric except single dot
  out = out.replace(/[^0-9.]/g, '');

  // ensure single dot
  const parts = out.split('.');
  if (parts.length > 2) {
    out = parts.shift() + '.' + parts.join('');
  }

  // remove leading zeros (keep at least one; preserve if "0." prefix)
  if (out.startsWith('.')) out = '0' + out;
  const [intPart, decPart] = out.split('.');
  const intNorm = intPart.replace(/^0+(?=\d)/, '') || '0';
  out = decPart !== undefined ? `${intNorm}.${decPart}` : intNorm;

  // re-add sign unless value is 0 or 0.xxx
  if (sign && out !== '0' && !out.startsWith('0.')) {
    return sign + out;
  }
  if (sign && out.startsWith('0.') && out !== '0') {
    // -0.x allowed
    return '-' + out;
  }
  return out;
}

/**
 * Execute a binary operation with safe guards.
 * @param {'+'|'-'|'*'|'/'} op
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function operate(op, a, b) {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if (b === 0) {
        // Represent divide-by-zero as Infinity and let caller map to message
        return Infinity;
      }
      return a / b;
    default:
      return b;
  }
}

/**
 * Format a number for display, limiting precision to avoid long floats.
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  if (!isFinite(n)) return '∞';
  // Avoid scientific for reasonable ranges
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  if (abs >= 1e12 || abs < 1e-6) {
    // fallback to toPrecision
    return n.toPrecision(10).replace(/\.?0+$/,'');
  }
  // limit decimals to 10 to avoid long tails
  const str = String(+n.toFixed(10));
  return str.replace(/\.?0+$/,'');
}

/**
 * PUBLIC_INTERFACE
 * createCalcState
 * Create initial calculator state object.
 * @returns {{
 *   display: string,
 *   accumulator: number | null,
 *   operator: null | '+'|'-'|'*'|'/',
 *   entering: boolean,
 *   error: string | null
 * }}
 */
export function createCalcState() {
  return {
    display: '0',
    accumulator: null,
    operator: null,
    entering: false,
    error: null,
  };
}

/**
 * PUBLIC_INTERFACE
 * inputDigit
 * Handle a numeric digit press.
 * @param {ReturnType<typeof createCalcState>} state
 * @param {string} digit single char '0'-'9'
 */
export function inputDigit(state, digit) {
  if (state.error) return state; // ignore input on error until cleared
  if (!/^[0-9]$/.test(digit)) return state;

  let next = state.display;
  if (!state.entering) {
    // start new input
    next = digit === '0' ? '0' : digit;
  } else {
    // append
    if (next === '0') next = digit; else next += digit;
  }

  return {
    ...state,
    display: normalizeNumberString(next),
    entering: true,
  };
}

/**
 * PUBLIC_INTERFACE
 * inputDecimal
 * Add a decimal point to the current number.
 * @param {ReturnType<typeof createCalcState>} state
 */
export function inputDecimal(state) {
  if (state.error) return state;
  let next = state.display;
  if (!state.entering) {
    next = '0.';
  } else if (!next.includes('.')) {
    next = next + '.';
  }
  return {
    ...state,
    display: normalizeNumberString(next),
    entering: true,
  };
}

/**
 * PUBLIC_INTERFACE
 * clearAll
 * Reset calculator to initial state.
 */
export function clearAll() {
  return createCalcState();
}

/**
 * PUBLIC_INTERFACE
 * deleteLast
 * Delete last character of current entry.
 * @param {ReturnType<typeof createCalcState>} state
 */
export function deleteLast(state) {
  if (state.error) return state;
  if (!state.entering) {
    return { ...state, display: '0' };
  }
  const s = state.display;
  const next = s.length <= 1 ? '0' : s.slice(0, -1);
  return {
    ...state,
    display: normalizeNumberString(next),
  };
}

/**
 * INTERNAL
 * Commit current display number into accumulator with op if exists.
 */
function commitPending(state) {
  const b = Number(state.display);
  if (state.accumulator === null || state.operator === null) {
    return { ...state, accumulator: b };
  }
  const result = operate(state.operator, state.accumulator, b);
  if (!isFinite(result)) {
    return {
      ...state,
      display: 'Cannot divide by zero',
      error: 'DIV_ZERO',
      accumulator: null,
      operator: null,
      entering: false,
    };
  }
  return {
    ...state,
    accumulator: result,
    display: formatNumber(result),
    entering: false,
  };
}

/**
 * PUBLIC_INTERFACE
 * setOperator
 * Handle operator press (+, -, ×, ÷).
 * Applies sequential operations by committing pending operation first.
 * @param {ReturnType<typeof createCalcState>} state
 * @param {'+'|'-'|'*'|'/'} op
 */
export function setOperator(state, op) {
  if (state.error) return state;
  // Commit any pending with current display
  const committed = commitPending(state);
  if (committed.error) return committed;

  return {
    ...committed,
    operator: op,
    entering: false,
  };
}

/**
 * PUBLIC_INTERFACE
 * equals
 * Evaluate current expression.
 * @param {ReturnType<typeof createCalcState>} state
 */
export function equals(state) {
  if (state.error) return state;
  if (state.operator === null || state.accumulator === null) {
    // just normalize current display
    return {
      ...state,
      display: normalizeNumberString(state.display),
      entering: false,
    };
  }
  // commit with current display
  const committed = commitPending(state);
  if (committed.error) return committed;

  // Clear operator and keep result as accumulator for potential next ops
  return {
    ...committed,
    operator: null,
    entering: false,
  };
}

/**
 * PUBLIC_INTERFACE
 * inputKey
 * High-level keyboard handler mapping keys to actions.
 * @param {ReturnType<typeof createCalcState>} state
 * @param {string} key
 */
export function inputKey(state, key) {
  if (key >= '0' && key <= '9') return inputDigit(state, key);
  if (key === '.' || key === ',') return inputDecimal(state);
  if (key === 'Escape' || key.toLowerCase() === 'c') return clearAll();
  if (key === 'Backspace' || key.toLowerCase() === 'd') return deleteLast(state);
  if (key === '+' ) return setOperator(state, '+');
  if (key === '-' ) return setOperator(state, '-');
  if (key === '*' ) return setOperator(state, '*');
  if (key === '/' ) return setOperator(state, '/');
  if (key === 'Enter' || key === '=') return equals(state);
  return state;
}
