import { buildUrl } from '@utils/url-builder';
import { getCollectionStyles } from '@components/Grids/utils';
import { getSchemaTypeLabel } from './utils';
import type { SchemaItem } from './types';

interface SchemaListItemProps {
  message: SchemaItem;
  isSelected: boolean;
  versions: SchemaItem[];
  onClick: () => void;
  itemRef?: React.Ref<HTMLButtonElement>;
}

export default function SchemaListItem({ message, isSelected, versions, onClick, itemRef }: SchemaListItemProps) {
  const { color, Icon } = getCollectionStyles(message.collection);
  const hasMultipleVersions = versions.length > 1;

  // Get the schema icon
  const ext = message.schemaExtension?.toLowerCase();
  const hasSchemaIcon = ['openapi', 'asyncapi', 'graphql', 'avro', 'json', 'proto'].includes(ext || '');
  const iconName = ext === 'json' ? 'json-schema' : ext;

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 transition-all duration-75 group border-l-2 ${
        isSelected ? `bg-${color}-50 border-l-${color}-500` : 'hover:bg-gray-50 border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Collection Icon */}
        <div
          className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md ${
            isSelected ? `bg-${color}-100` : `bg-${color}-100/60`
          }`}
        >
          <Icon className={`h-3.5 w-3.5 text-${color}-600`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name row with version */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-semibold truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
              {message.data.name}
            </span>
            <span className={`text-[10px] tabular-nums flex-shrink-0 ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
              v{message.data.version}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {/* Schema Format */}
            <span className={`inline-flex items-center gap-1 text-[10px] ${isSelected ? 'text-gray-600' : 'text-gray-500'}`}>
              {hasSchemaIcon && (
                <img src={buildUrl(`/icons/${iconName}.svg`, true)} alt={`${ext} icon`} className="h-3 w-3 opacity-70" />
              )}
              {getSchemaTypeLabel(message.schemaExtension)}
            </span>

            {/* Versions count */}
            {hasMultipleVersions && (
              <span className={`text-[10px] ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>· {versions.length}v</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
