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

// Derive a namespace from available data
function getNamespace(message: SchemaItem): string | null {
  const producers = message.data.producers || [];
  const firstProducer = producers[0];

  if (firstProducer) {
    const serviceName = extractServiceName(firstProducer.id);
    return `${serviceName}.${message.collection}`;
  }

  // For services, use the service ID + spec type
  if (message.collection === 'services' && message.specType) {
    return `${message.specType}`;
  }

  // For data products
  if (message.collection === 'data-products' && message.dataProductId) {
    return `${extractServiceName(message.dataProductId)}.contracts`;
  }

  return null;
}

export default function SchemaListItem({ message, isSelected, versions, onClick, itemRef }: SchemaListItemProps) {
  const hasMultipleVersions = versions.length > 1;
  const ext = message.schemaExtension?.toLowerCase() || '';
  const iconSpec = ICON_SPECS[ext];
  const { label: formatLabel, color: formatColor } = getFormatBadge(ext);
  const namespace = getNamespace(message);

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 transition-all duration-100 group ${
        isSelected
          ? 'bg-[rgb(var(--ec-accent-subtle))] border-l-2 border-l-[rgb(var(--ec-accent))]'
          : 'hover:bg-[rgb(var(--ec-content-hover))] border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Schema Format Badge */}
        <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border)/0.5)]">
          {iconSpec ? (
            <img src={buildUrl(`/icons/${iconSpec}.svg`, true)} alt={`${ext} icon`} className="h-4 w-4 schema-icon" />
          ) : (
            <span className={`text-[10px] font-bold font-mono ${formatColor}`}>{formatLabel}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium text-[rgb(var(--ec-page-text))] truncate leading-tight">
              {message.data.name}
            </span>
            <span className="flex-shrink-0 text-[11px] tabular-nums text-[rgb(var(--ec-page-text-muted))] font-mono">
              v{message.data.version}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-[rgb(var(--ec-page-text-muted))]">
              {getSchemaTypeLabel(message.schemaExtension)}
            </span>
            {namespace && (
              <>
                <span className="text-[rgb(var(--ec-page-text-muted))] opacity-40">&middot;</span>
                <span className="text-[11px] text-[rgb(var(--ec-page-text-muted))] truncate font-mono opacity-70">
                  {namespace}
                </span>
              </>
            )}
            {hasMultipleVersions && (
              <>
                <span className="text-[rgb(var(--ec-page-text-muted))] opacity-40">&middot;</span>
                <span className="text-[11px] tabular-nums text-[rgb(var(--ec-page-text-muted))] opacity-70">
                  {versions.length}v
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
