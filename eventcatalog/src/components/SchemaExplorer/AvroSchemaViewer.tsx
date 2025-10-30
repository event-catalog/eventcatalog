import { useState, useEffect, useRef } from 'react';

interface AvroSchemaViewerProps {
  schema: any;
  title?: string;
  maxHeight?: string;
  expand?: boolean | string;
  search?: boolean | string;
  onOpenFullscreen?: () => void;
}

interface AvroFieldProps {
  field: any;
  level: number;
  expand: boolean;
}

// Format Avro type for display
function formatAvroType(type: any): string {
  if (typeof type === 'string') {
    return type;
  }

  if (Array.isArray(type)) {
    // Union type - show all options
    return type.join(' | ');
  }

  if (typeof type === 'object') {
    if (type.type === 'array') {
      return `array<${formatAvroType(type.items)}>`;
    }
    if (type.type === 'map') {
      return `map<${formatAvroType(type.values)}>`;
    }
    if (type.type === 'record') {
      return `record: ${type.name || 'unnamed'}`;
    }
    if (type.type === 'enum') {
      return `enum: ${type.name || 'unnamed'}`;
    }
    if (type.logicalType) {
      return `${type.type} (${type.logicalType})`;
    }
    return type.type || 'unknown';
  }

  return 'unknown';
}

// Check if a type has nested fields
function hasNestedFields(type: any): boolean {
  if (typeof type === 'object' && !Array.isArray(type)) {
    return type.type === 'record' && type.fields && type.fields.length > 0;
  }
  return false;
}

