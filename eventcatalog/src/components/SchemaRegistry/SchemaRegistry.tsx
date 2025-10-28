import { useState, useMemo, useEffect, useRef } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, ClipboardDocumentIcon, PencilSquareIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, CodeBracketIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';
import { getCollectionStyles } from '@components/Grids/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import JSONSchemaViewer from './JSONSchemaViewer';

interface SchemaRegistryProps {
  messages: Array<CollectionEntry<CollectionMessageTypes> & {
    schemaContent?: string;
    schemaExtension?: string;
  }>;
}

export default function SchemaRegistry({ messages }: SchemaRegistryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | CollectionMessageTypes>('all');
  const [selectedSchemaType, setSelectedSchemaType] = useState<'all' | string>('all');
  const [selectedMessage, setSelectedMessage] = useState<typeof messages[0] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    // Load from localStorage, default to true
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemaRegistryFiltersExpanded');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [schemaViewMode, setSchemaViewMode] = useState<'code' | 'schema'>('code');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 50; // Increased for better performance with large datasets

  // Get unique schema types
  const schemaTypes = useMemo(() => {
    const types = new Set<string>();
    messages.forEach((msg) => {
      if (msg.schemaExtension) {
        types.add(msg.schemaExtension.toLowerCase());
      }
    });
    return Array.from(types).sort();
  }, [messages]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    let result = [...messages];

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

    return result;
  }, [messages, searchQuery, selectedType, selectedSchemaType]);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedSchemaType]);

  // Auto-select first message when filters change
  useEffect(() => {
    if (filteredMessages.length > 0 && !selectedMessage) {
      setSelectedMessage(filteredMessages[0]);
    }
  }, [filteredMessages, selectedMessage]);

  // Save filter expanded state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemaRegistryFiltersExpanded', filtersExpanded.toString());
    }
  }, [filtersExpanded]);

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

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadSchema = (content: string, filename: string, extension: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageForHighlight = (extension?: string): string => {
    if (!extension) return 'json';
    const ext = extension.toLowerCase();
    switch (ext) {
      case 'avro':
      case 'avsc':
      case 'json':
        return 'json';
      case 'proto':
        return 'protobuf';
      case 'xsd':
      case 'xml':
        return 'xml';
      case 'graphql':
      case 'gql':
        return 'graphql';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'ts':
      case 'typescript':
        return 'typescript';
      case 'js':
      case 'javascript':
        return 'javascript';
      default:
        return 'json';
    }
  };

  const getSchemaTypeLabel = (extension?: string): string => {
    if (!extension) return 'JSON';
    const ext = extension.toLowerCase();
    switch (ext) {
      case 'avro':
      case 'avsc':
        return 'Avro';
      case 'proto':
        return 'Protobuf';
      case 'xsd':
        return 'XML Schema';
      case 'graphql':
      case 'gql':
        return 'GraphQL';
      case 'yaml':
      case 'yml':
        return 'YAML';
      case 'json':
        return 'JSON Schema';
      default:
        return ext.toUpperCase();
    }
  };

  const renderSchemaDetails = (message: typeof messages[0]) => {
    const { color, Icon } = getCollectionStyles(message.collection);
    const isCopied = copiedId === message.data.id;

    // Check if this is a JSON schema
    const isJSONSchema = message.schemaExtension?.toLowerCase() === 'json' && message.schemaContent;
    let parsedSchema = null;

    if (isJSONSchema) {
      try {
        parsedSchema = JSON.parse(message.schemaContent);
        // Check if it's actually a JSON Schema (has properties or $schema field)
        if (!parsedSchema.properties && !parsedSchema.$schema && !parsedSchema.type) {
          parsedSchema = null;
        }
      } catch {
        parsedSchema = null;
      }
    }

    return (
      <div className="h-full flex flex-col bg-white overflow-hidden">
        {/* Compact Header */}
        <div className="flex-shrink-0 border-b border-gray-200 p-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`h-5 w-5 text-${color}-500 flex-shrink-0`} />
                <a
                  href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
                  className={`text-lg font-semibold text-gray-900 hover:text-${color}-600 hover:underline truncate`}
                >
                  {message.data.name}
                </a>
                <span className="text-xs text-gray-500 flex-shrink-0">v{message.data.version}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`inline-flex items-center rounded-full bg-${color}-100 px-2 py-0.5 text-xs font-medium text-${color}-800`}>
                  {message.collection}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                  {getSchemaTypeLabel(message.schemaExtension)}
                </span>
              </div>
              {message.data.summary && <p className="text-xs text-gray-600 line-clamp-2">{message.data.summary}</p>}
            </div>
          </div>

          {/* Action Buttons - More Compact */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle for JSON Schemas */}
            {parsedSchema && (
              <div className="flex items-center gap-1 mr-2 border-r border-gray-300 pr-2">
                <button
                  onClick={() => setSchemaViewMode('code')}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                    schemaViewMode === 'code'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Code view"
                >
                  <CodeBracketIcon className="h-3.5 w-3.5" />
                  Code
                </button>
                <button
                  onClick={() => setSchemaViewMode('schema')}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                    schemaViewMode === 'schema'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Schema view"
                >
                  <TableCellsIcon className="h-3.5 w-3.5" />
                  Schema
                </button>
              </div>
            )}

            <button
              onClick={() => message.schemaContent && copyToClipboard(message.schemaContent, message.data.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
              title="Copy schema to clipboard"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              {isCopied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() =>
                message.schemaContent &&
                downloadSchema(message.schemaContent, message.data.id, message.schemaExtension || 'json')
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              title="Download schema file"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download
            </button>
            <a
              href={`mailto:?subject=Schema Change Request: ${message.data.name}&body=I would like to request a change to the schema for ${message.data.name} (${message.collection})%0D%0A%0D%0AMessage: ${buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              title="Request schema change"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Request
            </a>
            <a
              href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ml-auto"
              title="View full documentation"
            >
              View Docs →
            </a>
          </div>
        </div>

        {/* Schema Content - Takes full remaining height */}
        <div className="flex-1 overflow-hidden">
          {message.schemaContent ? (
            parsedSchema && schemaViewMode === 'schema' ? (
              <JSONSchemaViewer schema={parsedSchema} />
            ) : (
              <div className="h-full overflow-auto p-3">
                <SyntaxHighlighter
                  language={getLanguageForHighlight(message.schemaExtension)}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    height: '100%',
                    overflow: 'auto',
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {message.schemaContent}
                </SyntaxHighlighter>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p className="text-sm">No schema content available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-gray-200 pb-2 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schema Registry</h1>
          <p className="mt-0.5 text-xs text-gray-600">
            {filteredMessages.length} schema{filteredMessages.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left: Filters + Schema List */}
          <div className="w-1/3 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Filters in left column */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
              {/* Filter Header */}
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-900">Filters</span>
                  {(searchQuery || selectedType !== 'all' || selectedSchemaType !== 'all') && (
                    <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                      {[searchQuery, selectedType !== 'all', selectedSchemaType !== 'all'].filter(Boolean).length}
                    </span>
                  )}
                </div>
                {filtersExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                )}
              </button>

              {/* Collapsible Filter Content */}
              {filtersExpanded && (
                <div className="p-3 pt-0">
                  {/* Search */}
                  <div className="mb-3">
                <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">⌘K</kbd>
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs pl-8 pr-8 py-1.5 border"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5"
                    >
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
                  onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs px-2.5 py-1.5 border"
                >
                  <option value="all">All ({messages.length})</option>
                  <option value="events">Events ({messages.filter(m => m.collection === 'events').length})</option>
                  <option value="commands">Commands ({messages.filter(m => m.collection === 'commands').length})</option>
                  <option value="queries">Queries ({messages.filter(m => m.collection === 'queries').length})</option>
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
                  onChange={(e) => setSelectedSchemaType(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs px-2.5 py-1.5 border"
                >
                  <option value="all">All Formats</option>
                  {schemaTypes.map((type) => (
                    <option key={type} value={type}>
                      {getSchemaTypeLabel(type)} ({messages.filter(m => m.schemaExtension?.toLowerCase() === type).length})
                    </option>
                  ))}
                </select>
              </div>

                  {/* Active filters */}
                  {(searchQuery || selectedType !== 'all' || selectedSchemaType !== 'all') && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {searchQuery && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {searchQuery.substring(0, 15)}{searchQuery.length > 15 ? '...' : ''}
                            <button onClick={() => setSearchQuery('')}>
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {selectedType !== 'all' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {selectedType}
                            <button onClick={() => setSelectedType('all')}>
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {selectedSchemaType !== 'all' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {getSchemaTypeLabel(selectedSchemaType)}
                            <button onClick={() => setSelectedSchemaType('all')}>
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedType('all');
                            setSelectedSchemaType('all');
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

            {/* Schema List - Independently Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {paginatedMessages.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {paginatedMessages.map((message) => {
                    const { color, Icon } = getCollectionStyles(message.collection);
                    const isSelected = selectedMessage?.data.id === message.data.id;

                    return (
                      <button
                        key={message.data.id}
                        onClick={() => setSelectedMessage(message)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          isSelected ? `bg-${color}-50 border-l-4 border-${color}-500` : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? `text-${color}-600` : `text-${color}-500`}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-sm font-semibold truncate ${isSelected ? `text-${color}-900` : 'text-gray-900'}`}>
                                {message.data.name}
                              </h3>
                              <span className="text-xs text-gray-500 flex-shrink-0">v{message.data.version}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={`inline-flex items-center rounded-full bg-${color}-100 px-2 py-0.5 text-xs font-medium text-${color}-800`}>
                                {message.collection}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                                {getSchemaTypeLabel(message.schemaExtension)}
                              </span>
                            </div>
                            {message.data.summary && (
                              <p className="text-xs text-gray-600 line-clamp-2">{message.data.summary}</p>
                            )}
                          </div>
                        </div>
                      </button>
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

            {/* Pagination for list */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-gray-50">
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Schema Details */}
          <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
            {selectedMessage ? (
              renderSchemaDetails(selectedMessage)
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
