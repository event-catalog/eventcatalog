import { AlertCircle } from 'lucide-react';

export const cn = (...parts: Array<string | false | undefined | null>): string => parts.filter(Boolean).join(' ');

export const inputBase =
  'block w-full rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))] px-3 py-2 text-[13px] text-[rgb(var(--ec-page-text))] placeholder:text-[rgb(var(--ec-page-text-muted)/0.7)] transition-colors focus:border-[rgb(var(--ec-page-text)/0.5)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-page-text)/0.15)] disabled:cursor-not-allowed disabled:opacity-60';

export const monoInput = 'font-mono text-[12.5px] tracking-tight';

export const inputError = 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20';

interface RowProps {
  title: string;
  description: React.ReactNode;
  /** Shown under the description, in the left column */
  aside?: React.ReactNode;
  canEdit: boolean;
  dirty: boolean;
  saving?: boolean;
  onSave?: () => void;
  error?: string;
  children: React.ReactNode;
}

/**
 * A setting as a card, as in Vercel's settings: its title, what it does and its field in the card, and a footer under it
 * with where it's saved and the Save button (only when it can be saved)
 */
export const Row = ({ title, description, aside, canEdit, dirty, saving, onSave, error, children }: RowProps) => (
  <section className="overflow-hidden rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))]">
    <div className="space-y-4 p-6">
      <header className="space-y-1.5">
        <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-[rgb(var(--ec-page-text))]">{title}</h3>
        <p className="max-w-2xl text-[13px] leading-relaxed text-[rgb(var(--ec-content-text-muted,var(--ec-page-text-muted)))]">
          {description}
        </p>
        {aside && <div className="max-w-2xl pt-2">{aside}</div>}
      </header>
      <div className="space-y-2.5">
        {children}
        {error && (
          <p className="flex items-center gap-1.5 text-[12px] text-red-500">
            <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
    {onSave && canEdit && (
      <footer className="flex items-center justify-between gap-4 border-t border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.02)] px-6 py-3">
        <p className="text-[12px] text-[rgb(var(--ec-page-text-muted))]">
          Saved to <code className="font-mono text-[11.5px]">eventcatalog.config.js</code>
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors',
            dirty && !saving
              ? 'border-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))] hover:opacity-85'
              : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.04)] text-[rgb(var(--ec-page-text-muted))]',
            'disabled:cursor-not-allowed'
          )}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </footer>
    )}
  </section>
);
