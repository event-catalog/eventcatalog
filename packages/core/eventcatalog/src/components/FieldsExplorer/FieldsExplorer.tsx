import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, X, AlertTriangle } from 'lucide-react';
import FieldFilters from './FieldFilters';
import FieldsTable from './FieldsTable';
import type { FieldResult } from './FieldsTable';
import FieldNodeGraph from './FieldNodeGraph';
import { buildUrl } from '@utils/url-builder';

interface Facets {
  formats: { value: string; count: number }[];
  types: { value: string; count: number }[];
  messageTypes: { value: string; count: number }[];
}

interface FieldsApiResponse {
  fields: FieldResult[];
  total: number;
  cursor: string | null;
  facets: Facets;
  error?: string;
}

interface SelectedField {
  path: string;
  type: string;
  description: string;
  required: boolean;
  conflicts?: { type: string; count: number }[];
  occurrences: FieldResult[];
}

export default function FieldsExplorer() {
  const [fields, setFields] = useState<FieldResult[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedMessageTypes, setSelectedMessageTypes] = useState<string[]>([]);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [conflictingOnly, setConflictingOnly] = useState(false);

  // Modal state
  const [selectedField, setSelectedField] = useState<SelectedField | null>(null);

  // Pagination cursors
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Abort controller for in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildQueryParams = useCallback(
    (extraParams?: Record<string, string>) => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedFormats.length > 0) params.set('format', selectedFormats.join(','));
      if (selectedMessageTypes.length > 0) params.set('messageType', selectedMessageTypes.join(','));
      if (sharedOnly) params.set('shared', 'true');
      if (conflictingOnly) params.set('conflicting', 'true');
      if (extraParams) {
        Object.entries(extraParams).forEach(([key, value]) => {
          params.set(key, value);
        });
      }
      return params;
    },
    [searchQuery, selectedFormats, selectedMessageTypes, sharedOnly, conflictingOnly]
  );

  const fetchFields = useCallback(
    async (cursorValue?: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const params = buildQueryParams(cursorValue ? { cursor: cursorValue } : undefined);
        const response = await fetch(buildUrl(`/api/schemas/fields?${params.toString()}`), {
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data: FieldsApiResponse = await response.json();
        setFields(data.fields || []);
        setTotal(data.total || 0);
        setCursor(data.cursor || null);
        if (data.facets) {
          setFacets({
            formats: data.facets.formats || [],
            types: data.facets.types || [],
            messageTypes: data.facets.messageTypes || [],
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load fields');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [buildQueryParams]
  );

  // Initial fetch and re-fetch when filters change
  useEffect(() => {
    setCursorHistory([]);
    setCurrentPageIndex(0);
    fetchFields();
  }, [searchQuery, selectedFormats, selectedMessageTypes, sharedOnly, conflictingOnly]);

  // Open modal: fetch all occurrences for the field path, then show modal
  const handleSelectField = useCallback(async (fieldPath: string) => {
    try {
      // Fetch all pages of occurrences for this field path
      let allOccurrences: FieldResult[] = [];
      let nextCursor: string | null = null;

      do {
        const params = new URLSearchParams();
        params.set('path', fieldPath);
        params.set('pageSize', '100');
        if (nextCursor) params.set('cursor', nextCursor);

        const response = await fetch(buildUrl(`/api/schemas/fields?${params.toString()}`));
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: FieldsApiResponse = await response.json();
        allOccurrences = allOccurrences.concat(data.fields || []);
        nextCursor = data.cursor;
      } while (nextCursor);

      setSelectedField({
        path: fieldPath,
        type: allOccurrences[0]?.type || 'unknown',
        description: allOccurrences[0]?.description || '',
        required: allOccurrences[0]?.required || false,
        conflicts: allOccurrences[0]?.conflicts,
        occurrences: allOccurrences,
      });
    } catch {
      // Silently fail — user can retry by clicking again
    }
  }, []);

  const handleNextPage = useCallback(() => {
    if (!cursor) return;
    setCursorHistory((prev) => [...prev, cursor]);
    setCurrentPageIndex((prev) => prev + 1);
    fetchFields(cursor);
  }, [cursor, fetchFields]);

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex === 0) return;
    const newIndex = currentPageIndex - 1;
    setCurrentPageIndex(newIndex);
    if (newIndex === 0) {
      fetchFields();
    } else {
      fetchFields(cursorHistory[newIndex - 1]);
    }
    setCursorHistory((prev) => prev.slice(0, -1));
  }, [currentPageIndex, cursorHistory, fetchFields]);

  // Map facets for FieldFilters
  const filterFacets = facets
    ? {
        formats: facets.formats,
        messageTypes: facets.messageTypes,
      }
    : null;

  const conflictingFieldCount = useMemo(() => {
    return new Set(fields.filter((field) => field.conflicts && field.conflicts.length > 1).map((field) => field.path)).size;
  }, [fields]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
        {/* Filter Sidebar */}
        <div
          className="fixed top-0 z-20 flex h-screen w-[320px] flex-shrink-0 flex-col overflow-hidden border-r border-[rgb(var(--ec-page-border))] bg-linear-to-bl from-[rgb(var(--ec-page-bg))] via-[rgb(var(--ec-page-bg))] to-[rgb(var(--ec-accent)/0.08)]"
          style={{ left: 'var(--ec-vertical-nav-width)', width: 'var(--ec-fields-sidebar-width, 320px)' }}
        >
          <div className="flex h-[60px] flex-shrink-0 items-center border-b border-[rgb(var(--ec-page-border))] px-4">
            <div className="relative min-w-0 flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-[rgb(var(--ec-icon-color))]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fields..."
                className="block w-full rounded-md border-0 bg-[rgb(var(--ec-header-bg))] py-1.5 pl-10 pr-8 text-[rgb(var(--ec-header-text))] shadow-xs ring-1 ring-inset ring-[rgb(var(--ec-dropdown-border))] placeholder:text-[rgb(var(--ec-icon-color))] font-light sm:text-sm sm:leading-6 focus:outline-hidden focus:ring-1 focus:ring-inset focus:ring-[rgb(var(--ec-accent))]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
            <FieldFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedFormats={selectedFormats}
              onFormatsChange={setSelectedFormats}
              selectedMessageTypes={selectedMessageTypes}
              onMessageTypesChange={setSelectedMessageTypes}
              sharedOnly={sharedOnly}
              onSharedOnlyChange={setSharedOnly}
              conflictingOnly={conflictingOnly}
              onConflictingOnlyChange={setConflictingOnly}
              facets={filterFacets}
            />
          </div>
        </div>

        {/* Main Content */}
        <div
          className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-[rgb(var(--ec-page-bg))]"
          style={{ marginLeft: 'var(--ec-fields-sidebar-width, 320px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">
              Fields <span className="text-sm text-[rgb(var(--ec-page-text-muted))] font-normal ml-1">({total})</span>
            </h2>
          </div>

          {/* Error state */}
          {error && (
            <div className="mx-6 mb-4 px-4 py-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {conflictingFieldCount > 0 && (
            <div className="mx-6 mb-4 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-[rgb(var(--ec-page-text))]">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-[rgb(var(--ec-page-text))]">
                    {conflictingFieldCount} conflicting {conflictingFieldCount === 1 ? 'property' : 'properties'} found
                  </p>
                  <p className="mt-1 text-[0.8rem] text-[rgb(var(--ec-page-text-muted))]">
                    These properties are used with more than one type across the current results.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <FieldsTable fields={fields} onSelectField={handleSelectField} isLoading={isLoading} />

          {/* Pagination */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-[rgb(var(--ec-page-border))]">
            <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">
              {total > 0 && (
                <>
                  <span className="font-medium text-[rgb(var(--ec-page-text))]">{fields.length}</span> of{' '}
                  <span className="font-medium text-[rgb(var(--ec-page-text))]">{total}</span> fields
                </>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                onClick={handlePrevPage}
                disabled={currentPageIndex === 0}
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs tabular-nums text-[rgb(var(--ec-page-text-muted))] min-w-[60px] text-center">
                <span className="font-medium text-[rgb(var(--ec-page-text))]">{currentPageIndex + 1}</span>
                {' / '}
                <span>{Math.max(cursorHistory.length + (cursor ? 2 : 1), currentPageIndex + 1)}</span>
              </span>
              <button
                className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                onClick={handleNextPage}
                disabled={!cursor}
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Field Detail Modal with Node Graph */}
        {selectedField && (
          <FieldNodeGraph
            fieldPath={selectedField.path}
            fieldType={selectedField.type}
            fieldDescription={selectedField.description}
            fieldRequired={selectedField.required}
            fieldConflicts={selectedField.conflicts}
            occurrences={selectedField.occurrences.map((f) => ({
              messageId: f.messageId,
              messageVersion: f.messageVersion,
              messageType: f.messageType,
              messageName: f.messageName,
              messageSummary: f.messageSummary,
              messageOwners: f.messageOwners,
              fieldType: f.type,
              producers: f.producers,
              consumers: f.consumers,
            }))}
            onClose={() => setSelectedField(null)}
          />
        )}
      </div>
    </div>
  );
}
