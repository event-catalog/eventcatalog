import { buildUrl } from '@utils/url-builder';
import { getCollectionStyles } from '@components/Grids/utils';
import { getSchemaTypeLabel } from './utils';
import type { SchemaItem } from './types';

interface SchemaListItemProps {
  message: SchemaItem;
  isSelected: boolean;
  versions: SchemaItem[];
  onClick: () => void;
  itemRef?: React.RefObject<HTMLButtonElement>;
}

export default function SchemaListItem({ message, isSelected, versions, onClick, itemRef }: SchemaListItemProps) {
  const { color, Icon } = getCollectionStyles(message.collection);
  const hasMultipleVersions = versions.length > 1;

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
        isSelected ? `bg-${color}-50 border-l-4 border-${color}-500` : 'border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? `text-${color}-600` : `text-${color}-500`}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className={`text-sm font-semibold truncate ${isSelected ? `text-${color}-900` : 'text-gray-900'}`}>
                {message.data.name}
              </h3>
              <span className="text-xs text-gray-500 flex-shrink-0">v{message.data.version}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
                {(() => {
                  const ext = message.schemaExtension?.toLowerCase();
                  if (
                    ext === 'openapi' ||
                    ext === 'asyncapi' ||
                    ext === 'graphql' ||
                    ext === 'avro' ||
                    ext === 'json' ||
                    ext === 'proto'
                  ) {
                    // Map json extension to json-schema icon
                    const iconName = ext === 'json' ? 'json-schema' : ext;
                    const iconPath = buildUrl(`/icons/${iconName}.svg`, true);
                    return (
                      <>
                        <img src={iconPath} alt={`${ext} icon`} className="h-3 w-3" />
                        {getSchemaTypeLabel(message.schemaExtension)}
                      </>
                    );
                  }
                  return getSchemaTypeLabel(message.schemaExtension);
                })()}
              </span>
              {hasMultipleVersions && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-1 py-0.5 text-xs font-medium text-blue-700">
                  {versions.length} versions
                </span>
              )}
            </div>
          </div>
          {message.data.summary && <p className="text-xs text-gray-600 line-clamp-2">{message.data.summary}</p>}
        </div>
      </div>
    </button>
  );
}
