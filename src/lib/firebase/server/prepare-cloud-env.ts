/**
 * Must run before firebase-admin / google-auth load.
 * Firebase deploy copies root `.env` into Cloud Run; a local-only
 * GOOGLE_APPLICATION_CREDENTIALS path breaks ADC token refresh.
 */
function isCloudRuntime(): boolean {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.FIREBASE_CONFIG ||
      process.env.__FIREBASE_FRAMEWORKS_ENTRY__ ||
      process.env.__FIREBASE_DEFAULTS__
  );
}

if (isCloudRuntime() && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}
