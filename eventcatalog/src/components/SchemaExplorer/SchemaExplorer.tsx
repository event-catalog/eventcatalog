import { useState, useMemo, useEffect, useRef } from 'react';
import { DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline';
import type { CollectionMessageTypes } from '@types';
import semver from 'semver';
import SchemaFilters from './SchemaFilters';
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
  const [selectedType, setSelectedType] = useState<'all' | CollectionMessageTypes | 'services'>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistrySelectedType');
      return stored !== null ? (stored as 'all' | CollectionMessageTypes | 'services') : 'all';
    }
    return 'all';
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
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistryFiltersExpanded');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [isMounted, setIsMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const ITEMS_PER_PAGE = 50;

  // Set mounted state after hydration to prevent FOUC
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

    // Filter by message type
    if (selectedType !== 'all') {
      result = result.filter((msg) => msg.collection === selectedType);
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
  }, [latestMessages, searchQuery, selectedType, selectedSchemaType]);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedSchemaType]);

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

  // Save filter expanded state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemaRegistryFiltersExpanded', filtersExpanded.toString());
    }
  }, [filtersExpanded]);

  // Save filter states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemaRegistrySearchQuery', searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemaRegistrySelectedType', selectedType);
    }
  }, [selectedType]);

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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-gray-200 pb-2 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schema Explorer</h1>
          <p className="mt-0.5 text-xs text-gray-600">
            {filteredMessages.length} schema{filteredMessages.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Filters + Schema List */}
        <div className="w-1/3 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Filters */}
          <SchemaFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedSchemaType={selectedSchemaType}
            onSchemaTypeChange={setSelectedSchemaType}
            schemaTypes={schemaTypes}
            latestMessages={latestMessages}
            filtersExpanded={filtersExpanded}
            onToggleExpanded={() => setFiltersExpanded(!filtersExpanded)}
            searchInputRef={searchInputRef}
            isMounted={isMounted}
          />

          {/* Schema List - Independently Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {paginatedMessages.length > 0 ? (
              <div className="divide-y divide-gray-200">
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
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FunnelIcon className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No schemas found</h3>
                <p className="text-xs text-gray-500">Try adjusting your filters</p>
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
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Select a schema to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
