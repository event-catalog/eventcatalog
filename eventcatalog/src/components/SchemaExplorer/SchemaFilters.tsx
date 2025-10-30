import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { CollectionMessageTypes } from '@types';
import { getSchemaTypeLabel } from './utils';
import type { SchemaItem } from './types';

interface SchemaFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: 'all' | CollectionMessageTypes | 'services';
  onTypeChange: (type: 'all' | CollectionMessageTypes | 'services') => void;
  selectedSchemaType: string;
  onSchemaTypeChange: (type: string) => void;
  schemaTypes: string[];
  latestMessages: SchemaItem[];
  filtersExpanded: boolean;
  onToggleExpanded: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isMounted: boolean;
}

export default function SchemaFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedSchemaType,
  onSchemaTypeChange,
  schemaTypes,
  latestMessages,
  filtersExpanded,
  onToggleExpanded,
  searchInputRef,
  isMounted,
}: SchemaFiltersProps) {
  const activeFilterCount = [searchQuery, selectedType !== 'all', selectedSchemaType !== 'all'].filter(Boolean).length;

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
      {/* Filter Header */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-semibold text-gray-900">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {filtersExpanded ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {/* Collapsible Filter Content - Only render after mount to prevent FOUC */}
      {isMounted && filtersExpanded && (
        <div className="p-3 pt-0">
          {/* Search */}
          <div className="mb-3">
            <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1.5">
              Search
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                id="search"
                placeholder="Search schemas..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs pl-8 pr-8 py-1.5 border"
              />
              {searchQuery && (
                <button onClick={() => onSearchChange('')} className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                  <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Message Type Filter */}
          <div className="mb-3">
            <label htmlFor="messageType" className="block text-xs font-medium text-gray-700 mb-1.5">
              Message Type
            </label>
            <select
              id="messageType"
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value as typeof selectedType)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs px-2.5 py-1.5 border"
            >
              <option value="all">All ({latestMessages.length})</option>
              <option value="events">Events ({latestMessages.filter((m) => m.collection === 'events').length})</option>
              <option value="commands">Commands ({latestMessages.filter((m) => m.collection === 'commands').length})</option>
              <option value="queries">Queries ({latestMessages.filter((m) => m.collection === 'queries').length})</option>
              <option value="services">Services ({latestMessages.filter((m) => m.collection === 'services').length})</option>
            </select>
          </div>

          {/* Schema Type Filter */}
          <div className="mb-3">
            <label htmlFor="schemaType" className="block text-xs font-medium text-gray-700 mb-1.5">
              Schema Format
            </label>
            <select
              id="schemaType"
              value={selectedSchemaType}
              onChange={(e) => onSchemaTypeChange(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs px-2.5 py-1.5 border"
            >
              <option value="all">All Formats</option>
              {schemaTypes.map((type) => (
                <option key={type} value={type}>
                  {getSchemaTypeLabel(type)} ({latestMessages.filter((m) => m.schemaExtension?.toLowerCase() === type).length})
                </option>
              ))}
            </select>
          </div>

          {/* Active filters */}
          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-1.5">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                    {searchQuery.substring(0, 15)}
                    {searchQuery.length > 15 ? '...' : ''}
                    <button onClick={() => onSearchChange('')}>
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                    {selectedType}
                    <button onClick={() => onTypeChange('all')}>
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedSchemaType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                    {getSchemaTypeLabel(selectedSchemaType)}
                    <button onClick={() => onSchemaTypeChange('all')}>
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    onSearchChange('');
                    onTypeChange('all');
                    onSchemaTypeChange('all');
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
