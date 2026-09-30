import boxen from 'boxen';
import { isEventCatalogScaleEnabled, isEventCatalogStarterEnabled } from '@eventcatalog/license';
import { getTrialStatus, LICENSE_REMINDER_DAYS, TRIAL_LENGTH_DAYS } from '../../eventcatalog/src/utils/trial';
import {
  getCommercialLicenseStatus,
  getLicenseStatus as getCatalogLicenseStatus,
  LICENSE_FAQ_URL,
  LICENSE_RENEW_URL,
  type LicensePlan,
  type LicenseStatus,
} from '../../eventcatalog/src/utils/license';

export type { LicenseStatus };

const isPlanEnabled = async (check: () => Promise<boolean>) => {
  // An expired or invalid license.jwt is logged by the license package; the license status reports it instead
  const consoleError = console.error;
  console.error = () => {};
  try {
    return await check();
  } catch {
    return false;
  } finally {
    console.error = consoleError;
  }
};

/**
 * The Scale or Starter plan from its license key (EVENTCATALOG_SCALE_LICENSE_KEY or
 * EVENTCATALOG_STARTER_LICENSE_KEY), verified by the license package, which shows its own box.
 */
const checkPlanLicense = async (): Promise<LicensePlan | undefined> => {
  if (await isPlanEnabled(isEventCatalogScaleEnabled)) return 'scale';
  if (await isPlanEnabled(isEventCatalogStarterEnabled)) return 'starter';
};

/**
 * The catalog's license: a commercial license (license.jwt) first, falling back to a Scale or
 * Starter license key. The plan is passed on to Astro (see getLicensePlan) through the environment.
 */
export const getLicenseStatus = async (projectDirectory: string): Promise<LicenseStatus> => {
  const license = await getCommercialLicenseStatus(projectDirectory);
  const plan = license.state === 'licensed' ? undefined : await checkPlanLicense();
  process.env.EVENTCATALOG_SCALE = String(plan === 'scale');
  process.env.EVENTCATALOG_STARTER = String(plan === 'starter');
  return getCatalogLicenseStatus(projectDirectory);
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getLicenseType = (license: LicenseStatus) => {
  if (license.state === 'licensed') return 'commercial';
  if (license.state === 'plan') return license.plan;
  return 'trial';
};

/**
 * License fields for build telemetry: a commercial license (a valid license.jwt), a Scale or
 * Starter plan, or the trial, and when each expires (unix ms, like `tsd`).
 */
export const getLicenseAnalytics = (license: LicenseStatus = { state: 'none' }, tsd?: unknown) => ({
  license: getLicenseType(license),
  licenseState: license.state === 'licensed' || license.state === 'plan' ? 'valid' : license.state,
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
    const licensedTo = license.org ? `Licensed to ${license.org}` : 'Licensed';
    if (daysLeft < LICENSE_REMINDER_DAYS) {
      return {
        title: 'EventCatalog Commercial License',
        color: 'yellow',
        text: [
          licensedTo,
          `Your license expires in ${formatDays(daysLeft)}, on ${formatDate(license.expiresAt)}.`,
          `Renew it to keep using EventCatalog commercially: ${LICENSE_RENEW_URL}`,
        ].join('\n'),
      };
    }
    return {
      title: 'EventCatalog Commercial License',
      color: 'green',
      text: `${licensedTo}\nValid until ${formatDate(license.expiresAt)} (${formatDays(daysLeft)} left)`,
    };
  }

  // The license package shows its own box for a Scale or Starter plan
  if (license.state === 'plan') return;

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

  if (license.state === 'expired') {
    const expiredOn = license.expiresAt
      ? `expired on ${formatDate(license.expiresAt)} (${formatDays(Math.floor((now - license.expiresAt.getTime()) / DAY_IN_MS))} ago)`
      : 'has expired';
    return {
      title: 'EventCatalog License Expired',
      color: 'yellow',
      text: [
        `Your EventCatalog commercial license${license.org ? ` for ${license.org}` : ''} ${expiredOn}.`,
        `Renew it to keep using EventCatalog commercially: ${LICENSE_RENEW_URL}`,
        trialLine,
        `Learn about licensing: ${LICENSE_FAQ_URL}`,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  return {
    title: 'EventCatalog license',
    color: 'yellow',
    text: [`Your license.jwt could not be verified: ${license.reason}.`, trialLine, `Learn about licensing: ${LICENSE_FAQ_URL}`]
      .filter(Boolean)
      .join('\n'),
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
