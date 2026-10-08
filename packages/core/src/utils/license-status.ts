import boxen from 'boxen';
import pc from 'picocolors';
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

type Row = [label: string, value: string];

/**
 * What the license box says: a headline, the facts as aligned rows ("Licensed to  acme"), and links on their own
 * rows, so it can be read at a glance. `text` is the box's content without colours.
 */
export type LicenseStatusMessage = {
  title: string;
  color: 'green' | 'yellow';
  headline: string;
  rows: Row[];
  links: Row[];
  text: string;
};

type Colours = { bold: (text: string) => string; dim: (text: string) => string; link: (text: string) => string };
const PLAIN: Colours = { bold: (text) => text, dim: (text) => text, link: (text) => text };
const COLOURS: Colours = { bold: pc.bold, dim: pc.dim, link: (text) => pc.cyan(text) };

const render = ({ headline, rows, links }: Omit<LicenseStatusMessage, 'text' | 'title' | 'color'>, colours: Colours) => {
  const width = Math.max(0, ...[...rows, ...links].map(([label]) => label.length));
  const row = ([label, value]: Row) => `${colours.dim(label.padEnd(width))}  ${value}`;
  return [
    colours.bold(headline),
    ...(rows.length ? ['', ...rows.map(row)] : []),
    ...(links.length ? ['', ...links.map(([label, url]) => row([label, colours.link(url)]))] : []),
  ].join('\n');
};

const message = (content: Omit<LicenseStatusMessage, 'text'>): LicenseStatusMessage => ({
  ...content,
  text: render(content, PLAIN),
});

/** The trial, as a row: how long it has left, or when it ended */
const getTrialRow = (tsd: unknown, now: number): Row | undefined => {
  const trial = getTrialStatus(tsd, now);
  if (!trial) return;
  return [
    'Trial',
    trial.ended
      ? `Ended ${formatDate(trial.endsAt)}`
      : `${formatDays(trial.daysLeft)} left of ${TRIAL_LENGTH_DAYS} (ends ${formatDate(trial.endsAt)})`,
  ];
};

/**
 * The license (or trial) box for the terminal. Undefined when there's nothing to show.
 */
export const getLicenseStatusMessage = (
  license: LicenseStatus,
  tsd: unknown,
  now = Date.now()
): LicenseStatusMessage | undefined => {
  const licensing: Row = ['Licensing', LICENSE_FAQ_URL];
  const renew: Row = ['Renew', LICENSE_RENEW_URL];
  const licensedTo: Row[] = 'org' in license && license.org ? [['Licensed to', license.org]] : [];

  if (license.state === 'licensed') {
    const daysLeft = Math.max(0, Math.ceil((license.expiresAt.getTime() - now) / DAY_IN_MS));
    if (daysLeft < LICENSE_REMINDER_DAYS) {
      return message({
        title: 'EventCatalog license',
        color: 'yellow',
        headline: `Your commercial license expires in ${formatDays(daysLeft)}`,
        rows: [...licensedTo, ['Expires', formatDate(license.expiresAt)]],
        links: [renew],
      });
    }
    return message({
      title: 'EventCatalog license',
      color: 'green',
      headline: 'Commercial license active',
      rows: [...licensedTo, ['Valid until', `${formatDate(license.expiresAt)} (${formatDays(daysLeft)} left)`]],
      links: [],
    });
  }

  // The license package shows its own box for a Scale or Starter plan
  if (license.state === 'plan') return;

  const trialRow = getTrialRow(tsd, now);
  const trialRows = trialRow ? [trialRow] : [];

  if (license.state === 'none') {
    const trial = getTrialStatus(tsd, now);
    if (!trial || !trialRow) return;
    return message({
      title: 'EventCatalog trial',
      color: trial.ended ? 'yellow' : 'green',
      headline: trial.ended ? 'Your EventCatalog trial has ended' : `You're on the ${TRIAL_LENGTH_DAYS}-day EventCatalog trial`,
      rows: trialRows,
      links: trial.ended ? [['Get a license', LICENSE_RENEW_URL], licensing] : [licensing],
    });
  }

  if (license.state === 'expired') {
    const expiredOn = license.expiresAt
      ? [
          [
            'Expired',
            `${formatDate(license.expiresAt)} (${formatDays(Math.floor((now - license.expiresAt.getTime()) / DAY_IN_MS))} ago)`,
          ] as Row,
        ]
      : [];
    return message({
      title: 'EventCatalog license',
      color: 'yellow',
      headline: 'Your commercial license has expired',
      rows: [...licensedTo, ...expiredOn, ...trialRows],
      links: [renew, licensing],
    });
  }

  return message({
    title: 'EventCatalog license',
    color: 'yellow',
    headline: "Your license.jwt couldn't be verified",
    rows: [['Reason', license.reason.charAt(0).toUpperCase() + license.reason.slice(1)], ...trialRows],
    links: [licensing],
  });
};

export const printLicenseStatus = (license: LicenseStatus, tsd: unknown) => {
  const status = getLicenseStatusMessage(license, tsd);
  if (!status) return;

  console.log(
    boxen(render(status, COLOURS), {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      margin: 1,
      borderStyle: 'round',
      borderColor: status.color,
      title: status.title,
      titleAlignment: 'left',
    })
  );
};
