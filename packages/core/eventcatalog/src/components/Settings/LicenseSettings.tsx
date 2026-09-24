import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Row, cn } from './Row';
import { getTrialStatus, LICENSE_FAQ_URL, LICENSE_REMINDER_DAYS, TRIAL_LENGTH_DAYS } from '@utils/trial';

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
  | { state: 'invalid'; reason: string };

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// A fixed locale and time zone, so the browser renders the same dates as the server
const formatDate = (date?: Date | number) =>
  date === undefined ? '—' : new Date(date).toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
const formatDays = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

type Tone = 'success' | 'warning' | 'info' | 'neutral';

const PILL_TONES: Record<Tone, string> = {
  success:
    'border-[rgb(var(--ec-badge-color-green-text)/0.3)] bg-[rgb(var(--ec-badge-color-green-background))] text-[rgb(var(--ec-badge-color-green-text))]',
  warning:
    'border-[rgb(var(--ec-badge-color-amber-text)/0.3)] bg-[rgb(var(--ec-badge-color-amber-background))] text-[rgb(var(--ec-badge-color-amber-text))]',
  info: 'border-[rgb(var(--ec-accent)/0.3)] bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]',
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

const LicenseTable = ({ license, now }: { license: LicenseProps; now: number }) => {
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
        status={{ tone: 'warning', label: 'Expired' }}
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
}

export const LicenseSettings = ({ license, trialStartedAt, renderedAt }: Props) => {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => setNow(Date.now()), []);

  return (
    <div className="divide-y divide-[rgb(var(--ec-page-border))]">
      <Row
        title="License"
        description="EventCatalog is licensed under the Business Source License 1.1. Your license is read from the license.jwt file in the root of your catalog."
        canEdit={false}
        dirty={false}
      >
        <div className="space-y-4">
          <LicenseTable license={license} now={now} />
          {/* The trial applies until there's a valid license */}
          {(license.state !== 'licensed' || isExpired(license, now)) && <TrialTable trialStartedAt={trialStartedAt} now={now} />}
        </div>
      </Row>

      <Row
        title="Learn more"
        description="Who can use EventCatalog for free, and when you need a commercial license."
        canEdit={false}
        dirty={false}
      >
        <a
          href={LICENSE_FAQ_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--ec-page-text))] px-4 py-2 text-[13px] font-medium text-[rgb(var(--ec-page-bg))] shadow-sm transition-opacity hover:opacity-85"
        >
          Read the license FAQ
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      </Row>
    </div>
  );
};