// AvroField component - displays a single field with nested support
const AvroField = ({ field, level, expand }: AvroFieldProps) => {
  const [isExpanded, setIsExpanded] = useState(expand);
  const hasNested = hasNestedFields(field.type);
  const indentClass = `pl-${level * 4}`;

  useEffect(() => {
    setIsExpanded(expand);
  }, [expand]);

  return (
    <div className={`avro-field-container mb-2 border-l border-gray-200 ${indentClass}`}>
      <div className="flex items-start space-x-2">
        {/* Collapse/Expand button */}
        {hasNested ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="avro-field-toggle text-gray-500 hover:text-gray-700 pt-0.5 w-4 text-center flex-shrink-0"
            aria-expanded={isExpanded}
          >
            <span className="font-mono text-xs">{isExpanded ? '▼' : '▶'}</span>
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Field details */}
        <div className="flex-grow">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="avro-field-name font-semibold text-gray-800 text-sm">{field.name}</span>
            <span className="text-purple-600 font-mono text-xs">{formatAvroType(field.type)}</span>
          </div>

          {field.doc && <p className="text-gray-600 text-xs mt-1">{field.doc}</p>}

          {/* Show enum values if present */}
          {field.type?.type === 'enum' && field.type.symbols && (
            <div className="text-xs text-gray-500 mt-1">
              Values:{' '}
              {field.type.symbols.map((s: string) => (
                <code key={s} className="bg-gray-100 px-1 rounded mx-0.5">
                  {s}
                </code>
              ))}
            </div>
          )}

          {/* Nested fields for record types */}
          {hasNested && (
            <div className={`avro-nested-content mt-2 ${!isExpanded ? 'hidden' : ''}`}>
              {field.type.fields.map((nestedField: any) => (
                <AvroField key={nestedField.name} field={nestedField} level={level + 1} expand={expand} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main AvroSchemaViewer component
export default function AvroSchemaViewer({
  schema,
  title,
  maxHeight,
  expand = false,
  search = true,
  onOpenFullscreen,
}: AvroSchemaViewerProps) {
  const expandBool = expand === true || expand === 'true';
  const searchBool = search !== false && search !== 'false';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(expandBool);
  const [currentMatches, setCurrentMatches] = useState<HTMLElement[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fieldsContainerRef = useRef<HTMLDivElement>(null);

  const totalFields = schema?.fields?.length || 0;

  // Search functionality with highlighting
  useEffect(() => {
    if (!fieldsContainerRef.current) return;

    const fieldContainers = fieldsContainerRef.current.querySelectorAll('.avro-field-container');
    const matches: HTMLElement[] = [];

    if (searchQuery === '') {
      // Reset search
      fieldContainers.forEach((container) => {
        container.classList.remove('search-match', 'search-no-match', 'search-current-match', 'search-dimmed');
        const nameEl = container.querySelector('.avro-field-name');
        if (nameEl) {
          nameEl.innerHTML = nameEl.textContent || '';
        }
      });
      setCurrentMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const query = searchQuery.toLowerCase().trim();

    fieldContainers.forEach((container) => {
      const nameEl = container.querySelector('.avro-field-name');
      if (!nameEl) return;

      const fieldName = (nameEl.textContent || '').toLowerCase();

      if (fieldName.includes(query)) {
        container.classList.add('search-match');
        container.classList.remove('search-dimmed');
        matches.push(container as HTMLElement);

        // Highlight the search term
        const regex = new RegExp(`(${query})`, 'gi');
        nameEl.innerHTML = (nameEl.textContent || '').replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');

        // Expand parent containers
        let parent = container.parentElement;
        while (parent && parent !== fieldsContainerRef.current) {
          if (parent.classList.contains('avro-nested-content') && parent.classList.contains('hidden')) {
            const parentFieldContainer = parent.closest('.avro-field-container');
            if (parentFieldContainer) {
              const toggleBtn = parentFieldContainer.querySelector('.avro-field-toggle');
              if (toggleBtn && toggleBtn.getAttribute('aria-expanded') === 'false') {
                (toggleBtn as HTMLButtonElement).click();
              }
            }
          }
          // Remove dimming from parent containers
          if (parent.classList.contains('avro-field-container')) {
            parent.classList.remove('search-dimmed');
          }
          parent = parent.parentElement;
        }
      } else {
        container.classList.remove('search-match', 'search-current-match');
        container.classList.add('search-dimmed');
        nameEl.innerHTML = nameEl.textContent || '';
      }
    });

    setCurrentMatches(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery]);

  // Update match highlighting
  useEffect(() => {
    currentMatches.forEach((match, index) => {
      if (index === currentMatchIndex) {
        match.classList.add('search-current-match');
      } else {
        match.classList.remove('search-current-match');
      }
    });

    if (currentMatchIndex >= 0 && currentMatches[currentMatchIndex]) {
      currentMatches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIndex, currentMatches]);

  const handleExpandAll = () => {
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
  };

  const handlePrevMatch = () => {
    if (currentMatchIndex > 0) {
      setCurrentMatchIndex(currentMatchIndex - 1);
    }
  };

  const handleNextMatch = () => {
    if (currentMatchIndex < currentMatches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    }
  };

  if (!schema || schema.type !== 'record') {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p className="text-sm">Invalid Avro schema format</p>
      </div>
    );
  }

  const containerStyle = maxHeight
    ? { maxHeight: maxHeight.includes('px') ? maxHeight : `${maxHeight}px`, minHeight: '15em' }
    : {};

  const heightClass = maxHeight ? '' : 'h-full';
  const overflowClass = maxHeight ? 'overflow-hidden' : '';

  return (
    <div
      className={`${heightClass} ${overflowClass} flex flex-col bg-white border border-gray-100 rounded-md shadow-sm`}
      style={containerStyle}
    >
      {/* Toolbar */}
      {searchBool && (
        <div className="flex-shrink-0 bg-white pt-4 px-4 pb-3 border-b border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fields..."
                className="w-full px-3 py-1.5 pr-20 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handlePrevMatch();
                    } else {
                      handleNextMatch();
                    }
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={handlePrevMatch}
                  disabled={currentMatches.length === 0 || currentMatchIndex <= 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous match"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextMatch}
                  disabled={currentMatches.length === 0 || currentMatchIndex >= currentMatches.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next match"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenFullscreen && (
                <button
                  onClick={onOpenFullscreen}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  title="Open in fullscreen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 inline-block"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Collapse All
              </button>
              <div className="text-xs text-gray-500">
                {totalFields} {totalFields === 1 ? 'field' : 'fields'}
              </div>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-2 text-xs text-gray-600">
              {currentMatches.length > 0
                ? `${currentMatchIndex + 1} of ${currentMatches.length} ${currentMatches.length === 1 ? 'match' : 'matches'}`
                : 'No fields found'}
            </div>
          )}
        </div>
      )}

      {/* Schema info */}
      <div className="px-4 pt-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-sm font-medium text-gray-600">Record:</span>
          <span className="font-mono text-sm text-blue-600">{schema.name}</span>
          {schema.namespace && <span className="font-mono text-xs text-gray-500">({schema.namespace})</span>}
        </div>
        {schema.doc && <p className="text-gray-600 text-xs mb-4">{schema.doc}</p>}
      </div>

      {/* Fields */}
      <div ref={fieldsContainerRef} className="flex-1 px-4 pb-4 overflow-auto">
        {schema.fields && schema.fields.length > 0 ? (
          schema.fields.map((field: any) => <AvroField key={field.name} field={field} level={0} expand={expandAll} />)
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No fields defined</p>
          </div>
        )}

        {searchQuery && currentMatches.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p>No fields match your search</p>
              <p className="text-xs mt-1">Try a different search term or clear the search to see all fields</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .search-dimmed {
          opacity: 0.4;
          transition: opacity 0.2s ease;
        }

        .search-match {
          opacity: 1;
          transition: opacity 0.2s ease;
        }

        .search-current-match {
          background-color: rgba(59, 130, 246, 0.1);
          border-left: 3px solid #3b82f6;
          padding-left: 8px;
          margin-left: -11px;
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
