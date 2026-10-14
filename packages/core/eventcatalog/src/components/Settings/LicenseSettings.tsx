import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock, Info, Mail, TriangleAlert } from 'lucide-react';
import { Row, cn } from './Row';
import {
  BUY_BUSINESS_URL,
  getTrialStatus,
  LICENSE_FAQ_URL,
  LICENSE_REMINDER_DAYS,
  LICENSE_RENEW_URL,
  PRICING_URL,
  TALK_TO_US_URL,
  TRIAL_LENGTH_DAYS,
} from '@utils/trial';

/**
 * The license status (see getLicenseStatus in @utils/license) with dates as unix ms, so it can be
 * passed to the browser. Days left are counted there, so a prerendered page stays current.
 */
export type LicenseProps =
  | { state: 'none' }
  | {
      state: 'licensed' | 'expired';
      org?: string;
      licenseId?: string;
      issuedAt?: number;
      expiresAt?: number;
    }
  | { state: 'plan'; plan: 'scale' | 'starter' }
  | { state: 'invalid'; reason: string };

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// A fixed locale and time zone, so the browser renders the same dates as the server
const formatDate = (date?: Date | number) =>
  date === undefined ? '—' : new Date(date).toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
const formatDays = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const PILL_TONES: Record<Tone, string> = {
  success:
    'border-[rgb(var(--ec-badge-color-green-text)/0.3)] bg-[rgb(var(--ec-badge-color-green-background))] text-[rgb(var(--ec-badge-color-green-text))]',
  warning:
    'border-[rgb(var(--ec-badge-color-amber-text)/0.3)] bg-[rgb(var(--ec-badge-color-amber-background))] text-[rgb(var(--ec-badge-color-amber-text))]',
  danger:
    'border-[rgb(var(--ec-badge-color-red-text)/0.3)] bg-[rgb(var(--ec-badge-color-red-background))] text-[rgb(var(--ec-badge-color-red-text))]',
  // Black on light themes, white on dark: the catalog's accent colour reads as a warning
  info: 'border-transparent bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))]',
  neutral: 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))]',
};

const StatusPill = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span
    className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold', PILL_TONES[tone])}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
    {children}
  </span>
);

type Detail = { label: string; value: React.ReactNode; mono?: boolean };

const DetailsTable = ({
  title,
  status,
  details,
}: {
  title: string;
  status: { tone: Tone; label: string };
  details: Detail[];
}) => (
  <div className="overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]">
    <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--ec-page-border))] px-4 py-3">
      <p className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">{title}</p>
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
    </div>
    <dl className="divide-y divide-[rgb(var(--ec-page-border))]">
      {details.map((detail) => (
        <div key={detail.label} className="grid grid-cols-[9rem_minmax(0,_1fr)] gap-4 px-4 py-2.5">
          <dt className="text-[12px] text-[rgb(var(--ec-page-text-muted))]">{detail.label}</dt>
          <dd
            className={cn(
              'min-w-0 break-words text-[13px] text-[rgb(var(--ec-page-text))]',
              detail.mono && 'font-mono text-[12px]'
            )}
          >
            {detail.value}
          </dd>
        </div>
      ))}
    </dl>
  </div>
);

// Verified when the page was rendered, but may have expired since
const isExpired = (license: LicenseProps, now: number) =>
  license.state === 'expired' || (license.state === 'licensed' && license.expiresAt !== undefined && license.expiresAt <= now);

const PLAN_NAMES = { scale: 'EventCatalog Scale', starter: 'EventCatalog Starter' };

// Days left on a license that's about to expire, or undefined
const getDaysLeft = (license: LicenseProps, now: number) => {
  if (license.state !== 'licensed' || license.expiresAt === undefined) return;
  const daysLeft = Math.max(0, Math.ceil((license.expiresAt - now) / DAY_IN_MS));
  return daysLeft < LICENSE_REMINDER_DAYS ? daysLeft : undefined;
};

/**
 * A callout below the license once it's about to expire, or has expired, so it's hard to miss.
 */
