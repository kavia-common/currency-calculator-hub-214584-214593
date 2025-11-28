//
// Centralized environment configuration helpers for the React app.
// Provides normalized accessors and feature/telemetry/log-level parsing.
//
// All environment variables must be prefixed with REACT_APP_ to be exposed
// in the bundled frontend (Create React App constraint).
//

/**
 * Internal: resolve a string env var safely.
 * @param {string | undefined} v
 * @returns {string | undefined}
 */
function str(v) {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Internal: boolean parser accepting common truthy values.
 * @param {string | undefined} v
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
function parseBool(v, defaultValue = false) {
  if (typeof v !== 'string') return defaultValue;
  const val = v.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'y'].includes(val);
}

/**
 * Internal: Parse comma-separated feature flags into normalized object form.
 * Examples:
 *  - "a,b" => { a: true, b: true }
 *  - "a=true,b=false,c" => { a: true, b: false, c: true }
 *
 * Empty input => {}
 * Malformed tokens are ignored.
 *
 * @param {string | undefined} flags
 * @returns {Record<string, boolean>}
 */
function parseFeatureFlags(flags) {
  const out = {};
  const src = str(flags);
  if (!src) return out;

  for (const rawToken of src.split(',')) {
    const token = rawToken.trim();
    if (!token) continue;

    // support key=value
    const eqIdx = token.indexOf('=');
    if (eqIdx > -1) {
      const key = token.slice(0, eqIdx).trim();
      const val = token.slice(eqIdx + 1).trim().toLowerCase();
      if (!key) continue;
      if (['1', 'true', 'yes', 'on', 'y'].includes(val)) out[key] = true;
      else if (['0', 'false', 'no', 'off', 'n'].includes(val)) out[key] = false;
      else out[key] = true; // default truthy if unknown value
      continue;
    }

    // bare key -> true
    out[token] = true;
  }

  return out;
}

/**
 * Internal: get environment map, guarded for tests where process may be redefined.
 */
function getEnv() {
  try {
    // eslint-disable-next-line no-undef
    return typeof process !== 'undefined' && process && process.env ? process.env : {};
  } catch {
    return {};
  }
}

/**
 * PUBLIC_INTERFACE
 * getBaseUrl
 * Resolve API base URL from environment with sensible fallback:
 * - Prefer REACT_APP_API_BASE
 * - Then REACT_APP_BACKEND_URL
 * - Fallback to window.location.origin (with dev-time warning)
 *
 * In test environments, window may not be defined; fallback becomes "http://localhost".
 *
 * @returns {string} Base URL string (no trailing slash normalization applied)
 */
export function getBaseUrl() {
  const env = getEnv();
  const fromApiBase = str(env.REACT_APP_API_BASE);
  const fromBackend = str(env.REACT_APP_BACKEND_URL);

  if (fromApiBase) return fromApiBase;
  if (fromBackend) return fromBackend;

  // Fallback to window.location.origin for browser runtime
  let origin = 'http://localhost';
  if (typeof window !== 'undefined' && window?.location?.origin) {
    origin = window.location.origin;
  }

  // Emit dev-time warning only in development to avoid noisy logs in prod.
  const isDev = str(env.NODE_ENV) === 'development' || str(env.REACT_APP_NODE_ENV) === 'development';
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(
      '[env] Missing REACT_APP_API_BASE/REACT_APP_BACKEND_URL. Falling back to window.location.origin:',
      origin
    );
  }
  return origin;
}

/**
 * PUBLIC_INTERFACE
 * getFeatureFlags
 * Parses REACT_APP_FEATURE_FLAGS into an object map.
 * Example env: "alpha,beta=false,gamma=true"
 *
 * @returns {Record<string, boolean>}
 */
export function getFeatureFlags() {
  const env = getEnv();
  return parseFeatureFlags(env.REACT_APP_FEATURE_FLAGS);
}

/**
 * PUBLIC_INTERFACE
 * isExperimentsEnabled
 * Reads REACT_APP_EXPERIMENTS_ENABLED as boolean. Defaults to false.
 *
 * @returns {boolean}
 */
export function isExperimentsEnabled() {
  const env = getEnv();
  return parseBool(env.REACT_APP_EXPERIMENTS_ENABLED, false);
}

/**
 * PUBLIC_INTERFACE
 * isTelemetryDisabled
 * Reads REACT_APP_NEXT_TELEMETRY_DISABLED to determine whether telemetry is disabled.
 * True means telemetry is disabled.
 * Defaults to false.
 *
 * @returns {boolean}
 */
export function isTelemetryDisabled() {
  const env = getEnv();
  return parseBool(env.REACT_APP_NEXT_TELEMETRY_DISABLED, false);
}

/**
 * PUBLIC_INTERFACE
 * getLogLevel
 * Returns normalized log level string from REACT_APP_LOG_LEVEL.
 * Accepted common values: 'trace','debug','info','warn','error','silent'
 * Defaults to 'info'.
 *
 * @returns {'trace'|'debug'|'info'|'warn'|'error'|'silent'}
 */
export function getLogLevel() {
  const env = getEnv();
  const raw = str(env.REACT_APP_LOG_LEVEL)?.toLowerCase();
  const allowed = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];
  if (raw && allowed.includes(raw)) return raw;
  return 'info';
}

/**
 * PUBLIC_INTERFACE
 * getEnvSummary
 * Convenience helper for diagnostics and debugging. Not recommended for production logging.
 *
 * @returns {{
 *   baseUrl: string,
 *   featureFlags: Record<string, boolean>,
 *   experiments: boolean,
 *   telemetryDisabled: boolean,
 *   logLevel: string
 * }}
 */
export function getEnvSummary() {
  return {
    baseUrl: getBaseUrl(),
    featureFlags: getFeatureFlags(),
    experiments: isExperimentsEnabled(),
    telemetryDisabled: isTelemetryDisabled(),
    logLevel: getLogLevel(),
  };
}
