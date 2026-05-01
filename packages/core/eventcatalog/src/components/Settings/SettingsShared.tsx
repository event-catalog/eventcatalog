import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Lock, Sparkles, Copy, Check as CheckIcon } from 'lucide-react';
import { cn } from './Row';

export const ASSISTANT_DOCS_URL =
  'https://www.eventcatalog.dev/docs/development/ask-your-architecture/eventcatalog-assistant/what-is-eventcatalog-assistant';
export const ASSISTANT_CONFIGURATION_DOCS_URL =
  'https://www.eventcatalog.dev/docs/development/ask-your-architecture/eventcatalog-assistant/configuration';
export const MCP_DOCS_URL = 'https://www.eventcatalog.dev/docs/development/ask-your-architecture/mcp-server/getting-started';
export const PRICING_URL = 'https://www.eventcatalog.dev/pricing';

interface UpgradeRequiredProps {
  tier: string;
  blurb: string;
  docsUrl?: string;
}

export const UpgradeRequired = ({ tier, blurb, docsUrl }: UpgradeRequiredProps) => (
  <div className="overflow-hidden rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-500">
        <Lock className="h-4 w-4" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">Available on {tier}</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            Upgrade
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">{blurb}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={PRICING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            View plans
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]"
            >
              Learn more
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);

interface UrlPanelProps {
  url: string;
}

export const UrlPanel = ({ url }: UrlPanelProps) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(url, window.location.origin).href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy URL');
    }
  };
  return (
    <div className="mt-2 flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex-1 truncate rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-2.5 py-1.5 font-mono text-[12px] text-[rgb(var(--ec-page-text))] transition-colors hover:border-[rgb(var(--ec-accent)/0.5)] hover:text-[rgb(var(--ec-accent))]"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy URL"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.78)] hover:text-[rgb(var(--ec-page-text))]"
      >
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label="Open in new tab"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.78)] hover:text-[rgb(var(--ec-page-text))]"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
};

interface LiveCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const LiveCard = ({ icon, title, description }: LiveCardProps) => (
  <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-[rgb(var(--ec-page-text))]">{title}</p>
      <p className="text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">{description}</p>
    </div>
    <span className="flex-shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
      Live
    </span>
  </div>
);

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

export const Toggle = ({ checked, disabled, onChange }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors',
      checked ? 'bg-[rgb(var(--ec-accent))]' : 'bg-[rgb(var(--ec-page-text-muted)/0.35)]',
      disabled && 'cursor-not-allowed opacity-50'
    )}
  >
    <span
      className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
        checked ? 'translate-x-[1.125rem]' : 'translate-x-[0.1875rem]'
      )}
    />
  </button>
);

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

export const ToggleRow = ({ icon, label, hint, checked, disabled, onChange }: ToggleRowProps) => (
  <div className="flex items-center gap-3 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))] px-4 py-3">
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))]">
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-[rgb(var(--ec-page-text))]">{label}</p>
      <p className="text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">{hint}</p>
    </div>
    <Toggle checked={checked} disabled={disabled} onChange={onChange} />
  </div>
);
