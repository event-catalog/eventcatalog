import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Lock, Search, X, AlertTriangle } from 'lucide-react';
import FieldFilters from './FieldFilters';
import FieldsTable from './FieldsTable';
import type { FieldResult } from './FieldsTable';
import FieldNodeGraph from './FieldNodeGraph';
import { buildUrl } from '@utils/url-builder';

function DummyNode({
  type,
  name,
  version,
  className,
}: {
  type: 'service' | 'event' | 'field';
  name: string;
  version?: string;
  className?: string;
}) {
  const styles = {
    service: { border: 'border-pink-500', badge: 'bg-pink-500', label: 'SERVICE' },
    event: { border: 'border-orange-500', badge: 'bg-orange-500', label: 'EVENT' },
    field: { border: 'border-cyan-500', badge: 'bg-cyan-500', label: 'FIELD' },
  };
  const s = styles[type];
  return (
    <div
      className={`relative rounded-xl border-2 ${s.border} bg-[rgb(var(--ec-card-bg))] px-3 pt-4 pb-2.5 min-w-[140px] ${className || ''}`}
    >
      <div
        className={`absolute -top-2.5 left-2.5 ${s.badge} text-white text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded`}
      >
        {s.label}
      </div>
      <div className="text-[11px] font-semibold text-[rgb(var(--ec-page-text))]">{name}</div>
      {version && <div className="text-[9px] text-[rgb(var(--ec-page-text-muted))]">v{version}</div>}
    </div>
  );
}

function DummyEdge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-8 h-px bg-[rgb(var(--ec-page-border))]" />
      <span className="text-[8px] text-[rgb(var(--ec-page-text-muted))] whitespace-nowrap">{label}</span>
      <div className="w-8 h-px bg-[rgb(var(--ec-page-border))]" />
    </div>
  );
}

function FieldLineageUpgradeModal({ fieldPath, onClose }: { fieldPath: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[90vw] h-[80vh] max-w-[1400px] rounded-xl border shadow-2xl flex flex-col overflow-hidden relative"
        style={{
          backgroundColor: 'rgb(var(--ec-page-bg))',
          borderColor: 'rgb(var(--ec-page-border))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--ec-page-border))' }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--ec-page-text))' }}>
              Field Traceability
            </h3>
            <code
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{
                backgroundColor: 'rgb(var(--ec-accent) / 0.1)',
                color: 'rgb(var(--ec-accent))',
              }}
            >
              {fieldPath}
            </code>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgb(var(--ec-content-hover))] flex-shrink-0"
            style={{ color: 'rgb(var(--ec-icon-color))' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Blurred dummy content */}
        <div className="flex-1 relative overflow-hidden">
          {/* Fake graph + side panel */}
          <div className="absolute inset-0 flex blur-[2px] opacity-60 select-none pointer-events-none">
            {/* Fake graph area */}
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="flex items-center gap-3">
                {/* Producer services */}
                <div className="flex flex-col gap-6">
                  <DummyNode type="service" name="Billing Service" version="1.2.0" />
                  <DummyNode type="service" name="Order Service" version="2.0.1" />
                </div>
                {/* Edges to events */}
                <div className="flex flex-col gap-12">
                  <DummyEdge label="produces" />
                  <DummyEdge label="produces" />
                </div>
                {/* Events */}
                <div className="flex flex-col gap-6">
                  <DummyNode type="event" name="Payment Due" version="0.0.1" />
                  <DummyNode type="event" name="Order Created" version="1.0.0" />
                </div>
                {/* Edges to field */}
                <div className="flex flex-col gap-12">
                  <DummyEdge label="contains" />
                  <DummyEdge label="contains" />
                </div>
                {/* Field */}
                <div className="flex flex-col gap-6">
                  <DummyNode type="field" name={fieldPath} />
                </div>
                {/* Edges to consumers */}
                <div className="flex flex-col gap-12">
                  <DummyEdge label="consumed by" />
                </div>
                {/* Consumer services */}
                <div className="flex flex-col gap-6">
                  <DummyNode type="service" name="Notification Service" version="0.0.2" />
                </div>
              </div>
            </div>
            {/* Fake side panel */}
            <div className="w-[280px] flex-shrink-0 border-l border-[rgb(var(--ec-page-border))] p-4 space-y-4">
              <div>
                <div className="text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-2">
                  Field
                </div>
                <div className="text-sm font-mono font-semibold text-[rgb(var(--ec-page-text))]">{fieldPath}</div>
                <div className="text-xs text-[rgb(var(--ec-page-text-muted))] mt-1">string</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-amber-500 uppercase tracking-wider mb-2">Type Conflict</div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-1">
                  <div className="text-xs text-amber-600">Inconsistent types detected</div>
                  <div className="flex justify-between text-xs">
                    <code className="font-mono">string</code>
                    <span className="text-[rgb(var(--ec-page-text-muted))]">3 schemas</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <code className="font-mono">integer</code>
                    <span className="text-[rgb(var(--ec-page-text-muted))]">1 schema</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-2">
                  Messages (3)
                </div>
                <div className="space-y-1.5">
                  <div className="rounded-lg border border-[rgb(var(--ec-page-border)/0.5)] bg-[rgb(var(--ec-card-bg))] px-2.5 py-2 text-xs">
                    Payment Due
                  </div>
                  <div className="rounded-lg border border-[rgb(var(--ec-page-border)/0.5)] bg-[rgb(var(--ec-card-bg))] px-2.5 py-2 text-xs">
                    Order Created
                  </div>
                  <div className="rounded-lg border border-[rgb(var(--ec-page-border)/0.5)] bg-[rgb(var(--ec-card-bg))] px-2.5 py-2 text-xs">
                    Invoice Generated
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade prompt overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--ec-page-bg)/0.5)]">
            <div className="text-center max-w-lg px-6 py-8 rounded-2xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-[rgb(var(--ec-accent)/0.1)] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-[rgb(var(--ec-accent))]" />
              </div>
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))] mb-2">Field Lineage & Traceability</h3>
              <p className="text-sm text-[rgb(var(--ec-page-text-muted))] mb-5 leading-relaxed">
                See which services produce and consume this field, detect type conflicts across schemas, and trace field usage
                across your entire event-driven architecture.
              </p>
              <a
                href="https://eventcatalog.cloud/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[rgb(var(--ec-accent))] hover:opacity-90 transition-opacity"
              >
                Start your 14-day free trial
              </a>
              <p className="text-xs text-[rgb(var(--ec-page-text-muted))] mt-3">
                Available with EventCatalog Scale. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

interface FieldsExplorerProps {
  isScaleEnabled?: boolean;
}

export default function FieldsExplorer({ isScaleEnabled = false }: FieldsExplorerProps) {
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
    // Non-scale users get the locked upgrade modal
    if (!isScaleEnabled) {
      setSelectedField({
        path: fieldPath,
        type: 'unknown',
        description: '',
        required: false,
        occurrences: [],
      });
      return;
    }

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
              isScaleEnabled={isScaleEnabled}
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
          <FieldsTable fields={fields} onSelectField={handleSelectField} isLoading={isLoading} isScaleEnabled={isScaleEnabled} />

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
        {selectedField && !isScaleEnabled && (
          <FieldLineageUpgradeModal fieldPath={selectedField.path} onClose={() => setSelectedField(null)} />
        )}
        {selectedField && isScaleEnabled && (
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
