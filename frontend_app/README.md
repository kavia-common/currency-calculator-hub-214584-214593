# Currency Calculator Hub — Frontend App

A lightweight React (Create React App) UI that provides:
- A calculator
- A currency converter
- A daily exchange rates view (using public API fallback or a configured backend)

## Run locally

- Install dependencies:
  - npm: `npm install`
  - yarn: `yarn`

- Start in development mode:
  - npm: `npm start`
  - yarn: `yarn start`
  - App URL: http://localhost:3000

- Run tests:
  - npm: `npm test`
  - yarn: `yarn test`

- Build for production:
  - npm: `npm run build`
  - yarn: `yarn build`

## Environment variables

Set variables in a `.env` file at the project root (must be prefixed with REACT_APP_ to be exposed to the browser in Create React App).

- REACT_APP_API_BASE
  - Description: Preferred base URL for the API the frontend should call (e.g., https://api.example.com).
  - Used first when resolving API calls.

- REACT_APP_BACKEND_URL
  - Description: Alternate/secondary base URL for the backend. Used if REACT_APP_API_BASE is not set.

- REACT_APP_FEATURE_FLAGS
  - Description: Comma-separated flags parsed into an object. Examples:
    - "alpha,beta" => { alpha: true, beta: true }
    - "alpha=true,beta=false,gamma" => { alpha: true, beta: false, gamma: true }

- REACT_APP_EXPERIMENTS_ENABLED
  - Description: Enables experimental features. Accepted truthy values: 1,true,yes,on,y (case-insensitive). Default: false.

- REACT_APP_LOG_LEVEL
  - Description: Log level for client-side logs. One of: trace, debug, info, warn, error, silent. Default: info.

- REACT_APP_NEXT_TELEMETRY_DISABLED
  - Description: When true, telemetry is disabled. Accepted truthy values: 1,true,yes,on,y. Default: false.

Additional (present in this container):
- REACT_APP_FRONTEND_URL
- REACT_APP_WS_URL
- REACT_APP_NODE_ENV
- REACT_APP_ENABLE_SOURCE_MAPS
- REACT_APP_PORT
- REACT_APP_TRUST_PROXY
- REACT_APP_HEALTHCHECK_PATH

These may be used by tooling or deployment environments. Only REACT_APP_* variables are exposed to the React bundle.

## API base resolution and public fallback

The app resolves its API base in this order:
1) REACT_APP_API_BASE (if set)
2) REACT_APP_BACKEND_URL (if set)
3) Fallback to window.location.origin

If the effective base points to the same origin as the frontend (or no env is set), the app will use a public API fallback for currency data:
- https://api.exchangerate.host

This allows the app to function locally without a dedicated backend. To force calls to your own backend, set REACT_APP_API_BASE (or REACT_APP_BACKEND_URL) to a different origin that exposes compatible endpoints:
- GET /latest?base=USD
- GET /symbols
