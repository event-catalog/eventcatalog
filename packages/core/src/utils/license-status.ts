import boxen from 'boxen';
import { getTrialStatus, TRIAL_LENGTH_DAYS } from '../../eventcatalog/src/utils/trial';
import { getLicenseStatus, LICENSE_FAQ_URL, type LicenseStatus } from '../../eventcatalog/src/utils/license';

export { getLicenseStatus, type LicenseStatus };

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * License fields for build telemetry: a commercial license (a valid license.jwt) or the trial,
 * and when each expires (unix ms, like `tsd`).
 */
export const getLicenseAnalytics = (license: LicenseStatus = { state: 'none' }, tsd?: unknown) => ({
  license: license.state === 'licensed' ? 'commercial' : 'trial',
  licenseState: license.state === 'licensed' ? 'valid' : license.state,
  licenseExpiry: 'expiresAt' in license ? license.expiresAt?.getTime() : undefined,
  trialExpiry: getTrialStatus(tsd)?.endsAt.getTime(),
});

const formatDate = (date: Date) => date.toLocaleDateString(undefined, { dateStyle: 'medium' });
const formatDays = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

const getTrialLine = (tsd: unknown, now: number) => {
  const trial = getTrialStatus(tsd, now);
  if (!trial) return;
  return trial.ended
    ? `Your ${TRIAL_LENGTH_DAYS}-day EventCatalog trial ended on ${formatDate(trial.endsAt)}.`
    : `${formatDays(trial.daysLeft)} left of your ${TRIAL_LENGTH_DAYS}-day EventCatalog trial (ends ${formatDate(trial.endsAt)}).`;
};

/**
 * The license (or trial) box for the terminal. Undefined when there's nothing to show.
 */
export const getLicenseStatusMessage = (license: LicenseStatus, tsd: unknown, now = Date.now()) => {
  if (license.state === 'licensed') {
    const daysLeft = Math.max(0, Math.ceil((license.expiresAt.getTime() - now) / DAY_IN_MS));
    return {
      title: 'EventCatalog license',
      color: 'green',
      text: `${license.org ? `Licensed to ${license.org}` : 'Licensed'}\nValid until ${formatDate(license.expiresAt)} (${formatDays(daysLeft)} left)`,
    };
  }

  const trialLine = getTrialLine(tsd, now);

  if (license.state === 'none') {
    if (!trialLine) return;
    const ended = getTrialStatus(tsd, now)?.ended;
    return {
      title: 'EventCatalog trial',
      color: ended ? 'yellow' : 'green',
      text: `${trialLine}\nLearn about licensing: ${LICENSE_FAQ_URL}`,
    };
  }

  const warning =
    license.state === 'expired'
      ? `Your EventCatalog license ${license.expiresAt ? `expired on ${formatDate(license.expiresAt)}` : 'has expired'}.`
      : `Your license.jwt could not be verified: ${license.reason}.`;
  return {
    title: 'EventCatalog license',
    color: 'yellow',
    text: [warning, trialLine, `Learn about licensing: ${LICENSE_FAQ_URL}`].filter(Boolean).join('\n'),
  };
};

export const printLicenseStatus = (license: LicenseStatus, tsd: unknown) => {
  const message = getLicenseStatusMessage(license, tsd);
  if (!message) return;

  console.log(
    boxen(message.text, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: message.color,
      title: message.title,
      titleAlignment: 'center',
    })
  );
};
