export const TRIAL_LENGTH_DAYS = 90;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type TrialStatus = {
  daysLeft: number;
  ended: boolean;
  endsAt: Date;
};

/**
 * The trial started at `tsd` (unix ms, written to eventcatalog.config.js when the catalog was
 * created) and lasts TRIAL_LENGTH_DAYS. Undefined when there is no valid start date.
 */
export const getTrialStatus = (tsd: unknown, now = Date.now()): TrialStatus | undefined => {
  if (typeof tsd !== 'number' || !Number.isFinite(tsd) || tsd <= 0) return;
  const endsAt = tsd + TRIAL_LENGTH_DAYS * DAY_IN_MS;
  const daysLeft = Math.max(0, Math.ceil((endsAt - now) / DAY_IN_MS));
  return { daysLeft, ended: daysLeft === 0, endsAt: new Date(endsAt) };
};
