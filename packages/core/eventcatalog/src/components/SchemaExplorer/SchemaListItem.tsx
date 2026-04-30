import { buildUrl } from '@utils/url-builder';
import type { SchemaItem } from './types';
import { getSchemaTypeLabel, ICON_SPECS, getFormatBadge, extractServiceName } from './utils';

interface SchemaListItemProps {
  message: SchemaItem;
  isSelected: boolean;
  versions: SchemaItem[];
  onClick: () => void;
  itemRef?: React.Ref<HTMLButtonElement>;
}

function getNamespace(message: SchemaItem): string | null {
  const producers = message.data.producers || [];
  const firstProducer = producers[0];

  if (firstProducer) {
    const serviceName = extractServiceName(firstProducer.id);
    return serviceName;
  }

  if (message.collection === 'services' && message.specType) {
    return `${message.specType} specification`;
  }

  if (message.collection === 'data-products' && message.dataProductId) {
    return extractServiceName(message.dataProductId);
  }

  return null;
}

export default function SchemaListItem({ message, isSelected, versions, onClick, itemRef }: SchemaListItemProps) {
  const ext = message.schemaExtension?.toLowerCase() || '';
  const iconSpec = ICON_SPECS[ext];
  const { label: formatLabel, color: formatColor } = getFormatBadge(ext);
  const namespace = getNamespace(message);
  const summary = message.data.summary || `Browse the ${message.data.name} schema.`;
  const versionLabel = `v${message.data.version}`;

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={`group w-full rounded-lg border px-2.5 py-2 text-left transition-all duration-150 ${
        isSelected
          ? 'border-[rgb(var(--ec-accent)/0.55)] bg-[rgb(var(--ec-accent)/0.1)] shadow-[0_0_0_1px_rgb(var(--ec-accent)/0.3),0_18px_40px_rgb(var(--ec-accent)/0.12)]'
          : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg)/0.66)] hover:border-[rgb(var(--ec-page-text-muted)/0.3)] hover:bg-[rgb(var(--ec-content-hover)/0.5)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-sm border border-[rgb(var(--ec-page-border)/0.55)] bg-[rgb(var(--ec-content-hover))]">
          {iconSpec ? (
            <img src={buildUrl(`/icons/${iconSpec}.svg`, true)} alt={`${ext} icon`} className="schema-icon h-2.5 w-2.5" />
          ) : (
            <span className={`font-mono text-[6px] font-bold uppercase ${formatColor}`}>{formatLabel}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 pr-1 text-[11px] font-semibold leading-4 text-[rgb(var(--ec-page-text))] break-words">
              {message.data.name}
            </h3>
            <span
              className={`mt-0.5 flex-shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[8px] font-semibold tabular-nums ${
                isSelected
                  ? 'border-[rgb(var(--ec-accent)/0.35)] bg-[rgb(var(--ec-accent)/0.15)] text-[rgb(var(--ec-page-text))]'
                  : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text-muted))]'
              }`}
            >
              {versionLabel}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-[10px] leading-4 text-[rgb(var(--ec-page-text-muted))] line-clamp-2">{summary}</p>

      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-[rgb(var(--ec-page-text-muted))]">
            <span className="font-medium text-[rgb(var(--ec-page-text-muted))]">
              {getSchemaTypeLabel(message.schemaExtension)}
            </span>
            {namespace && (
              <>
                <span className="opacity-35">&rsaquo;</span>
                <span className="truncate">{namespace}</span>
              </>
            )}
          </div>
        </div>

        <span className="flex-shrink-0 text-[9px] font-medium tabular-nums text-[rgb(var(--ec-page-text-muted))]">
          {versions.length}
        </span>
      </div>
    </button>
  );
}
