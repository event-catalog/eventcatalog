import { useState, useMemo, useEffect, useRef } from 'react';
import { AdjustmentsHorizontalIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { CollectionMessageTypes } from '@types';
import semver from 'semver';
import SchemaListItem from './SchemaListItem';
import SchemaDetailsPanel from './SchemaDetailsPanel';
import Pagination from './Pagination';
import type { SchemaItem } from './types';

// Specification file types (OpenAPI, AsyncAPI, GraphQL)
const SPEC_TYPES = ['openapi', 'asyncapi', 'graphql'];
const HIDDEN_FORMAT_FILTERS = new Set(['graphql', 'gql', 'yaml', 'yml']);
const SCHEMA_TYPE_LABELS: Record<string, string> = {
  json: 'JSON Schema',
  asyncapi: 'AsyncAPI',
  openapi: 'OpenAPI',
  graphql: 'GraphQL',
  avro: 'Avro',
  avsc: 'Avro',
  proto: 'Protobuf',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  xsd: 'XML Schema',
};

/** Resolve the spec filename for a schema item, with consistent fallback. */
function getSpecFile(item: SchemaItem): string {
  return item.specFilenameWithoutExtension || item.specName || '';
}

/**
 * Build a unique group key for a schema item.
 * For services, includes spec type and filename to disambiguate
 * multiple specs of the same type (e.g. two OpenAPI specs).
 */
function getGroupKey(item: SchemaItem): string {
  if (item.collection === 'services') {
    return `${item.data.id}__${item.specType || 'unknown'}__${getSpecFile(item)}`;
  }
  return item.data.id;
}

interface SchemaExplorerProps {
  schemas: SchemaItem[];
  apiAccessEnabled?: boolean;
}

export default function SchemaExplorer({ schemas, apiAccessEnabled = false }: SchemaExplorerProps) {
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistrySearchQuery');
      return stored !== null ? stored : '';
    }
    return '';
  });

  const [selectedTypes, setSelectedTypes] = useState<Set<CollectionMessageTypes | 'specifications' | 'data-contracts'>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistrySelectedTypes');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return new Set(parsed);
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  const [selectedSchemaType, setSelectedSchemaType] = useState<'all' | string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistrySelectedSchemaType');
      return stored !== null ? stored : 'all';
    }
    return 'all';
  });

  const [showFormatFilters, setShowFormatFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistrySelectedSchemaType');
      return stored !== null && stored !== 'all';
    }
    return false;
  });

  const [selectedMessage, setSelectedMessage] = useState<SchemaItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 50;

  const updateUrlParams = (message: SchemaItem) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    params.set('id', message.data.id);
    params.set('version', message.data.version);
    params.set('collection', message.collection);

    if (message.collection === 'services') {
      params.set('specType', message.specType || 'unknown');
      const specFile = getSpecFile(message);
      if (specFile) {
        params.set('specFilename', specFile);
      }
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const messagesByIdAndVersions = useMemo(() => {
    const grouped = new Map<string, SchemaItem[]>();

    schemas.forEach((message) => {
      const groupKey = getGroupKey(message);
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.push(message);
      } else {
        grouped.set(groupKey, [message]);
      }
    });

    grouped.forEach((versions, id) => {
      versions.sort((a, b) => {
        const aVersion = a.data.version;
        const bVersion = b.data.version;
        const aValid = semver.valid(semver.coerce(aVersion));
        const bValid = semver.valid(semver.coerce(bVersion));

        if (aValid && bValid) {
          return semver.rcompare(aValid, bValid);
        }

        const aNum = parseFloat(aVersion);
        const bNum = parseFloat(bVersion);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return bNum - aNum;
        }

        return bVersion.localeCompare(aVersion);
      });

      grouped.set(id, versions);
    });

    return grouped;
  }, [schemas]);

  const latestMessages = useMemo(() => {
    return Array.from(messagesByIdAndVersions.values()).map((versions) => versions[0]);
  }, [messagesByIdAndVersions]);

  const schemaTypes = useMemo(() => {
    const types = new Set<string>();
    latestMessages.forEach((msg) => {
      if (msg.schemaExtension && !HIDDEN_FORMAT_FILTERS.has(msg.schemaExtension.toLowerCase())) {
        types.add(msg.schemaExtension.toLowerCase());
      }
    });
    return Array.from(types).sort();
  }, [latestMessages]);

  const filteredMessages = useMemo(() => {
    let result = [...latestMessages];

    if (selectedTypes.size > 0) {
      result = result.filter((msg) => {
        if (selectedTypes.has(msg.collection as CollectionMessageTypes)) {
          return true;
        }
        if (selectedTypes.has('specifications') && SPEC_TYPES.includes(msg.schemaExtension?.toLowerCase() || '')) {
          return true;
        }
        if (selectedTypes.has('data-contracts') && msg.collection === 'data-products') {
          return true;
        }
        return false;
      });
    }

    if (selectedSchemaType !== 'all') {
      result = result.filter((msg) => msg.schemaExtension?.toLowerCase() === selectedSchemaType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (msg) =>
          msg.data.name?.toLowerCase().includes(query) ||
          msg.data.summary?.toLowerCase().includes(query) ||
          msg.data.id?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      const nameA = a.data.name?.toLowerCase() || '';
      const nameB = b.data.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [latestMessages, searchQuery, selectedTypes, selectedSchemaType]);

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTypes, selectedSchemaType]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const version = params.get('version');
    const collection = params.get('collection');
    const specType = params.get('specType');
    const specFilename = params.get('specFilename');

    if (id && version) {
      const matchingMessage = schemas.find((msg) => {
        const idMatch = msg.data.id === id;
        const versionMatch = msg.data.version === version;
        const collectionMatch = !collection || msg.collection === collection;

        if (msg.collection === 'services') {
          const specTypeMatch = !specType || msg.specType === specType;
          const msgSpecFile = getSpecFile(msg);
          const specFilenameMatch = !specFilename || msgSpecFile === specFilename;
          return idMatch && versionMatch && collectionMatch && specTypeMatch && specFilenameMatch;
        }

        return idMatch && versionMatch && collectionMatch;
      });

      if (matchingMessage) {
        setSelectedMessage(matchingMessage);
        setSelectedVersion(matchingMessage.data.version);

        setTimeout(() => {
          if (selectedItemRef.current) {
            selectedItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [schemas]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const hasQueryParams = params.has('id');

    if (filteredMessages.length > 0 && !selectedMessage && !hasQueryParams) {
      const firstMessage = filteredMessages[0];
      setSelectedMessage(firstMessage);
      setSelectedVersion(firstMessage.data.version);
    }
  }, [filteredMessages, selectedMessage]);

  const displayMessage = useMemo(() => {
    if (!selectedMessage) return null;

    const groupKey = getGroupKey(selectedMessage);
    const versions = messagesByIdAndVersions.get(groupKey);

    if (!versions) return selectedMessage;
    if (!selectedVersion) return versions[0];

    const versionedMessage = versions.find((v) => v.data.version === selectedVersion);
    return versionedMessage || versions[0];
  }, [selectedMessage, selectedVersion, messagesByIdAndVersions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemaRegistrySearchQuery', searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemaRegistrySelectedTypes', JSON.stringify(Array.from(selectedTypes)));
    }
  }, [selectedTypes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemaRegistrySelectedSchemaType', selectedSchemaType);
    }
  }, [selectedSchemaType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const availableVersions = useMemo(() => {
    if (!displayMessage) return [];
    const groupKey = getGroupKey(displayMessage);
    return messagesByIdAndVersions.get(groupKey) || [displayMessage];
  }, [displayMessage, messagesByIdAndVersions]);

  const selectedGroupKey = useMemo(() => (selectedMessage ? getGroupKey(selectedMessage) : null), [selectedMessage]);

  const handleVersionChange = (newVersion: string) => {
    setSelectedVersion(newVersion);
    const versionedMessage = availableVersions.find((v) => v.data.version === newVersion);
    if (versionedMessage) {
      updateUrlParams(versionedMessage);
    }
  };

  const stats = useMemo(() => {
    return {
      total: latestMessages.length,
      events: latestMessages.filter((m) => m.collection === 'events').length,
      commands: latestMessages.filter((m) => m.collection === 'commands').length,
      queries: latestMessages.filter((m) => m.collection === 'queries').length,
      specifications: latestMessages.filter((m) => SPEC_TYPES.includes(m.schemaExtension?.toLowerCase() || '')).length,
      dataContracts: latestMessages.filter((m) => m.collection === 'data-products').length,
    };
  }, [latestMessages]);

  const toggleType = (type: CollectionMessageTypes | 'specifications' | 'data-contracts') => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const clearTypeFilters = () => {
    setSelectedTypes(new Set());
  };

  const hasActiveFilters = searchQuery.length > 0 || selectedTypes.size > 0 || selectedSchemaType !== 'all';
  const activeFilterCount = (selectedTypes.size > 0 ? 1 : 0) + (selectedSchemaType !== 'all' ? 1 : 0);
  const collectionTabs = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'events', label: 'Events', count: stats.events },
    { key: 'commands', label: 'Commands', count: stats.commands },
    { key: 'queries', label: 'Queries', count: stats.queries },
    { key: 'specifications', label: 'Specs', count: stats.specifications },
    { key: 'data-contracts', label: 'Contracts', count: stats.dataContracts },
  ].filter((tab) => tab.count > 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: '[data-theme="dark"] .schema-icon { filter: brightness(1.8) saturate(0.8); }',
        }}
      />
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
        <div
          className="fixed top-0 z-20 flex h-screen flex-col overflow-hidden border-r border-[rgb(var(--ec-page-border))] bg-linear-to-b from-[rgb(var(--ec-page-bg))] via-[rgb(var(--ec-page-bg))] to-[rgb(var(--ec-accent)/0.06)]"
          style={{ left: 'var(--ec-vertical-nav-width)', width: 'var(--ec-schema-sidebar-width, 360px)' }}
        >
          <div className="flex h-[60px] flex-shrink-0 items-center justify-between gap-2 border-b border-[rgb(var(--ec-page-border))] px-4">
            <div className="relative min-w-0 flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-4 w-4 text-[rgb(var(--ec-icon-color))]" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[rgb(var(--ec-dropdown-border))] bg-[rgb(var(--ec-dropdown-bg))] py-2 pl-9 pr-3 text-[12px] text-[rgb(var(--ec-page-text))] placeholder:text-[rgb(var(--ec-icon-color))] transition-all focus:border-[rgb(var(--ec-accent))] focus:outline-hidden focus:ring-1 focus:ring-[rgb(var(--ec-accent)/0.3)]"
              />
            </div>

            {schemaTypes.length > 0 && (
              <button
                onClick={() => setShowFormatFilters((prev) => !prev)}
                aria-pressed={showFormatFilters || selectedSchemaType !== 'all'}
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                  showFormatFilters || selectedSchemaType !== 'all'
                    ? 'border-[rgb(var(--ec-accent)/0.5)] bg-[rgb(var(--ec-accent))] text-white shadow-[0_10px_28px_rgb(var(--ec-accent)/0.3)]'
                    : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] text-[rgb(var(--ec-page-text-muted))] hover:border-[rgb(var(--ec-page-text-muted)/0.45)] hover:text-[rgb(var(--ec-page-text))]'
                }`}
              >
                <AdjustmentsHorizontalIcon className="h-4.5 w-4.5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[rgb(var(--ec-page-bg))] bg-[rgb(var(--ec-page-text))] px-1 text-[10px] font-semibold tabular-nums text-[rgb(var(--ec-page-bg))]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {(showFormatFilters || selectedSchemaType !== 'all' || selectedTypes.size > 0) && (
            <div className="flex-shrink-0 border-b border-[rgb(var(--ec-page-border))] px-4 py-3">
              <div className="rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover)/0.45)] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--ec-page-text-muted))]">
                    Filters
                  </span>
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        clearTypeFilters();
                        setSelectedSchemaType('all');
                      }}
                      className="text-[11px] font-medium text-[rgb(var(--ec-accent))] hover:opacity-80"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--ec-page-text-muted))]">
                    Type
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {collectionTabs.map((tab) => {
                      const isAll = tab.key === 'all';
                      const isActive = isAll ? selectedTypes.size === 0 : selectedTypes.has(tab.key as CollectionMessageTypes);

                      return (
                        <button
                          key={tab.key}
                          onClick={() => {
                            if (isAll) {
                              clearTypeFilters();
                              return;
                            }
                            toggleType(tab.key as CollectionMessageTypes | 'specifications' | 'data-contracts');
                          }}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                            isActive
                              ? 'border-[rgb(var(--ec-accent)/0.5)] bg-[rgb(var(--ec-accent)/0.16)] text-[rgb(var(--ec-page-text))] shadow-[0_0_0_1px_rgb(var(--ec-accent)/0.2)]'
                              : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] text-[rgb(var(--ec-page-text-muted))] hover:border-[rgb(var(--ec-page-text-muted)/0.3)] hover:text-[rgb(var(--ec-page-text))]'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`rounded-sm px-1 py-0.5 text-[8px] font-semibold tabular-nums ${
                              isActive
                                ? 'bg-[rgb(var(--ec-accent)/0.18)] text-[rgb(var(--ec-page-text))]'
                                : 'bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text-muted))]'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {schemaTypes.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--ec-page-text-muted))]">
                        Format
                      </span>
                      {selectedSchemaType !== 'all' && (
                        <button
                          onClick={() => setSelectedSchemaType('all')}
                          className="text-[10px] font-medium text-[rgb(var(--ec-accent))] hover:opacity-80"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedSchemaType('all')}
                        className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                          selectedSchemaType === 'all'
                            ? 'border-[rgb(var(--ec-accent)/0.45)] bg-[rgb(var(--ec-accent)/0.16)] text-[rgb(var(--ec-page-text))]'
                            : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
                        }`}
                      >
                        All formats
                      </button>
                      {schemaTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedSchemaType(selectedSchemaType === type ? 'all' : type)}
                          className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                            selectedSchemaType === type
                              ? 'border-[rgb(var(--ec-accent)/0.45)] bg-[rgb(var(--ec-accent)/0.16)] text-[rgb(var(--ec-page-text))]'
                              : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
                          }`}
                        >
                          {SCHEMA_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {paginatedMessages.length > 0 ? (
              <div className="space-y-3">
                {paginatedMessages.map((message) => {
                  const groupKey = getGroupKey(message);
                  const isSelected = selectedGroupKey === groupKey;
                  const versions = messagesByIdAndVersions.get(groupKey) || [message];

                  return (
                    <SchemaListItem
                      key={groupKey}
                      message={message}
                      isSelected={isSelected}
                      versions={versions}
                      onClick={() => {
                        setSelectedMessage(message);
                        setSelectedVersion(message.data.version);
                        updateUrlParams(message);
                      }}
                      itemRef={isSelected ? selectedItemRef : undefined}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[rgb(var(--ec-page-border))] p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--ec-content-hover))]">
                  <MagnifyingGlassIcon className="h-5 w-5 text-[rgb(var(--ec-icon-color))]" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-[rgb(var(--ec-page-text))]">No schemas found</h3>
                <p className="mb-4 max-w-[220px] text-sm leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                  {searchQuery ? `No results for "${searchQuery}"` : 'Try adjusting your filters'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      clearTypeFilters();
                      setSelectedSchemaType('all');
                    }}
                    className="text-sm font-medium text-[rgb(var(--ec-accent))] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>

        <div
          className="flex-1 min-h-0 min-w-0 overflow-hidden bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]"
          style={{ marginLeft: 'var(--ec-schema-sidebar-width, 360px)' }}
        >
          {displayMessage ? (
            <SchemaDetailsPanel
              message={displayMessage}
              availableVersions={availableVersions}
              selectedVersion={selectedVersion}
              onVersionChange={handleVersionChange}
              apiAccessEnabled={apiAccessEnabled}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-xs text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--ec-content-hover))]">
                  <DocumentTextIcon className="h-7 w-7 text-[rgb(var(--ec-icon-color))]" />
                </div>
                <h3 className="mb-1 text-base font-semibold text-[rgb(var(--ec-page-text))]">Select a schema</h3>
                <p className="text-sm leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                  Choose a schema from the list to view details, compare versions, and access raw code
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
