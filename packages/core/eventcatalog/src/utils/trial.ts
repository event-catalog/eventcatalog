export const TRIAL_LENGTH_DAYS = 90;

export const LICENSE_FAQ_URL = 'https://www.eventcatalog.dev/license-faq';

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

// A licensed catalog only shows its license in the dev header when it's about to expire
export const LICENSE_REMINDER_DAYS = 14;

/**
 * Days left on the license, once fewer than LICENSE_REMINDER_DAYS remain. Undefined before then.
 */
export const getLicenseDaysLeft = (licensedUntil: Date, now = Date.now()): number | undefined => {
  const daysLeft = Math.max(0, Math.ceil((licensedUntil.getTime() - now) / DAY_IN_MS));
  return daysLeft < LICENSE_REMINDER_DAYS ? daysLeft : undefined;
};
