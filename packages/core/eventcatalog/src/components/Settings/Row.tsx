import { AlertCircle } from 'lucide-react';

export const cn = (...parts: Array<string | false | undefined | null>): string => parts.filter(Boolean).join(' ');

export const inputBase =
  'block w-full rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))] px-3 py-2 text-[13px] text-[rgb(var(--ec-page-text))] placeholder:text-[rgb(var(--ec-page-text-muted)/0.7)] transition-colors focus:border-[rgb(var(--ec-accent)/0.6)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.25)] disabled:cursor-not-allowed disabled:opacity-60';

export const monoInput = 'font-mono text-[12.5px] tracking-tight';

export const inputError = 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20';

interface RowProps {
  title: string;
  description: string;
  canEdit: boolean;
  dirty: boolean;
  saving?: boolean;
  onSave?: () => void;
  error?: string;
  children: React.ReactNode;
}

export const Row = ({ title, description, canEdit, dirty, saving, onSave, error, children }: RowProps) => (
  <section className="grid grid-cols-1 gap-6 py-8 md:grid-cols-[minmax(0,_18rem)_minmax(0,_1fr)] md:gap-12">
    <header className="space-y-1.5">
      <h3 className="text-[14px] font-semibold tracking-tight text-[rgb(var(--ec-page-text))]">{title}</h3>
      <p className="text-[13px] leading-relaxed text-[rgb(var(--ec-content-text-muted,var(--ec-page-text-muted)))]">
        {description}
      </p>
    </header>
    <div className="space-y-2.5">
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] text-red-500">
          <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {onSave && canEdit && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors',
              dirty && !saving
                ? 'border-[rgb(var(--ec-accent)/0.5)] bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.8)]'
                : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))]',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  </section>
);
