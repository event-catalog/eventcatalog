/**
 * Env-only copy of packages/core/src/analytics/telemetry.ts.
 * Keep the env rules and TELEMETRY_REQUEST_TIMEOUT_MS in sync.
 */
export const TELEMETRY_REQUEST_TIMEOUT_MS = 2000;

const isOptOutEnvValue = (value: string | undefined): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
};

export const isTelemetryDisabled = (env: NodeJS.ProcessEnv): boolean => {
  if (isOptOutEnvValue(env.EVENTCATALOG_TELEMETRY_DISABLED)) return true;
  if (isOptOutEnvValue(env.DO_NOT_TRACK)) return true;
  return false;
};
