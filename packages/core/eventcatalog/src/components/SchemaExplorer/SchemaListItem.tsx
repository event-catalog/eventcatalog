import type { SchemaItem } from './types';
import { getSchemaDisplayLabel, getSchemaIconUrl, getFormatBadge, extractServiceName } from './utils';

interface SchemaListItemProps {
  message: SchemaItem;
  isSelected: boolean;
  versions: SchemaItem[];
  onClick: () => void;
  itemRef?: React.Ref<HTMLButtonElement>;
}

function getNamespace(message: SchemaItem): string | null {
  if (message.data.producerName) return message.data.producerName;

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
  const iconUrl = getSchemaIconUrl(message);
  const { label: formatLabel } = getFormatBadge(ext);
  const namespace = getNamespace(message);
  const summary = message.data.summary || `Browse the ${message.data.name} schema.`;
  const versionLabel = `v${message.data.version}`;

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      // A row edge to edge of the list, lines between them: the selected one on a neutral grey with a bar down its
      // left edge, the rest grey on hover
      className={`group block w-full px-4 py-3 text-left transition-colors duration-150 ${
        isSelected
          ? 'bg-[rgb(var(--ec-page-text)/0.05)] shadow-[inset_2px_0_0_rgb(var(--ec-page-text))]'
          : 'hover:bg-[rgb(var(--ec-page-text)/0.025)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="mt-px flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-[4px] border border-[rgb(var(--ec-page-border))]">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={`${ext} icon`}
              className={`schema-icon ec-mono-icon h-2.5 w-2.5 ${isSelected ? 'ec-mono-icon--active' : ''}`}
            />
          ) : (
            <span className="font-mono text-[6px] font-bold uppercase text-[rgb(var(--ec-page-text-muted))]">{formatLabel}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 pr-1 text-[12px] font-medium leading-4 tracking-[-0.01em] text-[rgb(var(--ec-page-text))] break-words">
              {message.data.name}
            </h3>
            <span
              className={`flex-shrink-0 rounded-[4px] border border-[rgb(var(--ec-page-border))] px-1 py-px font-mono text-[9px] tabular-nums ${
                isSelected ? 'text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text-muted))]'
              }`}
            >
              {versionLabel}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-1 text-[11px] leading-4 text-[rgb(var(--ec-page-text-muted))] line-clamp-2">{summary}</p>

      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-[rgb(var(--ec-page-text-muted))]">
            <span className="font-mono text-[rgb(var(--ec-page-text-muted))]">{getSchemaDisplayLabel(message)}</span>
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
