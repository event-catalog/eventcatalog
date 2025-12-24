import { useState, useMemo, useEffect, useRef } from 'react';
import { DocumentTextIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/solid';
import type { CollectionMessageTypes } from '@types';

// Specification file types (OpenAPI, AsyncAPI, GraphQL)
const SPEC_TYPES = ['openapi', 'asyncapi', 'graphql'];
import semver from 'semver';
import SchemaListItem from './SchemaListItem';
import SchemaDetailsPanel from './SchemaDetailsPanel';
import Pagination from './Pagination';
import type { SchemaItem } from './types';

interface SchemaExplorerProps {
  schemas: SchemaItem[];
  apiAccessEnabled?: boolean;
}

export default function SchemaExplorer({ schemas, apiAccessEnabled = false }: SchemaExplorerProps) {
  const [searchQuery, setSearchQuery] = useState(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistrySearchQuery');
      return stored !== null ? stored : '';
    }
    return '';
  });
  const [selectedTypes, setSelectedTypes] = useState<Set<CollectionMessageTypes | 'specifications'>>(() => {
    // Load from localStorage
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
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistrySelectedSchemaType');
      return stored !== null ? stored : 'all';
    }
    return 'all';
  });
  const [selectedMessage, setSelectedMessage] = useState<SchemaItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const ITEMS_PER_PAGE = 50;

  // Function to update URL with query params
  const updateUrlParams = (message: SchemaItem) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    params.set('id', message.data.id);
    params.set('version', message.data.version);
    params.set('collection', message.collection);

    // For services, add spec type
    if (message.collection === 'services') {
      params.set('specType', message.specType || 'unknown');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Group messages by ID (and spec type for services) and get all versions
  const messagesByIdAndVersions = useMemo(() => {
    const grouped = new Map<string, SchemaItem[]>();
    schemas.forEach((message) => {
      // For services, group by ID + spec type to keep different specs separate
      const groupKey =
        message.collection === 'services' ? `${message.data.id}__${message.specType || 'unknown'}` : message.data.id;

      const existingVersions = grouped.get(groupKey) || [];
      grouped.set(groupKey, [...existingVersions, message]);
    });

    // Sort versions for each ID (descending - latest first)
    grouped.forEach((versions, id) => {
      versions.sort((a, b) => {
        const aVersion = a.data.version;
        const bVersion = b.data.version;

        // Try to use semver for comparison
        const aValid = semver.valid(semver.coerce(aVersion));
        const bValid = semver.valid(semver.coerce(bVersion));

        if (aValid && bValid) {
          return semver.rcompare(aValid, bValid); // descending order
        }

        // Fall back to numeric comparison
        const aNum = parseFloat(aVersion);
        const bNum = parseFloat(bVersion);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return bNum - aNum;
        }

        // Final fallback to string comparison
        return bVersion.localeCompare(aVersion);
      });
      grouped.set(id, versions);
    });

    return grouped;
  }, [schemas]);

  // Get latest version for each message (for sidebar display)
  const latestMessages = useMemo(() => {
    return Array.from(messagesByIdAndVersions.values()).map((versions) => versions[0]);
  }, [messagesByIdAndVersions]);

  // Get unique schema types
  const schemaTypes = useMemo(() => {
    const types = new Set<string>();
    latestMessages.forEach((msg) => {
      if (msg.schemaExtension) {
        types.add(msg.schemaExtension.toLowerCase());
      }
    });
    return Array.from(types).sort();
  }, [latestMessages]);

  // Filter messages (using latest versions only)
  const filteredMessages = useMemo(() => {
    let result = [...latestMessages];

    // Filter by message types (multi-select)
    if (selectedTypes.size > 0) {
      result = result.filter((msg) => {
        // Check if message matches any selected collection type
        if (selectedTypes.has(msg.collection as CollectionMessageTypes)) {
          return true;
        }
        // Check if 'specifications' is selected and this is a spec file
        if (selectedTypes.has('specifications') && SPEC_TYPES.includes(msg.schemaExtension?.toLowerCase() || '')) {
          return true;
        }
        return false;
      });
    }

    // Filter by schema type
    if (selectedSchemaType !== 'all') {
      result = result.filter((msg) => msg.schemaExtension?.toLowerCase() === selectedSchemaType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (msg) =>
          msg.data.name?.toLowerCase().includes(query) ||
          msg.data.summary?.toLowerCase().includes(query) ||
          msg.data.id?.toLowerCase().includes(query)
      );
    }

    // Sort by name alphabetically
    result.sort((a, b) => {
      const nameA = a.data.name?.toLowerCase() || '';
      const nameB = b.data.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [latestMessages, searchQuery, selectedTypes, selectedSchemaType]);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTypes, selectedSchemaType]);

  // Load from query string on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const version = params.get('version');
    const collection = params.get('collection');
    const specType = params.get('specType');

    if (id && version) {
      // Find the matching message
      const matchingMessage = schemas.find((msg) => {
        const idMatch = msg.data.id === id;
        const versionMatch = msg.data.version === version;
        const collectionMatch = !collection || msg.collection === collection;

        // For services, also match spec type
        if (msg.collection === 'services') {
          const specTypeMatch = !specType || msg.specType === specType;
          return idMatch && versionMatch && collectionMatch && specTypeMatch;
        }

        return idMatch && versionMatch && collectionMatch;
      });

      if (matchingMessage) {
        setSelectedMessage(matchingMessage);
        setSelectedVersion(matchingMessage.data.version);

        // Scroll to the selected item after a brief delay to ensure DOM is ready
        setTimeout(() => {
          if (selectedItemRef.current) {
            selectedItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [schemas]);

  // Auto-select first message when filters change (only if no query params)
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

  // Get the message to display (based on selected version)
  const displayMessage = useMemo(() => {
    if (!selectedMessage) return null;

    // For services, use compound key (ID + spec type), otherwise just ID
    const groupKey =
      selectedMessage.collection === 'services'
        ? `${selectedMessage.data.id}__${selectedMessage.specType || 'unknown'}`
        : selectedMessage.data.id;

    const versions = messagesByIdAndVersions.get(groupKey);
    if (!versions) return selectedMessage;

    // If no version selected, use the latest (which is the first in the sorted array)
    if (!selectedVersion) return versions[0];

    // Find the message with the selected version
    const versionedMessage = versions.find((v) => v.data.version === selectedVersion);
    return versionedMessage || versions[0];
  }, [selectedMessage, selectedVersion, messagesByIdAndVersions]);

  // Save filter states to localStorage
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

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
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

  // Get available versions for the selected message
  const availableVersions = useMemo(() => {
    if (!displayMessage) return [];
    const groupKey =
      displayMessage.collection === 'services'
        ? `${displayMessage.data.id}__${displayMessage.specType || 'unknown'}`
        : displayMessage.data.id;
    return messagesByIdAndVersions.get(groupKey) || [displayMessage];
  }, [displayMessage, messagesByIdAndVersions]);

  const handleVersionChange = (newVersion: string) => {
    setSelectedVersion(newVersion);
    // Update URL with new version
    const versionedMessage = availableVersions.find((v) => v.data.version === newVersion);
    if (versionedMessage) {
      updateUrlParams(versionedMessage);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: latestMessages.length,
      events: latestMessages.filter((m) => m.collection === 'events').length,
      commands: latestMessages.filter((m) => m.collection === 'commands').length,
      queries: latestMessages.filter((m) => m.collection === 'queries').length,
      specifications: latestMessages.filter((m) => SPEC_TYPES.includes(m.schemaExtension?.toLowerCase() || '')).length,
    };
  }, [latestMessages]);

  // Toggle type selection (multi-select)
  const toggleType = (type: CollectionMessageTypes | 'specifications') => {
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

  // Clear all type filters
  const clearTypeFilters = () => {
    setSelectedTypes(new Set());
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Split View - Full Height */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Schema List */}
        <div className="w-[320px] flex-shrink-0 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Search Header */}
          <div className="flex-shrink-0 p-3 border-b border-gray-200">
            {/* Search + Format Filter Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search schemas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                    <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              {/* Format Dropdown */}
              {schemaTypes.length > 1 && (
                <select
                  value={selectedSchemaType}
                  onChange={(e) => setSelectedSchemaType(e.target.value)}
                  className="flex-shrink-0 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <option value="all">All formats</option>
                  {schemaTypes.map((type) => {
                    const labels: Record<string, string> = {
                      json: 'JSON',
                      asyncapi: 'AsyncAPI',
                      openapi: 'OpenAPI',
                      graphql: 'GraphQL',
                      avro: 'Avro',
                      proto: 'Protobuf',
                    };
                    return (
                      <option key={type} value={type}>
                        {labels[type] || type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Type Filter - Multi-select chips */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {stats.events > 0 && (
                <button
                  onClick={() => toggleType('events')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border ${
                    selectedTypes.has('events')
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Events"
                >
                  <BoltIcon className={`h-3.5 w-3.5 ${selectedTypes.has('events') ? 'text-orange-500' : 'text-orange-400'}`} />
                  <span>Events</span>
                  <span className={`tabular-nums ${selectedTypes.has('events') ? 'text-orange-500' : 'text-gray-400'}`}>
                    {stats.events}
                  </span>
                </button>
              )}
              {stats.commands > 0 && (
                <button
                  onClick={() => toggleType('commands')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border ${
                    selectedTypes.has('commands')
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Commands"
                >
                  <ChatBubbleLeftIcon
                    className={`h-3.5 w-3.5 ${selectedTypes.has('commands') ? 'text-blue-500' : 'text-blue-400'}`}
                  />
                  <span>Commands</span>
                  <span className={`tabular-nums ${selectedTypes.has('commands') ? 'text-blue-500' : 'text-gray-400'}`}>
                    {stats.commands}
                  </span>
                </button>
              )}
              {stats.queries > 0 && (
                <button
                  onClick={() => toggleType('queries')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border ${
                    selectedTypes.has('queries')
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Queries"
                >
                  <MagnifyingGlassSolidIcon
                    className={`h-3.5 w-3.5 ${selectedTypes.has('queries') ? 'text-green-500' : 'text-green-400'}`}
                  />
                  <span>Queries</span>
                  <span className={`tabular-nums ${selectedTypes.has('queries') ? 'text-green-500' : 'text-gray-400'}`}>
                    {stats.queries}
                  </span>
                </button>
              )}
              {stats.specifications > 0 && (
                <button
                  onClick={() => toggleType('specifications')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border ${
                    selectedTypes.has('specifications')
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Specifications (OpenAPI, AsyncAPI, etc.)"
                >
                  <CodeBracketIcon
                    className={`h-3.5 w-3.5 ${selectedTypes.has('specifications') ? 'text-purple-500' : 'text-purple-400'}`}
                  />
                  <span>Specs</span>
                  <span className={`tabular-nums ${selectedTypes.has('specifications') ? 'text-purple-500' : 'text-gray-400'}`}>
                    {stats.specifications}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Results Count Bar */}
          <div className="flex-shrink-0 px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {filteredMessages.length === stats.total
                ? `${stats.total} schemas`
                : `${filteredMessages.length} of ${stats.total} schemas`}
            </span>
            {(searchQuery || selectedTypes.size > 0 || selectedSchemaType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  clearTypeFilters();
                  setSelectedSchemaType('all');
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Schema List - Independently Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {paginatedMessages.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {paginatedMessages.map((message) => {
                  // For services, also check spec type to determine if selected
                  const isSelected =
                    message.collection === 'services'
                      ? selectedMessage?.data.id === message.data.id && selectedMessage?.specType === message.specType
                      : selectedMessage?.data.id === message.data.id;

                  // Get versions using compound key for services
                  const groupKey =
                    message.collection === 'services' ? `${message.data.id}__${message.specType || 'unknown'}` : message.data.id;

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
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                  <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No schemas found</h3>
                <p className="text-xs text-gray-500 mb-3 max-w-[200px]">
                  {searchQuery ? `No results for "${searchQuery}"` : 'Try adjusting your filters'}
                </p>
                {(searchQuery || selectedTypes.size > 0 || selectedSchemaType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      clearTypeFilters();
                      setSelectedSchemaType('all');
                    }}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>

        {/* Right: Schema Details */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
          {displayMessage ? (
            <SchemaDetailsPanel
              message={displayMessage}
              availableVersions={availableVersions}
              selectedVersion={selectedVersion}
              onVersionChange={handleVersionChange}
              apiAccessEnabled={apiAccessEnabled}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-xs">
                <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-50 border border-gray-100">
                  <DocumentTextIcon className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Select a schema</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
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
