import catalog from '@utils/eventcatalog-config/catalog';
import { isDevMode } from '@utils/feature';
import { getLicenseDaysLeft, getTrialStatus, TRIAL_LENGTH_DAYS } from '@utils/trial';
import { getLicenseStatus } from '@utils/license';
import { buildUrl } from '@utils/url-builder';

/** Where the license is, as the header badge and the banner across the top tell it */
export type LicenseNotice = {
  state: 'license-expired' | 'license-expiring' | 'trial-ended' | 'trial';
  /** Short, for the header badge, e.g. "License expired" */
  label: string;
  /** A sentence, for the banner and the badge's tooltip */
  message: string;
  /** Something needs doing: renew or buy */
  warning: boolean;
  /** What to do about it, e.g. "Renew" */
  action: string;
  /** Settings > License, where the license is renewed or bought */
  href: string;
};

const days = (count?: number) => `${count} ${count === 1 ? 'day' : 'days'}`;

export const LICENSE_PREVIEW_PARAM = 'license-preview';
const STATES: LicenseNotice['state'][] = ['license-expired', 'license-expiring', 'trial-ended', 'trial'];
const isLicenseNoticeState = (value: string): value is LicenseNotice['state'] => (STATES as string[]).includes(value);

/** A state with sample dates, to see how it looks without changing the license or the trial */
const getPreviewNotice = (state: LicenseNotice['state'], href: string): LicenseNotice => {
  const date = (offsetDays: number) => new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toLocaleDateString();
  const previews: Record<LicenseNotice['state'], LicenseNotice> = {
    'license-expired': {
      state,
      label: 'License expired',
      message: `Your EventCatalog commercial license expired on ${date(-3)}. Renew it to keep using EventCatalog commercially.`,
      warning: true,
      action: 'Renew',
      href,
    },
    'license-expiring': {
      state,
      label: `License · ${days(7)} left`,
      message: `Your EventCatalog commercial license expires on ${date(7)}. Renew it to keep using EventCatalog commercially.`,
      warning: true,
      action: 'Renew',
      href,
    },
    'trial-ended': {
      state,
      label: 'Trial ended',
      message: `Your ${TRIAL_LENGTH_DAYS}-day EventCatalog trial ended on ${date(-2)}. See your license settings.`,
      warning: true,
      action: 'Manage',
      href,
    },
    trial: {
      state,
      label: `Trial · ${days(9)} left`,
      message: `You're on a ${TRIAL_LENGTH_DAYS}-day EventCatalog trial, ending on ${date(9)}. See your license settings.`,
      warning: false,
      action: 'Manage',
      href,
    },
  };
  return previews[state];
};

/**
 * The license or trial notice to show, if any. Only while running `eventcatalog dev`, never in built or served
 * catalogs. A valid license.jwt replaces the trial, and only shows once it's about to expire. An expired license.jwt
 * shows instead of the trial. A Scale or Starter plan replaces the trial too.
 */
export const getLicenseNotice = async (url?: URL): Promise<LicenseNotice | undefined> => {
  if (!isDevMode()) return undefined;
  const href = buildUrl('/settings/license');

  // See how each state looks, with sample dates: `?license-preview=license-expiring` on any page (in dev only)
  const preview = url?.searchParams.get(LICENSE_PREVIEW_PARAM);
  if (preview && isLicenseNoticeState(preview)) return getPreviewNotice(preview, href);

  const license = await getLicenseStatus();

  if (license?.state === 'expired') {
    const on = license.expiresAt ? `expired on ${license.expiresAt.toLocaleDateString()}` : 'has expired';
    return {
      state: 'license-expired',
      label: 'License expired',
      message: `Your EventCatalog commercial license ${on}. Renew it to keep using EventCatalog commercially.`,
      warning: true,
      action: 'Renew',
      href,
    };
  }

  if (license?.state === 'licensed') {
    const daysLeft = getLicenseDaysLeft(license.expiresAt);
    if (daysLeft === undefined) return undefined;
    return {
      state: 'license-expiring',
      label: `License · ${days(daysLeft)} left`,
      message: `Your EventCatalog commercial license expires on ${license.expiresAt.toLocaleDateString()}. Renew it to keep using EventCatalog commercially.`,
      warning: true,
      action: 'Renew',
      href,
    };
  }

  if (license?.state === 'plan') return undefined;

  const trial = getTrialStatus(catalog?.tsd);
  if (!trial) return undefined;
  return trial.ended
    ? {
        state: 'trial-ended',
        label: 'Trial ended',
        message: `Your ${TRIAL_LENGTH_DAYS}-day EventCatalog trial ended on ${trial.endsAt.toLocaleDateString()}. See your license settings.`,
        warning: true,
        action: 'Manage',
        href,
      }
    : {
        state: 'trial',
        label: `Trial · ${days(trial.daysLeft)} left`,
        message: `You're on a ${TRIAL_LENGTH_DAYS}-day EventCatalog trial, ending on ${trial.endsAt.toLocaleDateString()}. See your license settings.`,
        warning: false,
        action: 'Manage',
        href,
      };
};
