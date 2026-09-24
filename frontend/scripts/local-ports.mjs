/**
 * Training App local frontend ports. Documented in docs/frontend/local-environment.md.
 * Both servers use strictPort: an occupied port fails instead of drifting.
 */
export const TRAINING_DEV_PORT = 5173;

/** `vite preview` and the canonical Playwright suite. */
export const TRAINING_PREVIEW_PORT = 4173;

/** Non-secret identity marker served in index.html (`<meta name="app-id">`). */
export const TRAINING_APP_ID = 'training-app';