const LicenseNotice = ({ license, now }: { license: LicenseProps; now: number }) => {
  const expired = isExpired(license, now);
  const daysLeft = getDaysLeft(license, now);
  if (!expired && daysLeft === undefined) return null;

  const expiresAt = license.state === 'licensed' || license.state === 'expired' ? license.expiresAt : undefined;
  const Icon = expired ? TriangleAlert : Clock;
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        expired
          ? 'border-[rgb(var(--ec-badge-color-red-text)/0.3)] bg-[rgb(var(--ec-badge-color-red-background))] text-[rgb(var(--ec-badge-color-red-text))]'
          : 'border-[rgb(var(--ec-badge-color-amber-text)/0.3)] bg-[rgb(var(--ec-badge-color-amber-background))] text-[rgb(var(--ec-badge-color-amber-text))]'
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="text-[13px] font-semibold">
          {expired ? 'Your commercial license has expired' : `Your commercial license expires in ${formatDays(daysLeft!)}`}
        </p>
        {expired ? (
          <>
            <p className="text-[13px] opacity-90">
              It expired on {formatDate(expiresAt)}. Organisations that don't qualify for Free Use need a commercial license to
              use EventCatalog in production.
            </p>
            <p className="text-[13px] opacity-90">
              Your catalog keeps building and running. Renew to stay licensed, or talk to us if anything has changed.
            </p>
          </>
        ) : (
          <p className="text-[13px] opacity-90">
            It expires on {formatDate(expiresAt)}. Renew it before then to keep using EventCatalog commercially.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={LICENSE_RENEW_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--ec-page-text))] px-3.5 py-1.5 text-[13px] font-medium text-[rgb(var(--ec-page-bg))] shadow-sm transition-opacity hover:opacity-85"
          >
            Renew license
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
          <a
            href={TALK_TO_US_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium underline underline-offset-2 hover:opacity-80"
          >
            Talk to us
          </a>
          <a
            href={LICENSE_FAQ_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium underline underline-offset-2 hover:opacity-80"
          >
            License FAQ
          </a>
        </div>
      </div>
    </div>
  );
};

// Where a customer with a legacy key asks for a license.jwt (as the license FAQ does)
const LICENSE_CONTACT_EMAIL = 'hello@eventcatalog.dev';

/**
 * A Scale or Starter plan uses a license key from before EventCatalog 5, checked online. It still works, but the
 * customer should ask us for a license.jwt (checked offline) for their plan.
 */
const LegacyKeyNotice = ({ plan }: { plan: 'scale' | 'starter' }) => {
  const subject = encodeURIComponent(`A license.jwt for our ${PLAN_NAMES[plan]} plan`);
  return (
    <div
      role="note"
      className="flex gap-3 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.05)] p-4 text-[rgb(var(--ec-page-text))]"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--ec-page-text))]" aria-hidden />
      <div className="space-y-1">
        <p className="text-[13px] font-semibold">You're using a legacy license key</p>
        <p className="text-[13px] text-[rgb(var(--ec-page-text-muted))]">
          Your plan still works. Its key is from before EventCatalog 5.
        </p>
        <p className="text-[13px] text-[rgb(var(--ec-page-text-muted))]">
          Contact us for a new key: a license.jwt file, checked offline.
        </p>
        <div className="pt-2">
          <a
            href={`mailto:${LICENSE_CONTACT_EMAIL}?subject=${subject}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--ec-page-text))] px-3.5 py-1.5 text-[13px] font-medium text-[rgb(var(--ec-page-bg))] shadow-sm transition-opacity hover:opacity-85"
          >
            Contact us for a new key
            <Mail className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
};

// For organisations that don't need to pay: without it, the trial reads as "EventCatalog is now paid"
const FreeUseNotice = () => (
  <p className="text-[13px] leading-relaxed text-[rgb(var(--ec-content-text-muted,var(--ec-page-text-muted)))]">
    <span className="font-medium text-[rgb(var(--ec-page-text))]">You may qualify for Free Use.</span> Under $10M revenue and $10M
    raised, an individual or an open-source project? You can use EventCatalog for free.{' '}
    <a href={LICENSE_RENEW_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:opacity-80">
      Get a free key at eventcatalog.cloud
    </a>
    .
  </p>
);

const LicenseTable = ({ license, now }: { license: LicenseProps; now: number }) => {
  if (license.state === 'plan') {
    return (
      <DetailsTable
        title={PLAN_NAMES[license.plan]}
        status={{ tone: 'success', label: 'Active' }}
        details={[{ label: 'License key', value: `EVENTCATALOG_${license.plan.toUpperCase()}_LICENSE_KEY`, mono: true }]}
      />
    );
  }
  const expired = isExpired(license, now);
  if (license.state === 'licensed' && !expired) {
    const daysLeft = Math.max(0, Math.ceil(((license.expiresAt ?? now) - now) / DAY_IN_MS));
    const expiringSoon = daysLeft < LICENSE_REMINDER_DAYS;
    return (
      <DetailsTable
        title="Commercial license"
        status={expiringSoon ? { tone: 'warning', label: 'Expires soon' } : { tone: 'success', label: 'Active' }}
        details={[
          { label: 'Licensed to', value: license.org || '—' },
          { label: 'License ID', value: license.licenseId || '—', mono: true },
          { label: 'Issued', value: formatDate(license.issuedAt) },
          { label: 'Expires', value: formatDate(license.expiresAt) },
          { label: 'Time left', value: formatDays(daysLeft) },
        ]}
      />
    );
  }
  if ((license.state === 'licensed' || license.state === 'expired') && expired) {
    return (
      <DetailsTable
        title="Commercial license"
        status={{ tone: 'danger', label: 'Expired' }}
        details={[
          { label: 'Licensed to', value: license.org || '—' },
          { label: 'License ID', value: license.licenseId || '—', mono: true },
          { label: 'Issued', value: formatDate(license.issuedAt) },
          { label: 'Expired', value: formatDate(license.expiresAt) },
        ]}
      />
    );
  }
  if (license.state === 'invalid') {
    return (
      <DetailsTable
        title="Commercial license"
        status={{ tone: 'warning', label: 'Not verified' }}
        details={[
          { label: 'File', value: 'license.jwt', mono: true },
          { label: 'Problem', value: `It could not be verified: ${license.reason}.` },
        ]}
      />
    );
  }
  return null;
};

const TrialTable = ({ trialStartedAt, now }: { trialStartedAt?: number; now: number }) => {
  const trial = getTrialStatus(trialStartedAt, now);
  if (!trial) {
    return (
      <DetailsTable
        title="EventCatalog trial"
        status={{ tone: 'neutral', label: 'Not started' }}
        details={[
          {
            label: 'Start date',
            value: 'No trial start date (tsd) in eventcatalog.config.js.',
          },
        ]}
      />
    );
  }
  const startedAt = trial.endsAt.getTime() - TRIAL_LENGTH_DAYS * DAY_IN_MS;
  return (
    <DetailsTable
      title="EventCatalog trial"
      status={trial.ended ? { tone: 'warning', label: 'Ended' } : { tone: 'info', label: 'Active' }}
      details={[
        { label: 'Length', value: formatDays(TRIAL_LENGTH_DAYS) },
        { label: 'Started', value: formatDate(startedAt) },
        { label: trial.ended ? 'Ended' : 'Ends', value: formatDate(trial.endsAt) },
        ...(trial.ended ? [] : [{ label: 'Time left', value: formatDays(trial.daysLeft) }]),
      ]}
    />
  );
};

interface Props {
  license: LicenseProps;
  /** The trial start date (`tsd` in eventcatalog.config.js), unix ms */
  trialStartedAt?: number;
  /** When the page was rendered, unix ms: the first render matches the server's, then it counts from now */
  renderedAt: number;
  /** EventCatalog's license (the Business Source License) on GitHub */
  licenseUrl: string;
}

export const LicenseSettings = ({ license, trialStartedAt, renderedAt, licenseUrl }: Props) => {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => setNow(Date.now()), []);
  // A catalog is on the trial or has a license: an expired license is shown (to renew), not the trial. As in the header.
  const onTrial = license.state === 'none' || license.state === 'invalid';
  // While the trial runs, buying starts from pricing; once it has ended, from the Business order form
  const trialEnded = onTrial && getTrialStatus(trialStartedAt, now)?.ended;

  return (
    // A top border, as on the other settings pages
    <div className="divide-y divide-[rgb(var(--ec-page-border))] border-t border-[rgb(var(--ec-page-border))]">
      <Row
        title="License"
        description={
          <>
            EventCatalog is licensed under the{' '}
            <a href={licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:opacity-80">
              Business Source License 1.1
            </a>
            . Your license is read from the license.jwt file in the root of your catalog. The{' '}
            <a href={LICENSE_FAQ_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:opacity-80">
              license FAQ
            </a>{' '}
            explains who can use EventCatalog for free.
          </>
        }
        aside={
          (onTrial || license.state === 'expired') && (
            <div className="space-y-3">
              <FreeUseNotice />
              <p className="text-[13px] leading-relaxed text-[rgb(var(--ec-content-text-muted,var(--ec-page-text-muted)))]">
                Questions about licensing, or need something different? Get in touch and let us know how we can help.
              </p>
            </div>
          )
        }
        canEdit={false}
        dirty={false}
      >
        <div className="space-y-4">
          <LicenseTable license={license} now={now} />
          <LicenseNotice license={license} now={now} />
          {license.state === 'plan' && <LegacyKeyNotice plan={license.plan} />}
          {onTrial && <TrialTable trialStartedAt={trialStartedAt} now={now} />}
          {onTrial && (
            <div className="flex flex-wrap gap-3">
              <a
                href={trialEnded ? BUY_BUSINESS_URL : PRICING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--ec-page-text))] px-4 py-2 text-[13px] font-medium text-[rgb(var(--ec-page-bg))] shadow-sm transition-opacity hover:opacity-85"
              >
                {trialEnded ? 'Buy Business' : 'Buy a license'}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
              <a
                href={TALK_TO_US_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-[rgb(var(--ec-page-border))] px-4 py-2 text-[13px] font-medium text-[rgb(var(--ec-page-text))] transition-opacity hover:opacity-80"
              >
                Talk to us
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          )}
        </div>
      </Row>
    </div>
  );
};
