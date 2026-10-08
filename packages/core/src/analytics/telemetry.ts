/** How long a telemetry request may take before it is aborted. */
export const TELEMETRY_REQUEST_TIMEOUT_MS = 2000;

type TelemetryConfig = {
  telemetry?: boolean;
};

type TelemetryEnv = {
  EVENTCATALOG_TELEMETRY_DISABLED?: string;
  DO_NOT_TRACK?: string;
};

const isOptOutEnvValue = (value: string | undefined): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
};

/**
 * Anonymous telemetry is on unless the catalog opts out.
 * Opt out with EVENTCATALOG_TELEMETRY_DISABLED or DO_NOT_TRACK set to "1" or "true"
 * (any case), or with telemetry: false in eventcatalog.config.js.
 *
 * packages/create-eventcatalog/templates/telemetry.ts copies the env rules and
 * TELEMETRY_REQUEST_TIMEOUT_MS. Keep that copy in sync.
 */
export const isTelemetryDisabled = (config: TelemetryConfig | null | undefined, env: TelemetryEnv): boolean => {
  if (isOptOutEnvValue(env.EVENTCATALOG_TELEMETRY_DISABLED)) return true;
  if (isOptOutEnvValue(env.DO_NOT_TRACK)) return true;
  return config?.telemetry === false;
};
