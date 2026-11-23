import { useMemo } from 'react';
import type { NavigationData } from '../../stores/sidebar-store/state';
import { getSearchPreview } from './search-preview';

type Result = { key?: string; url: string; name: string; type: string; rawNode?: { summary?: string } };

/**
 * Beside the search results (wide screens only): a preview of the one highlighted, with what it is, how it's connected
 * and where to go from it
 */
export default function SearchResultPreview({
  result,
  nodes,
  onNavigate,
}: {
  result: Result;
  nodes: NavigationData['nodes'] | undefined;
  onNavigate: () => void;
}) {
  const preview = useMemo(
    () =>
      getSearchPreview(nodes, {
        key: result.key,
        url: result.url,
        name: result.name,
        type: result.type,
        summary: result.rawNode?.summary,
      }),
    [nodes, result]
  );

  const primary = preview.actions.find((action) => action.primary);
  const secondary = preview.actions.filter((action) => !action.primary);

  return (
    <aside
      aria-label={`Preview of ${preview.title}`}
      className="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.02)] p-5 md:flex"
    >
      {/* The title (the type under it), then the summary: no icon, as the highlighted row beside it shows one */}
      <div className="flex flex-col gap-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-[rgb(var(--ec-page-text))]">
            {preview.title}
          </h2>
          <p className="mt-0.5 text-xs text-[rgb(var(--ec-page-text-muted))]">{preview.type}</p>
        </div>
        {preview.summary && (
          <p className="line-clamp-3 text-[13px] leading-relaxed text-[rgb(var(--ec-page-text-muted))]">{preview.summary}</p>
        )}
      </div>

      {preview.facts.length > 0 && (
        <dl className="flex flex-col border-y border-[rgb(var(--ec-page-border))] text-[13px]">
          {preview.facts.map((fact, index) => (
            <div
              key={fact.label}
              className={`flex items-baseline justify-between gap-4 py-2 ${index > 0 ? 'border-t border-[rgb(var(--ec-page-border)/0.6)]' : ''}`}
            >
              <dt className="shrink-0 text-[rgb(var(--ec-page-text-muted))]">{fact.label}</dt>
              <dd className="min-w-0 truncate text-right font-medium text-[rgb(var(--ec-page-text))]">
                {fact.href ? (
                  <a href={fact.href} onClick={onNavigate} className="hover:underline hover:underline-offset-2">
                    {fact.value}
                  </a>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Open across the panel, the others side by side under it at equal widths, so they never wrap unevenly */}
      <div className="flex flex-col gap-2">
        {primary && (
          <a
            href={primary.href}
            onClick={onNavigate}
            className="inline-flex h-9 w-full items-center justify-between rounded-md bg-[rgb(var(--ec-page-text))] pl-3.5 pr-2 text-[13px] font-medium text-[rgb(var(--ec-page-bg))] transition-opacity hover:opacity-85"
          >
            {primary.label}
            <kbd className="rounded bg-[rgb(var(--ec-page-bg)/0.18)] px-1.5 font-sans text-[11px]" aria-hidden="true">
              ↵
            </kbd>
          </a>
        )}
        {secondary.length > 0 && (
          <div className={`grid gap-2 ${secondary.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {secondary.map((action) => (
              <a
                key={action.label}
                href={action.href}
                onClick={onNavigate}
                className="inline-flex h-9 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] px-3 text-[13px] font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-page-text)/0.05)]"
              >
                {action.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
