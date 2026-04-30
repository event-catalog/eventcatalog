import { FilterDropdown, CheckboxItem } from '../Tables/Discover/FilterComponents';

export interface FieldFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedFormats: string[];
  onFormatsChange: (values: string[]) => void;
  selectedMessageTypes: string[];
  onMessageTypesChange: (values: string[]) => void;
  sharedOnly: boolean;
  onSharedOnlyChange: (value: boolean) => void;
  conflictingOnly: boolean;
  onConflictingOnlyChange: (value: boolean) => void;
  facets: {
    formats: { value: string; count: number }[];
    messageTypes: { value: string; count: number }[];
  } | null;
  isScaleEnabled?: boolean;
}

export default function FieldFilters({
  selectedFormats,
  onFormatsChange,
  selectedMessageTypes,
  onMessageTypesChange,
  sharedOnly,
  onSharedOnlyChange,
  conflictingOnly,
  onConflictingOnlyChange,
  facets,
  isScaleEnabled = false,
}: FieldFiltersProps) {
  const toggleFormat = (value: string) => {
    if (selectedFormats.includes(value)) {
      onFormatsChange(selectedFormats.filter((f) => f !== value));
    } else {
      onFormatsChange([...selectedFormats, value]);
    }
  };

  const toggleMessageType = (value: string) => {
    if (selectedMessageTypes.includes(value)) {
      onMessageTypesChange(selectedMessageTypes.filter((t) => t !== value));
    } else {
      onMessageTypesChange([...selectedMessageTypes, value]);
    }
  };

  const activeFilterCount =
    selectedFormats.length + selectedMessageTypes.length + (sharedOnly ? 1 : 0) + (conflictingOnly ? 1 : 0);

  const clearAllFilters = () => {
    onFormatsChange([]);
    onMessageTypesChange([]);
    onSharedOnlyChange(false);
    onConflictingOnlyChange(false);
  };

  return (
    <div className="space-y-6">
      {/* Schema Format Filter */}
      {facets && facets.formats.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-[rgb(var(--ec-page-text)/0.8)] mb-1.5">Schema format</label>
          <FilterDropdown
            label="Select formats..."
            selectedItems={selectedFormats}
            onClear={() => onFormatsChange([])}
            onRemoveItem={(item) => toggleFormat(item)}
          >
            {facets.formats.map((format) => (
              <CheckboxItem
                key={format.value}
                label={format.value.charAt(0).toUpperCase() + format.value.slice(1)}
                checked={selectedFormats.includes(format.value)}
                onChange={() => toggleFormat(format.value)}
                count={format.count}
              />
            ))}
          </FilterDropdown>
        </div>
      )}

      {/* Message Type Filter */}
      {facets && facets.messageTypes.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-[rgb(var(--ec-page-text)/0.8)] mb-1.5">Message type</label>
          <FilterDropdown
            label="Select message types..."
            selectedItems={selectedMessageTypes}
            onClear={() => onMessageTypesChange([])}
            onRemoveItem={(item) => toggleMessageType(item)}
          >
            {facets.messageTypes.map((msgType) => (
              <CheckboxItem
                key={msgType.value}
                label={msgType.value.charAt(0).toUpperCase() + msgType.value.slice(1)}
                checked={selectedMessageTypes.includes(msgType.value)}
                onChange={() => toggleMessageType(msgType.value)}
                count={msgType.count}
              />
            ))}
          </FilterDropdown>
        </div>
      )}

      {/* Shared Fields Only Toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div
            className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
              sharedOnly
                ? 'bg-[rgb(var(--ec-accent))] border-[rgb(var(--ec-accent))]'
                : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg))] group-hover:border-[rgb(var(--ec-icon-color))]'
            }`}
            onClick={() => onSharedOnlyChange(!sharedOnly)}
          >
            {sharedOnly && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-[rgb(var(--ec-page-text))]" onClick={() => onSharedOnlyChange(!sharedOnly)}>
            Shared fields only
          </span>
        </label>
        <p className="text-[11px] text-[rgb(var(--ec-page-text-muted))] mt-1 ml-6">
          Show only fields that appear in multiple messages
        </p>
      </div>

      {/* Conflicting Fields Only Toggle */}
      {isScaleEnabled && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
                conflictingOnly
                  ? 'bg-amber-500 border-amber-500'
                  : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg))] group-hover:border-[rgb(var(--ec-icon-color))]'
              }`}
              onClick={() => onConflictingOnlyChange(!conflictingOnly)}
            >
              {conflictingOnly && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-[rgb(var(--ec-page-text))]" onClick={() => onConflictingOnlyChange(!conflictingOnly)}>
              Conflicting fields
            </span>
          </label>
          <p className="text-[11px] text-[rgb(var(--ec-page-text-muted))] mt-1 ml-6">
            Show only fields with inconsistent types across messages
          </p>
        </div>
      )}

      {/* Results & Clear */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-[rgb(var(--ec-page-border))]">
          <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">
            <span className="font-semibold text-[rgb(var(--ec-page-text))]">{activeFilterCount}</span> active{' '}
            {activeFilterCount === 1 ? 'filter' : 'filters'}
          </span>
          <button onClick={clearAllFilters} className="text-xs font-medium text-[rgb(var(--ec-accent))] hover:underline">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
