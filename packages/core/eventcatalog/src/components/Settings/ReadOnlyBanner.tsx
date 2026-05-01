import { Lock } from 'lucide-react';

export const ReadOnlyBanner = () => (
  <div
    role="status"
    className="mb-6 flex items-start gap-3 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] p-4 text-sm text-[rgb(var(--ec-page-text))]"
  >
    <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[rgb(var(--ec-page-text-muted))]" aria-hidden />
    <div className="space-y-1">
      <p className="font-medium">Read-only</p>
      <p className="text-[rgb(var(--ec-page-text-muted))]">
        Run <code className="rounded bg-[rgb(var(--ec-page-bg)/0.78)] px-1 py-0.5 font-mono text-xs">npx eventcatalog dev</code>{' '}
        in your catalog directory to edit these settings.
      </p>
    </div>
  </div>
);
