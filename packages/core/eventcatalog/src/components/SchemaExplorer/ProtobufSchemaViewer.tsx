import { useState, useEffect, useRef, useMemo } from 'react';
import type { ProtobufSchema, ProtobufMessage, ProtobufEnum, ProtobufField } from '@utils/protobuf-schema';

interface ProtobufSchemaViewerProps {
  schema: ProtobufSchema;
  title?: string;
  maxHeight?: string;
  expand?: boolean | string;
  search?: boolean | string;
  showRequired?: boolean | string;
  onOpenFullscreen?: () => void;
}

// Proto types are referenced by name (not nested inline like Avro), so we build
// a registry of every message/enum in the file to resolve field types against.
interface TypeRegistry {
  messages: Map<string, ProtobufMessage>;
  enums: Map<string, ProtobufEnum>;
}

function buildTypeRegistry(schema: ProtobufSchema): TypeRegistry {
  const registry: TypeRegistry = { messages: new Map(), enums: new Map() };

  const register = <T,>(map: Map<string, T>, qualifiedName: string, simpleName: string, value: T) => {
    map.set(qualifiedName, value);
    if (!map.has(simpleName)) map.set(simpleName, value);
  };

  const walk = (messages: ProtobufMessage[], enums: ProtobufEnum[], prefix: string) => {
    for (const protoEnum of enums) {
      register(registry.enums, prefix ? `${prefix}.${protoEnum.name}` : protoEnum.name, protoEnum.name, protoEnum);
    }
    for (const message of messages) {
      const qualifiedName = prefix ? `${prefix}.${message.name}` : message.name;
      register(registry.messages, qualifiedName, message.name, message);
      walk(message.messages, message.enums, qualifiedName);
    }
  };

  walk(schema.messages, schema.enums, '');
  return registry;
}

// Resolve a field type name against the registry, trying the name as written,
// without the package prefix, and by its last segment (e.g. "com.example.Order" -> "Order").
// Leading dots (fully-qualified references like ".com.example.Order") are stripped first.
function resolveTypeName(typeName: string, packageName: string | undefined): string[] {
  const normalized = typeName.startsWith('.') ? typeName.slice(1) : typeName;
  const candidates = [normalized];
  if (packageName && normalized.startsWith(`${packageName}.`)) {
    candidates.push(normalized.slice(packageName.length + 1));
  }
  const lastSegment = normalized.split('.').pop();
  if (lastSegment && lastSegment !== normalized) candidates.push(lastSegment);
  return candidates;
}

function lookupType<T>(map: Map<string, T>, typeName: string, packageName?: string): T | undefined {
  for (const candidate of resolveTypeName(typeName, packageName)) {
    const match = map.get(candidate);
    if (match) return match;
  }
  return undefined;
}

function formatProtobufType(field: ProtobufField): string {
  if (field.map) return field.type;
  return field.label ? `${field.label} ${field.type}` : field.type;
}

function countFields(messages: ProtobufMessage[]): number {
  return messages.reduce((total, message) => total + message.fields.length + countFields(message.messages), 0);
}

interface ProtobufFieldRowProps {
  field: ProtobufField;
  level: number;
  expand: boolean;
  showRequired?: boolean;
  registry: TypeRegistry;
  packageName?: string;
  ancestors: string[];
}

