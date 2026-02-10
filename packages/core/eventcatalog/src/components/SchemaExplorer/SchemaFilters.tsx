import { AdjustmentsHorizontalIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import { getSchemaTypeLabel } from './utils';
import type { SchemaItem } from './types';

interface SchemaFiltersProps {
  selectedSchemaType: string;
  onSchemaTypeChange: (type: string) => void;
  schemaTypes: string[];
  latestMessages: SchemaItem[];
  filtersExpanded: boolean;
  onToggleExpanded: () => void;
  isMounted: boolean;
}

export default function SchemaFilters({
  selectedSchemaType,
  onSchemaTypeChange,
  schemaTypes,
  latestMessages,
  filtersExpanded,
  onToggleExpanded,
  isMounted,
}: SchemaFiltersProps) {
  const hasActiveFilters = selectedSchemaType !== 'all';

  // Only show this component if there are schema types to filter
  if (schemaTypes.length <= 1) {
    return null;
  }

  return (
    <div className="flex-shrink-0 border-b border-gray-100 bg-white">
      {/* Filter Header */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <AdjustmentsHorizontalIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] font-medium text-gray-600">Format</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-900 text-[10px] font-medium text-white">
              1
            </span>
          )}
        </div>
        {filtersExpanded ? (
          <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>

      {/* Collapsible Filter Content */}
      {isMounted && filtersExpanded && (
        <div className="px-3 pb-2">
          {/* Schema Format Filter as chips */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onSchemaTypeChange('all')}
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                selectedSchemaType === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {schemaTypes.map((type) => {
              const count = latestMessages.filter((m) => m.schemaExtension?.toLowerCase() === type).length;
              const ext = type.toLowerCase();
              const hasIcon = ['openapi', 'asyncapi', 'graphql', 'avro', 'json', 'proto'].includes(ext);
              const iconName = ext === 'json' ? 'json-schema' : ext;

              return (
                <button
                  key={type}
                  onClick={() => onSchemaTypeChange(type)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    selectedSchemaType === type
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {hasIcon && (
                    <img
                      src={buildUrl(`/icons/${iconName}.svg`, true)}
                      alt={`${type} icon`}
                      className={`h-3 w-3 ${selectedSchemaType === type ? 'brightness-0 invert' : 'opacity-60'}`}
                    />
                  )}
                  {getSchemaTypeLabel(type)}
                  <span className={`text-[10px] tabular-nums ${selectedSchemaType === type ? 'text-white/60' : 'text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clear filter */}
          {hasActiveFilters && (
            <button onClick={() => onSchemaTypeChange('all')} className="mt-1.5 text-[11px] text-gray-500 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
