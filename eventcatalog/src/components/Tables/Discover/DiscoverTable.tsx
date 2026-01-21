import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SearchX, X, Search, Users } from 'lucide-react';
import { UserIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import type { TableConfiguration } from '@types';
import { isSameVersion } from '@utils/collections/util';
import { FilterDropdown, CheckboxItem } from './FilterComponents';
import DebouncedInput from '../DebouncedInput';
import { getDiscoverColumns } from './columns';

export type CollectionType =
  | 'events'
  | 'commands'
  | 'queries'
  | 'services'
  | 'domains'
  | 'flows'
  | 'containers'
  | 'data-products';

export interface DiscoverTableData {
  collection: string;
  domains?: Array<{ id: string; name: string; version: string }>;
  owners?: Array<{ id: string; name: string; type?: 'user' | 'team' }>;
  hasSpecifications?: boolean;
  hasOwners?: boolean;
  hasRepository?: boolean;
  isDeprecated?: boolean;
  hasDataDependencies?: boolean;
  hasInputs?: boolean;
  hasOutputs?: boolean;
  data: {
    id: string;
    name: string;
    summary?: string;
    version: string;
    latestVersion?: string;
    draft?: boolean | { title?: string; message: string };
    badges?: Array<{
      id?: string;
      content: string;
      backgroundColor?: string;
      textColor?: string;
    }>;
    producers?: Array<any>;
    consumers?: Array<any>;
    receives?: Array<any>;
    sends?: Array<any>;
    services?: Array<any>;
    servicesThatWriteToContainer?: Array<any>;
    servicesThatReadFromContainer?: Array<any>;
    inputs?: Array<any>;
    outputs?: Array<any>;
  };
}

export interface PropertyOption {
  id: string;
  label: string;
}

export interface DiscoverTableProps<T extends DiscoverTableData> {
  data: T[];
  collectionType: CollectionType;
  collectionLabel: string;
  domains?: Array<{ id: string; name: string; version: string }>;
  owners?: Array<{ id: string; name: string; type?: 'user' | 'team' }>;
  producers?: Array<{ id: string; name: string }>;
  consumers?: Array<{ id: string; name: string }>;
  propertyOptions?: PropertyOption[];
  tableConfiguration?: TableConfiguration;
  showDomainsFilter?: boolean;
  showOwnersFilter?: boolean;
  showProducersFilter?: boolean;
  showConsumersFilter?: boolean;
}

export function DiscoverTable<T extends DiscoverTableData>({
  data: initialData,
  collectionType,
  collectionLabel,
  domains = [],
  owners = [],
  producers = [],
  consumers = [],
  propertyOptions = [],
  tableConfiguration,
  showDomainsFilter = true,
  showOwnersFilter = true,
  showProducersFilter = false,
  showConsumersFilter = false,
}: DiscoverTableProps<T>) {
  // Generate columns inside the React component to avoid hydration issues
  const columns = useMemo(
    () => getDiscoverColumns(collectionType, tableConfiguration ?? { columns: {} }),
    [collectionType, tableConfiguration]
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [showOnlyLatest, setShowOnlyLatest] = useState(true);
  const [onlyShowDrafts, setOnlyShowDrafts] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedProducers, setSelectedProducers] = useState<string[]>([]);
  const [selectedConsumers, setSelectedConsumers] = useState<string[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  // Collect unique badges from all items
  const allBadges = useMemo(() => {
    const badgeMap = new Map<string, { content: string; backgroundColor?: string; textColor?: string; count: number }>();
    initialData.forEach((item) => {
      const badges = item.data?.badges || [];
      badges.forEach((badge: any) => {
        const existing = badgeMap.get(badge.content);
        if (existing) {
          existing.count++;
        } else {
          badgeMap.set(badge.content, {
            content: badge.content,
            backgroundColor: badge.backgroundColor,
            textColor: badge.textColor,
            count: 1,
          });
        }
      });
    });
    return Array.from(badgeMap.values()).sort((a, b) => b.count - a.count);
  }, [initialData]);

  // Filter data based on all filter states
  const filteredData = useMemo(() => {
    return initialData.filter((row) => {
      // Check if item is a draft
      const isDraft = row.data.draft === true || (typeof row.data.draft === 'object' && row.data.draft !== null);

      // Draft filter
      if (onlyShowDrafts && !isDraft) {
        return false;
      }

      if (onlyShowDrafts) {
        return true;
      }

      // Latest version filter
      if (showOnlyLatest && !isSameVersion(row.data.version, row.data.latestVersion)) {
        return false;
      }

      // Domain filter
      if (selectedDomains.length > 0) {
        const itemDomains = row.domains || [];
        const hasMatchingDomain = itemDomains.some((d) => selectedDomains.includes(d.id));
        if (!hasMatchingDomain) {
          return false;
        }
      }

      // Owner filter
      if (selectedOwners.length > 0) {
        const itemOwners = row.owners || [];
        const hasMatchingOwner = itemOwners.some((o) => selectedOwners.includes(o.id));
        if (!hasMatchingOwner) {
          return false;
        }
      }

      // Producer filter
      if (selectedProducers.length > 0) {
        const itemProducers = row.data.producers || [];
        const hasMatchingProducer = itemProducers.some((p: any) => selectedProducers.includes(p.data?.id || p.id));
        if (!hasMatchingProducer) {
          return false;
        }
      }

      // Consumer filter
      if (selectedConsumers.length > 0) {
        const itemConsumers = row.data.consumers || [];
        const hasMatchingConsumer = itemConsumers.some((c: any) => selectedConsumers.includes(c.data?.id || c.id));
        if (!hasMatchingConsumer) {
          return false;
        }
      }

      // Badge filter
      if (selectedBadges.length > 0) {
        const itemBadges = row.data?.badges || [];
        const hasMatchingBadge = itemBadges.some((badge: any) => selectedBadges.includes(badge.content));
        if (!hasMatchingBadge) {
          return false;
        }
      }

      // Property filters
      if (selectedProperties.length > 0) {
        for (const prop of selectedProperties) {
          // Generic property checks
          if (prop === 'hasSpecifications' && !row.hasSpecifications) return false;
          if (prop === 'hasOwners' && !row.hasOwners) return false;
          if (prop === 'hasRepository' && !row.hasRepository) return false;
          if (prop === 'hasDataDependencies' && !row.hasDataDependencies) return false;
          if (prop === 'isDeprecated' && !row.isDeprecated) return false;

          // Message-specific checks
          if (prop === 'hasProducers') {
            const producers = row.data.producers || [];
            if (producers.length === 0) return false;
          }
          if (prop === 'hasConsumers') {
            const consumers = row.data.consumers || [];
            if (consumers.length === 0) return false;
          }
          if (prop === 'hasMessages') {
            const sends = row.data.sends || [];
            const receives = row.data.receives || [];
            if (sends.length === 0 && receives.length === 0) return false;
          }

          // Service-specific checks
          if (prop === 'hasServices') {
            const services = row.data.services || [];
            if (services.length === 0) return false;
          }

          // Container-specific checks
          if (prop === 'hasWriters') {
            const writers = row.data.servicesThatWriteToContainer || [];
            if (writers.length === 0) return false;
          }
          if (prop === 'hasReaders') {
            const readers = row.data.servicesThatReadFromContainer || [];
            if (readers.length === 0) return false;
          }

          // Data-product-specific checks
          if (prop === 'hasInputs') {
            const inputs = row.data.inputs || [];
            if (inputs.length === 0) return false;
          }
          if (prop === 'hasOutputs') {
            const outputs = row.data.outputs || [];
            if (outputs.length === 0) return false;
          }
        }
      }

      // Global search filter (sidebar)
      if (globalFilter) {
        const searchLower = globalFilter.toLowerCase();
        const nameMatch = row.data.name.toLowerCase().includes(searchLower);
        const summaryMatch = row.data.summary?.toLowerCase().includes(searchLower);
        if (!nameMatch && !summaryMatch) {
          return false;
        }
      }

      // Table filter (header)
      if (tableFilter) {
        const searchLower = tableFilter.toLowerCase();
        const nameMatch = row.data.name.toLowerCase().includes(searchLower);
        const summaryMatch = row.data.summary?.toLowerCase().includes(searchLower);
        if (!nameMatch && !summaryMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    initialData,
    showOnlyLatest,
    onlyShowDrafts,
    selectedDomains,
    selectedOwners,
    selectedProducers,
    selectedConsumers,
    selectedBadges,
    selectedProperties,
    globalFilter,
    tableFilter,
  ]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnFilters,
      columnVisibility: Object.fromEntries(
        Object.entries(tableConfiguration?.columns ?? {}).map(([key, value]) => [key, value.visible ?? true])
      ),
    },
  });

  const totalResults = table.getPrePaginationRowModel().rows.length;
  const hasResults = table.getRowModel().rows.length > 0;

  // Count items per domain for the filter
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialData.forEach((item) => {
      const itemDomains = item.domains || [];
      itemDomains.forEach((d) => {
        counts[d.id] = (counts[d.id] || 0) + 1;
      });
    });
    return counts;
  }, [initialData]);

  // Count items per owner for the filter
  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialData.forEach((item) => {
      const itemOwners = item.owners || [];
      itemOwners.forEach((o) => {
        counts[o.id] = (counts[o.id] || 0) + 1;
      });
    });
    return counts;
  }, [initialData]);

  // Count items per producer for the filter
  const producerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialData.forEach((item) => {
      const itemProducers = item.data.producers || [];
      itemProducers.forEach((p: any) => {
        const id = p.data?.id || p.id;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [initialData]);

  // Count items per consumer for the filter
  const consumerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialData.forEach((item) => {
      const itemConsumers = item.data.consumers || [];
      itemConsumers.forEach((c: any) => {
        const id = c.data?.id || c.id;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [initialData]);

  const toggleDomain = (domainId: string) => {
    setSelectedDomains((prev) => (prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId]));
  };

  const toggleOwner = (ownerId: string) => {
    setSelectedOwners((prev) => (prev.includes(ownerId) ? prev.filter((id) => id !== ownerId) : [...prev, ownerId]));
  };

  const toggleProducer = (producerId: string) => {
    setSelectedProducers((prev) => (prev.includes(producerId) ? prev.filter((id) => id !== producerId) : [...prev, producerId]));
  };

  const toggleConsumer = (consumerId: string) => {
    setSelectedConsumers((prev) => (prev.includes(consumerId) ? prev.filter((id) => id !== consumerId) : [...prev, consumerId]));
  };

  const toggleBadge = (badgeContent: string) => {
    setSelectedBadges((prev) => (prev.includes(badgeContent) ? prev.filter((b) => b !== badgeContent) : [...prev, badgeContent]));
  };

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties((prev) => (prev.includes(propertyId) ? prev.filter((p) => p !== propertyId) : [...prev, propertyId]));
  };

  const clearAllFilters = () => {
    setSelectedDomains([]);
    setSelectedOwners([]);
    setSelectedProducers([]);
    setSelectedConsumers([]);
    setSelectedBadges([]);
    setSelectedProperties([]);
    setShowOnlyLatest(true);
    setOnlyShowDrafts(false);
    setGlobalFilter('');
    setTableFilter('');
    setColumnFilters([]);
  };

  const activeFilterCount =
    selectedDomains.length +
    selectedOwners.length +
    selectedProducers.length +
    selectedConsumers.length +
    selectedBadges.length +
    selectedProperties.length +
    (!showOnlyLatest ? 1 : 0) +
    (onlyShowDrafts ? 1 : 0);

  // Get selected domain names for display
  const selectedDomainNames = selectedDomains.map((id) => domains.find((d) => d.id === id)?.name || id);

  // Get selected owner names for display
  const selectedOwnerNames = selectedOwners.map((id) => owners.find((o) => o.id === id)?.name || id);

  // Get selected producer names for display
  const selectedProducerNames = selectedProducers.map((id) => producers.find((p) => p.id === id)?.name || id);

  // Get selected consumer names for display
  const selectedConsumerNames = selectedConsumers.map((id) => consumers.find((c) => c.id === id)?.name || id);

  // Filter producers/consumers to only show those with count > 0
  const filteredProducers = producers.filter((p) => (producerCounts[p.id] || 0) > 0);
  const filteredConsumers = consumers.filter((c) => (consumerCounts[c.id] || 0) > 0);

  // Get selected property labels for display
  const selectedPropertyLabels = selectedProperties.map((id) => propertyOptions.find((p) => p.id === id)?.label || id);

  return (
    <div className="flex gap-8 items-start">
      {/* Filter Sidebar */}
      <div className="w-72 flex-shrink-0 space-y-6 p-4 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-xl">
        {/* Search */}
        <DebouncedInput
          type="text"
          value={globalFilter}
          onChange={(value) => setGlobalFilter(String(value))}
          placeholder={`Search ${collectionLabel.toLowerCase()}...`}
          className="w-full px-3 py-2 text-sm bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-input-text))] border border-[rgb(var(--ec-page-border))] rounded-lg placeholder:text-[rgb(var(--ec-input-placeholder))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.2)] focus:border-[rgb(var(--ec-accent))] transition-colors"
        />

        {/* Message Filters Section */}
        {(showProducersFilter || showConsumersFilter) && (filteredProducers.length > 0 || filteredConsumers.length > 0) && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--ec-page-text-muted))]">
              Message Filters
            </h3>

            {/* Producers Filter */}
            {showProducersFilter && filteredProducers.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--ec-page-text-muted))] mb-1.5">Producers</label>
                <FilterDropdown
                  label="Select producers..."
                  selectedItems={selectedProducerNames}
                  onClear={() => setSelectedProducers([])}
                  onRemoveItem={(name) => {
                    const producer = filteredProducers.find((p) => p.name === name);
                    if (producer) toggleProducer(producer.id);
                  }}
                >
                  {filteredProducers.map((producer) => (
                    <CheckboxItem
                      key={producer.id}
                      label={producer.name}
                      checked={selectedProducers.includes(producer.id)}
                      onChange={() => toggleProducer(producer.id)}
                      count={producerCounts[producer.id] || 0}
                    />
                  ))}
                </FilterDropdown>
              </div>
            )}

            {/* Consumers Filter */}
            {showConsumersFilter && filteredConsumers.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--ec-page-text-muted))] mb-1.5">Consumers</label>
                <FilterDropdown
                  label="Select consumers..."
                  selectedItems={selectedConsumerNames}
                  onClear={() => setSelectedConsumers([])}
                  onRemoveItem={(name) => {
                    const consumer = filteredConsumers.find((c) => c.name === name);
                    if (consumer) toggleConsumer(consumer.id);
                  }}
                >
                  {filteredConsumers.map((consumer) => (
                    <CheckboxItem
                      key={consumer.id}
                      label={consumer.name}
                      checked={selectedConsumers.includes(consumer.id)}
                      onChange={() => toggleConsumer(consumer.id)}
                      count={consumerCounts[consumer.id] || 0}
                    />
                  ))}
                </FilterDropdown>
              </div>
            )}
          </div>
        )}

        {/* Catalog Filters Section */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--ec-page-text-muted))]">
            Catalog Filters
          </h3>

          {/* Domains Filter */}
          {showDomainsFilter && domains.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--ec-page-text-muted))] mb-1.5">Domains</label>
              <FilterDropdown
                label="Select domains..."
                selectedItems={selectedDomainNames}
                onClear={() => setSelectedDomains([])}
                onRemoveItem={(name) => {
                  const domain = domains.find((d) => d.name === name);
                  if (domain) toggleDomain(domain.id);
                }}
              >
                {domains.map((domain) => (
                  <CheckboxItem
                    key={domain.id}
                    label={domain.name}
                    checked={selectedDomains.includes(domain.id)}
                    onChange={() => toggleDomain(domain.id)}
                    count={domainCounts[domain.id] || 0}
                  />
                ))}
              </FilterDropdown>
            </div>
          )}

          {/* Owners Filter */}
          {showOwnersFilter && owners.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--ec-page-text-muted))] mb-1.5">Owners</label>
              <FilterDropdown
                label="Select owners..."
                selectedItems={selectedOwnerNames}
                onClear={() => setSelectedOwners([])}
                onRemoveItem={(name) => {
                  const owner = owners.find((o) => o.name === name);
                  if (owner) toggleOwner(owner.id);
                }}
              >
                {/* Users section */}
                {owners.filter((o) => o.type !== 'team').length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))] flex items-center gap-1.5">
                      <UserIcon className="w-3 h-3" />
                      Users
                    </div>
                    {owners
                      .filter((o) => o.type !== 'team')
                      .map((owner) => (
                        <CheckboxItem
                          key={owner.id}
                          label={owner.name}
                          checked={selectedOwners.includes(owner.id)}
                          onChange={() => toggleOwner(owner.id)}
                          count={ownerCounts[owner.id] || 0}
                        />
                      ))}
                  </>
                )}
                {/* Teams section */}
                {owners.filter((o) => o.type === 'team').length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))] flex items-center gap-1.5 mt-2 border-t border-[rgb(var(--ec-page-border))] pt-2">
                      <Users className="w-3 h-3" />
                      Teams
                    </div>
                    {owners
                      .filter((o) => o.type === 'team')
                      .map((owner) => (
                        <CheckboxItem
                          key={owner.id}
                          label={owner.name}
                          checked={selectedOwners.includes(owner.id)}
                          onChange={() => toggleOwner(owner.id)}
                          count={ownerCounts[owner.id] || 0}
                        />
                      ))}
                  </>
                )}
              </FilterDropdown>
            </div>
          )}

          {/* Badges Filter */}
          {allBadges.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--ec-page-text-muted))] mb-1.5">Badges</label>
              <FilterDropdown
                label="Select badges..."
                selectedItems={selectedBadges}
                onClear={() => setSelectedBadges([])}
                onRemoveItem={(badge) => toggleBadge(badge)}
              >
                {allBadges.map((badge) => (
                  <CheckboxItem
                    key={badge.content}
                    label={badge.content}
                    checked={selectedBadges.includes(badge.content)}
                    onChange={() => toggleBadge(badge.content)}
                    count={badge.count}
                  />
                ))}
              </FilterDropdown>
            </div>
          )}

          {/* Properties Filter */}
          {propertyOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--ec-page-text-muted))] mb-1.5">Properties</label>
              <FilterDropdown
                label="Select properties..."
                selectedItems={selectedPropertyLabels}
                onClear={() => setSelectedProperties([])}
                onRemoveItem={(label) => {
                  const prop = propertyOptions.find((p) => p.label === label);
                  if (prop) toggleProperty(prop.id);
                }}
              >
                {propertyOptions.map((option) => (
                  <CheckboxItem
                    key={option.id}
                    label={option.label}
                    checked={selectedProperties.includes(option.id)}
                    onChange={() => toggleProperty(option.id)}
                  />
                ))}
              </FilterDropdown>
            </div>
          )}

          {/* Version Filter */}
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--ec-page-text-muted))] mb-1.5">Version</label>
            <FilterDropdown
              label="Select version..."
              selectedItems={[...(showOnlyLatest ? ['Latest only'] : []), ...(onlyShowDrafts ? ['Drafts only'] : [])]}
              onClear={() => {
                setShowOnlyLatest(true);
                setOnlyShowDrafts(false);
              }}
              onRemoveItem={(item) => {
                if (item === 'Latest only') setShowOnlyLatest(false);
                if (item === 'Drafts only') setOnlyShowDrafts(false);
              }}
            >
              <CheckboxItem
                label="Latest version only"
                checked={showOnlyLatest}
                onChange={() => setShowOnlyLatest(!showOnlyLatest)}
              />
              <CheckboxItem label="Drafts only" checked={onlyShowDrafts} onChange={() => setOnlyShowDrafts(!onlyShowDrafts)} />
            </FilterDropdown>
          </div>
        </div>

        {/* Results & Clear */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[rgb(var(--ec-page-border))]">
          <span className="text-sm text-[rgb(var(--ec-page-text-muted))]">
            <span className="font-semibold text-[rgb(var(--ec-page-text))]">{totalResults}</span> results
          </span>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs font-medium text-[rgb(var(--ec-accent))] hover:underline">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 min-w-0">
        {/* Table Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[rgb(var(--ec-page-text))]">
            {collectionLabel}{' '}
            <span className="text-base text-[rgb(var(--ec-page-text-muted))] font-normal ml-1">({totalResults})</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--ec-icon-color))]" />
            <input
              type="text"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Filter..."
              className="pl-9 pr-3 py-1.5 text-sm w-48 bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-input-text))] border border-[rgb(var(--ec-page-border))] rounded-lg placeholder:text-[rgb(var(--ec-input-placeholder))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.2)] focus:border-[rgb(var(--ec-accent))] transition-colors"
            />
            {tableFilter && (
              <button
                onClick={() => setTableFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[rgb(var(--ec-page-border))] overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-[rgb(var(--ec-page-border))]">
            <thead className="bg-[rgb(var(--ec-content-hover))] sticky top-0 z-10 border-b-2 border-[rgb(var(--ec-page-border))]">
              {table.getHeaderGroups().map((headerGroup, index) => (
                <tr key={`${headerGroup}-${index}`}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={`${header.id}`}
                      className="px-4 py-3.5 text-left text-[11px] font-bold text-[rgb(var(--ec-page-text-muted))] uppercase tracking-widest"
                    >
                      <div className="flex flex-col gap-2">
                        <div>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] divide-y divide-[rgb(var(--ec-page-border)/0.5)]">
              {hasResults ? (
                table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={`${row.id}-${index}`}
                    className={`group hover:bg-[rgb(var(--ec-accent)/0.04)] transition-all duration-150 border-l-2 border-transparent hover:border-[rgb(var(--ec-accent))] ${
                      index % 2 === 1 ? 'bg-[rgb(var(--ec-page-bg)/0.5)]' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-4 text-sm text-[rgb(var(--ec-page-text))] ${cell.column.columnDef.meta?.className || ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
                      <SearchX className="w-10 h-10 text-[rgb(var(--ec-icon-color))] mb-3 opacity-50" />
                      <p className="text-sm font-medium text-[rgb(var(--ec-page-text-muted))]">No results found</p>
                      <p className="text-xs text-[rgb(var(--ec-icon-color))] mt-1">Try adjusting your search or filters</p>
                      {activeFilterCount > 0 && (
                        <button onClick={clearAllFilters} className="mt-3 text-sm text-[rgb(var(--ec-accent))] hover:underline">
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-1 py-4">
          <div className="text-sm text-[rgb(var(--ec-page-text-muted))]">
            {totalResults > 0 && (
              <span>
                Showing <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getRowModel().rows.length}</span> of{' '}
                <span className="font-medium text-[rgb(var(--ec-page-text))]">{totalResults}</span> results
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]">
              <button
                className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-l-lg"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors border-l border-[rgb(var(--ec-page-border))]"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-2 text-sm text-[rgb(var(--ec-page-text-muted))] border-l border-r border-[rgb(var(--ec-page-border))] min-w-[100px] text-center">
                Page{' '}
                <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getState().pagination.pageIndex + 1}</span>{' '}
                of <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getPageCount() || 1}</span>
              </span>
              <button
                className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors border-r border-[rgb(var(--ec-page-border))]"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-r-lg"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="px-3 py-2 text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg hover:border-[rgb(var(--ec-icon-color))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.2)] transition-colors"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