const ProtobufFieldRow = ({ field, level, expand, showRequired, registry, packageName, ancestors }: ProtobufFieldRowProps) => {
  const [isExpanded, setIsExpanded] = useState(expand);
  const indentationClass = `pl-${level * 3}`;

  // The type to drill into: map values and plain types can both reference messages
  const targetTypeName = field.map ? field.map.valueType : field.type;
  const nestedMessage = lookupType(registry.messages, targetTypeName, packageName);
  const nestedEnum = nestedMessage ? undefined : lookupType(registry.enums, targetTypeName, packageName);
  const isCyclic = nestedMessage ? ancestors.includes(nestedMessage.name) : false;
  const hasNested = !!nestedMessage && nestedMessage.fields.length > 0 && !isCyclic;
  const isRequired = field.label === 'required';

  useEffect(() => {
    setIsExpanded(expand);
  }, [expand]);

  return (
    <div className={`proto-field-container mb-1.5 border-l border-[rgb(var(--ec-page-border))] relative ${indentationClass}`}>
      <div className="flex items-start space-x-1.5">
        {hasNested ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
            className="proto-field-toggle text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] pt-0.5 focus:outline-hidden w-3 text-center flex-shrink-0"
          >
            <span className={`icon-collapsed font-mono text-xs ${isExpanded ? 'hidden' : ''}`}>&gt;</span>
            <span className={`icon-expanded font-mono text-xs ${!isExpanded ? 'hidden' : ''}`}>v</span>
          </button>
        ) : (
          <div className="w-3 h-4 flex-shrink-0" />
        )}

        <div className="flex-grow">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="proto-field-name font-semibold text-[rgb(var(--ec-page-text))] text-sm">{field.name}</span>
              <span className="ml-1.5 text-[rgb(var(--ec-accent))] font-mono text-xs">{formatProtobufType(field)}</span>
              {field.number !== undefined && (
                <span className="ml-1.5 text-[rgb(var(--ec-page-text-muted))] font-mono text-xs">= {field.number}</span>
              )}
              {field.oneof && (
                <span className="ml-1.5 text-[rgb(var(--ec-page-text-muted))] text-xs bg-[rgb(var(--ec-content-hover))] px-1 rounded">
                  oneof {field.oneof}
                </span>
              )}
            </div>
            {showRequired && isRequired && (
              <span className="text-red-600 dark:text-red-400 text-xs ml-3 flex-shrink-0">required</span>
            )}
          </div>

          {field.doc && <p className="text-[rgb(var(--ec-page-text-muted))] text-xs mt-0.5">{field.doc}</p>}

          {/* Show enum values if the field type resolves to an enum */}
          {nestedEnum && nestedEnum.values.length > 0 && (
            <div className="text-xs text-[rgb(var(--ec-page-text-muted))] mt-0.5">
              <span className="text-xs inline-block">Allowed values:</span>
              {nestedEnum.values.map((value) => (
                <span key={value.name} className="text-xs">
                  {' '}
                  <code className="bg-[rgb(var(--ec-content-hover))] px-1 rounded text-[rgb(var(--ec-page-text))] font-thin py-0.5">
                    {value.name}
                  </code>
                </span>
              ))}
            </div>
          )}

          {/* Nested fields for message types */}
          {hasNested && nestedMessage && (
            <div className={`proto-nested-content mt-1 ${!isExpanded ? 'hidden' : ''}`}>
              {nestedMessage.fields.map((nestedField) => (
                <ProtobufFieldRow
                  key={nestedField.name}
                  field={nestedField}
                  level={level + 1}
                  expand={expand}
                  showRequired={showRequired}
                  registry={registry}
                  packageName={packageName}
                  ancestors={[...ancestors, nestedMessage.name]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main ProtobufSchemaViewer component
export default function ProtobufSchemaViewer({
  schema,
  title,
  maxHeight,
  expand = false,
  search = true,
  showRequired = false,
  onOpenFullscreen,
}: ProtobufSchemaViewerProps) {
  const expandBool = expand === true || expand === 'true';
  const searchBool = search !== false && search !== 'false';
  const showRequiredBool = showRequired === true || showRequired === 'true';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(expandBool);
  const [currentMatches, setCurrentMatches] = useState<HTMLElement[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fieldsContainerRef = useRef<HTMLDivElement>(null);

  const registry = useMemo(() => (schema ? buildTypeRegistry(schema) : { messages: new Map(), enums: new Map() }), [schema]);
  const totalFields = useMemo(() => (schema ? countFields(schema.messages) : 0), [schema]);

  // Search functionality with highlighting
  useEffect(() => {
    if (!fieldsContainerRef.current) return;

    const fieldContainers = fieldsContainerRef.current.querySelectorAll('.proto-field-container');
    const matches: HTMLElement[] = [];

    if (searchQuery === '') {
      // Reset search
      fieldContainers.forEach((container) => {
        container.classList.remove('search-match', 'search-no-match', 'search-current-match', 'search-dimmed');
        const nameEl = container.querySelector('.proto-field-name');
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
      const nameEl = container.querySelector('.proto-field-name');
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
          if (parent.classList.contains('proto-nested-content') && parent.classList.contains('hidden')) {
            const parentFieldContainer = parent.closest('.proto-field-container');
            if (parentFieldContainer) {
              const toggleBtn = parentFieldContainer.querySelector('.proto-field-toggle');
              if (toggleBtn && toggleBtn.getAttribute('aria-expanded') === 'false') {
                (toggleBtn as HTMLButtonElement).click();
              }
            }
          }
          // Remove dimming from parent containers
          if (parent.classList.contains('proto-field-container')) {
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

  if (!schema || !Array.isArray(schema.messages)) {
    return (
      <div className="flex items-center justify-center p-8 text-[rgb(var(--ec-page-text-muted))]">
        <p className="text-sm">Invalid Protobuf schema format</p>
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
      className={`${heightClass} ${overflowClass} flex flex-col bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-md shadow-xs`}
      style={containerStyle}
    >
      {/* Toolbar */}
      {searchBool && (
        <div className="flex-shrink-0 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] pt-4 px-4 mb-4 pb-3 border-b border-[rgb(var(--ec-page-border))] shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fields..."
                className="w-full px-3 py-1.5 pr-20 text-sm border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-input-placeholder))] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))] focus:border-transparent"
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
                  className="p-1 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous match"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextMatch}
                  disabled={currentMatches.length === 0 || currentMatchIndex >= currentMatches.length - 1}
                  className="p-1 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed"
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
                  className="px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] rounded-md hover:bg-[rgb(var(--ec-content-active))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
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
                className="px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] rounded-md hover:bg-[rgb(var(--ec-content-active))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] rounded-md hover:bg-[rgb(var(--ec-content-active))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
              >
                Collapse All
              </button>
              <div className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                {totalFields} {totalFields === 1 ? 'field' : 'fields'}
              </div>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-2 text-xs text-[rgb(var(--ec-page-text-muted))]">
              {currentMatches.length > 0
                ? `${currentMatchIndex + 1} of ${currentMatches.length} ${currentMatches.length === 1 ? 'match' : 'matches'}`
                : 'No fields found'}
            </div>
          )}
        </div>
      )}

      {/* Messages and enums */}
      <div ref={fieldsContainerRef} className="flex-1 px-4 pb-4 overflow-auto">
        {(schema.package || schema.syntax) && (
          <div className="flex items-baseline gap-2 mb-4">
            {schema.package && (
              <>
                <span className="text-sm font-medium text-[rgb(var(--ec-page-text-muted))]">Package:</span>
                <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{schema.package}</span>
              </>
            )}
            {schema.syntax && <span className="font-mono text-xs text-[rgb(var(--ec-page-text-muted))]">({schema.syntax})</span>}
          </div>
        )}

        {schema.messages.length > 0 || schema.enums.length > 0 ? (
          <>
            {schema.messages.map((message) => (
              <div key={message.name} className="mt-4 first:mt-0">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm font-medium text-[rgb(var(--ec-page-text-muted))]">Message:</span>
                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{message.name}</span>
                </div>
                {message.doc && <p className="text-[rgb(var(--ec-page-text-muted))] text-xs mb-3">{message.doc}</p>}
                {message.fields.length > 0 ? (
                  message.fields.map((field) => (
                    <ProtobufFieldRow
                      key={field.name}
                      field={field}
                      level={0}
                      expand={expandAll}
                      showRequired={showRequiredBool}
                      registry={registry}
                      packageName={schema.package}
                      ancestors={[message.name]}
                    />
                  ))
                ) : (
                  <p className="text-xs text-[rgb(var(--ec-page-text-muted))] mb-2">No fields defined</p>
                )}
              </div>
            ))}

            {schema.enums.map((protoEnum) => (
              <div key={protoEnum.name} className="mt-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm font-medium text-[rgb(var(--ec-page-text-muted))]">Enum:</span>
                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{protoEnum.name}</span>
                </div>
                {protoEnum.doc && <p className="text-[rgb(var(--ec-page-text-muted))] text-xs mb-2">{protoEnum.doc}</p>}
                <div className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                  <span className="text-xs inline-block">Allowed values:</span>
                  {protoEnum.values.map((value) => (
                    <span key={value.name} className="text-xs">
                      {' '}
                      <code className="bg-[rgb(var(--ec-content-hover))] px-1 rounded text-[rgb(var(--ec-page-text))] font-thin py-0.5">
                        {value.name}
                      </code>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-8 text-[rgb(var(--ec-icon-color))]">
            <p className="text-sm">No messages defined</p>
          </div>
        )}

        {searchQuery && currentMatches.length === 0 && (
          <div className="text-center py-8">
            <div className="text-[rgb(var(--ec-icon-color))] text-sm">
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
