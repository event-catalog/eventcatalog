import { memo, useMemo, useState } from 'react';
import {
  ServerIcon,
  RectangleGroupIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  CircleStackIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLongRightIcon,
  ArrowLongLeftIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import { BoxIcon } from 'lucide-react';
import { getSpecUrl, getSpecIcon, getSpecLabel, getServiceSpecifications } from './specification-utils';

// ============================================
// Types
// ============================================

interface DomainGridProps {
  domain: any;
}

// ============================================
// Helper functions
// ============================================

const getMessageIcon = (collection: string) => {
  switch (collection) {
    case 'events':
      return { Icon: BoltIcon, color: 'orange' };
    case 'commands':
      return { Icon: ChatBubbleLeftIcon, color: 'blue' };
    case 'queries':
      return { Icon: MagnifyingGlassIcon, color: 'emerald' };
    default:
      return { Icon: BoltIcon, color: 'gray' };
  }
};

// ============================================
// Sub-components
// ============================================

const EntityBadge = memo(({ entity }: { entity: any }) => {
  const id = entity?.data?.id || entity?.id;
  const name = entity?.data?.name || entity?.name || id;

  return (
    <a
      href={buildUrl(`/docs/entities/${id}`)}
      className="inline-flex items-center gap-2 px-3 py-2 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg text-sm font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] hover:border-[rgb(var(--ec-accent)/0.5)] transition-all shadow-sm"
    >
      <BoxIcon className="h-4 w-4 text-[rgb(var(--ec-accent))]" />
      <span>{name}</span>
    </a>
  );
});

const MessageLink = memo(({ message }: { message: any }) => {
  const data = message?.data || message;
  const collection = message?.collection || 'events';
  const { Icon, color } = getMessageIcon(collection);
  const id = data?.id || message?.id;
  const name = data?.name || data?.id || id;
  const version = data?.version || message?.data?.version || 'latest';

  const iconStyles: Record<string, string> = {
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    gray: 'text-gray-500',
  };

  return (
    <a
      href={buildUrl(`/docs/${collection}/${id}/${version}`)}
      className="flex items-center gap-2 py-1.5 text-sm text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] transition-colors group"
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${iconStyles[color]}`} />
      <span className="group-hover:underline">{name}</span>
      <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{version}</span>
    </a>
  );
});

const SpecificationBadge = memo(
  ({ spec, serviceId, serviceVersion }: { spec: any; serviceId: string; serviceVersion: string }) => {
    return (
      <a
        href={getSpecUrl(spec, serviceId, serviceVersion)}
        className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg text-xs font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] hover:border-[rgb(var(--ec-accent)/0.5)] transition-all shadow-sm"
      >
        <img src={buildUrl(`/icons/${getSpecIcon(spec.type)}.svg`, true)} alt={`${spec.type} icon`} className="h-3.5 w-3.5" />
        <span>{getSpecLabel(spec.type)}</span>
      </a>
    );
  }
);

const ContainerLink = memo(({ container, type }: { container: any; type: 'reads' | 'writes' }) => {
  const data = container?.data || container;
  const id = data?.id || container?.id;
  const name = data?.name || id;
  const version = data?.version || 'latest';

  return (
    <a
      href={buildUrl(`/docs/containers/${id}/${version}`)}
      className="flex items-center gap-2 py-1.5 text-sm text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] transition-colors group"
    >
      <CircleStackIcon className={`h-4 w-4 ${type === 'reads' ? 'text-amber-500' : 'text-violet-500'}`} />
      <span className="group-hover:underline">{name}</span>
    </a>
  );
});

// Searchable scrollable box component
const SearchableBox = memo(
  ({
    title,
    icon: Icon,
    iconColor,
    items,
    renderItem,
    emptyText = '—',
  }: {
    title: string;
    icon: any;
    iconColor: string;
    items: any[];
    renderItem: (item: any, idx: number) => React.ReactNode;
    emptyText?: string;
  }) => {
    const [search, setSearch] = useState('');

    const filteredItems = items.filter((item) => {
      if (!search) return true;
      const data = item?.data || item;
      const name = data?.name || data?.id || '';
      return name.toLowerCase().includes(search.toLowerCase());
    });

    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <h4 className="text-xs font-semibold text-[rgb(var(--ec-page-text))] uppercase tracking-wide">{title}</h4>
            <span className="text-[10px] text-[rgb(var(--ec-icon-color))] font-medium">({items.length})</span>
          </div>
          {items.length > 0 && (
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-2 py-0.5 text-xs border border-[rgb(var(--ec-input-border))] rounded focus:outline-none focus:border-[rgb(var(--ec-accent))] bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-input-text))]"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        {items.length > 0 ? (
          <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => renderItem(item, idx))
            ) : (
              <p className="text-xs text-[rgb(var(--ec-icon-color))] italic">No matches</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[rgb(var(--ec-icon-color))]">{emptyText}</p>
        )}
      </div>
    );
  }
);

// Expanded content for service card
const ServiceExpandedContent = memo(
  ({ receives, sends, readsFrom, writesTo }: { receives: any[]; sends: any[]; readsFrom: any[]; writesTo: any[] }) => {
    const hasMessages = receives.length > 0 || sends.length > 0;
    const hasContainers = readsFrom.length > 0 || writesTo.length > 0;

    return (
      <div className="border-t border-[rgb(var(--ec-page-border))] px-4 py-3 space-y-4">
        {/* Messages Row */}
        {hasMessages && (
          <div className="grid grid-cols-2 gap-x-6">
            <SearchableBox
              title="Receives"
              icon={ArrowLongRightIcon}
              iconColor="text-blue-400"
              items={receives}
              renderItem={(msg, idx) => {
                const msgId = msg?.data?.id || msg?.id;
                return msgId ? <MessageLink key={`${msgId}-${idx}`} message={msg} /> : null;
              }}
            />
            <SearchableBox
              title="Sends"
              icon={ArrowLongLeftIcon}
              iconColor="text-emerald-400 rotate-180"
              items={sends}
              renderItem={(msg, idx) => {
                const msgId = msg?.data?.id || msg?.id;
                return msgId ? <MessageLink key={`${msgId}-${idx}`} message={msg} /> : null;
              }}
            />
          </div>
        )}

        {/* Data Row */}
        {hasContainers && (
          <div className="grid grid-cols-2 gap-x-6 pt-3 border-t border-[rgb(var(--ec-page-border))]">
            <SearchableBox
              title="Reads"
              icon={CircleStackIcon}
              iconColor="text-amber-400"
              items={readsFrom}
              renderItem={(container, idx) => {
                const containerId = container?.data?.id || container?.id;
                return containerId ? <ContainerLink key={`${containerId}-${idx}`} container={container} type="reads" /> : null;
              }}
            />
            <SearchableBox
              title="Writes"
              icon={CircleStackIcon}
              iconColor="text-violet-400"
              items={writesTo}
              renderItem={(container, idx) => {
                const containerId = container?.data?.id || container?.id;
                return containerId ? <ContainerLink key={`${containerId}-${idx}`} container={container} type="writes" /> : null;
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

const ServiceCard = memo(({ service }: { service: any }) => {
  const data = service?.data || service;
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!data?.id) return null;

  const receives = data.receives || [];
  const sends = data.sends || [];
  const readsFrom = data.readsFrom || [];
  const writesTo = data.writesTo || [];
  const specifications = getServiceSpecifications(data);
  const hasMessages = receives.length > 0 || sends.length > 0;
  const hasContainers = readsFrom.length > 0 || writesTo.length > 0;
  const hasSpecs = specifications.length > 0;
  const hasContent = hasMessages || hasContainers;

  return (
    <div className="bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* Service Header */}
      <div
        onClick={() => hasContent && setIsCollapsed(!isCollapsed)}
        className={`flex items-center justify-between px-4 py-3 ${hasContent ? 'cursor-pointer hover:bg-[rgb(var(--ec-content-hover))]' : ''} transition-colors`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-pink-100 dark:bg-pink-500/20 rounded-lg">
            <ServerIcon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[rgb(var(--ec-page-text))]">{data.name || data.id}</span>
              <span className="text-[11px] text-[rgb(var(--ec-page-text-muted))] font-medium bg-[rgb(var(--ec-content-hover))] px-1.5 py-0.5 rounded">
                v{data.version}
              </span>
            </div>
            {data.summary && (
              <p className="text-xs text-[rgb(var(--ec-page-text-muted))] line-clamp-1 mt-0.5 max-w-md">{data.summary}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Specs in header - always visible */}
          {hasSpecs && (
            <div className="flex items-center gap-1.5">
              {specifications.map((spec: any, idx: number) => (
                <a
                  key={`${spec.type}-${idx}`}
                  href={getSpecUrl(spec, data.id, data.version)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-1 bg-[rgb(var(--ec-content-hover))] hover:bg-[rgb(var(--ec-sidebar-hover-bg))] rounded text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
                  title={getSpecLabel(spec.type)}
                >
                  <img src={buildUrl(`/icons/${getSpecIcon(spec.type)}.svg`, true)} alt="" className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{getSpecLabel(spec.type)}</span>
                </a>
              ))}
            </div>
          )}
          {hasContent && (
            <div className="p-1.5 text-[rgb(var(--ec-icon-color))]">
              {isCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
            </div>
          )}
          <a
            href={buildUrl(`/architecture/services/${data.id}/${data.version}`)}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-pink-500 hover:bg-pink-500/10 rounded-lg transition-colors"
            title="View service architecture"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Expanded Content - Compact Flow */}
      {!isCollapsed && hasContent && (
        <ServiceExpandedContent receives={receives} sends={sends} readsFrom={readsFrom} writesTo={writesTo} />
      )}
    </div>
  );
});

const DataProductCard = memo(({ dataProduct }: { dataProduct: any }) => {
  const data = dataProduct?.data || dataProduct;

  if (!data?.id) return null;

  const href = buildUrl(`/docs/data-products/${data.id}/${data.version}`);

  return (
    <a
      href={href}
      className="block bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-xl shadow-sm hover:shadow-md hover:border-[rgb(var(--ec-accent)/0.5)] transition-all"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
            <CubeIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[rgb(var(--ec-page-text))]">{data.name || data.id}</span>
              <span className="text-[11px] text-[rgb(var(--ec-page-text-muted))] font-medium bg-[rgb(var(--ec-content-hover))] px-1.5 py-0.5 rounded">
                v{data.version}
              </span>
            </div>
            {data.summary && (
              <p className="text-xs text-[rgb(var(--ec-page-text-muted))] line-clamp-1 mt-0.5 max-w-md">{data.summary}</p>
            )}
          </div>
        </div>
        <div className="p-1.5 text-[rgb(var(--ec-icon-color))]">
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </div>
      </div>
    </a>
  );
});

const SubdomainSection = memo(({ subdomain }: { subdomain: any }) => {
  const data = subdomain?.data || subdomain;
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!data?.id) return null;

  const services = data.services || [];
  const entities = data.entities || [];
  const dataProducts = data['data-products'] || [];

  return (
    <div className="bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-xl overflow-hidden shadow-sm">
      {/* Subdomain Header - Clickable */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[rgb(var(--ec-content-hover))] transition-colors ${!isCollapsed ? 'border-b border-[rgb(var(--ec-page-border))]' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
            <RectangleGroupIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[rgb(var(--ec-page-text))]">{data.name || data.id}</h3>
              <span className="text-[11px] text-[rgb(var(--ec-page-text-muted))] font-medium bg-[rgb(var(--ec-content-hover))] px-1.5 py-0.5 rounded border border-[rgb(var(--ec-page-border))]">
                v{data.version}
              </span>
              {/* Show counts when collapsed */}
              {isCollapsed && (services.length > 0 || entities.length > 0 || dataProducts.length > 0) && (
                <span className="text-[11px] text-[rgb(var(--ec-icon-color))] ml-1">
                  {services.length > 0 && `${services.length} service${services.length > 1 ? 's' : ''}`}
                  {services.length > 0 && (entities.length > 0 || dataProducts.length > 0) && ', '}
                  {entities.length > 0 && `${entities.length} entit${entities.length > 1 ? 'ies' : 'y'}`}
                  {entities.length > 0 && dataProducts.length > 0 && ', '}
                  {dataProducts.length > 0 && `${dataProducts.length} data product${dataProducts.length > 1 ? 's' : ''}`}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[rgb(var(--ec-page-text-muted))] font-medium">Subdomain</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="p-2 text-[rgb(var(--ec-icon-color))]">
            {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </div>
          <a
            href={buildUrl(`/architecture/domains/${data.id}/${data.version}`)}
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
            title="View subdomain architecture"
          >
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
          </a>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-5 space-y-5">
          {/* Subdomain Entities */}
          {entities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BoxIcon className="h-4 w-4 text-[rgb(var(--ec-accent))]" />
                <h4 className="text-sm font-semibold text-[rgb(var(--ec-page-text))]">Entities</h4>
                <span className="text-xs text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded-full font-medium">
                  {entities.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {entities.map((entity: any) => {
                  const entityId = entity?.data?.id || entity?.id;
                  return entityId ? <EntityBadge key={entityId} entity={entity} /> : null;
                })}
              </div>
            </div>
          )}

          {/* Subdomain Services */}
          {services.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ServerIcon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <h4 className="text-sm font-semibold text-[rgb(var(--ec-page-text))]">Services</h4>
                <span className="text-xs text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded-full font-medium">
                  {services.length}
                </span>
              </div>
              <div className="space-y-3">
                {services.map((service: any) => {
                  const serviceId = service?.data?.id || service?.id;
                  return serviceId ? <ServiceCard key={serviceId} service={service} /> : null;
                })}
              </div>
            </div>
          )}

          {/* Subdomain Data Products */}
          {dataProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CubeIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-semibold text-[rgb(var(--ec-page-text))]">Data Products</h4>
                <span className="text-xs text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded-full font-medium">
                  {dataProducts.length}
                </span>
              </div>
              <div className="space-y-3">
                {dataProducts.map((dataProduct: any) => {
                  const dataProductId = dataProduct?.data?.id || dataProduct?.id;
                  return dataProductId ? <DataProductCard key={dataProductId} dataProduct={dataProduct} /> : null;
                })}
              </div>
            </div>
          )}

          {entities.length === 0 && services.length === 0 && dataProducts.length === 0 && (
            <p className="text-sm text-[rgb(var(--ec-icon-color))] italic text-center py-4">
              No entities, services, or data products in this subdomain
            </p>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export default function DomainGrid({ domain }: DomainGridProps) {
  const data = domain?.data;
  if (!data) return <div className="text-[rgb(var(--ec-page-text-muted))]">No domain data</div>;

  const subdomains = data.domains || [];
  const entities = data.entities || [];
  const services = data.services || [];
  const dataProducts = data['data-products'] || [];

  // Get services that are NOT in any subdomain
  const subdomainServiceIds = useMemo(
    () =>
      new Set(
        subdomains.flatMap((sd: any) => {
          const sdData = sd?.data || sd;
          return (sdData?.services || []).map((s: any) => s?.data?.id || s?.id);
        })
      ),
    [subdomains]
  );

  // Get data products that are NOT in any subdomain
  const subdomainDataProductIds = useMemo(
    () =>
      new Set(
        subdomains.flatMap((sd: any) => {
          const sdData = sd?.data || sd;
          return (sdData?.['data-products'] || []).map((dp: any) => dp?.data?.id || dp?.id);
        })
      ),
    [subdomains]
  );

  const topLevelServices = useMemo(
    () =>
      services.filter((s: any) => {
        const sId = s?.data?.id || s?.id;
        return sId && !subdomainServiceIds.has(sId);
      }),
    [services, subdomainServiceIds]
  );

  const topLevelDataProducts = useMemo(
    () =>
      dataProducts.filter((dp: any) => {
        const dpId = dp?.data?.id || dp?.id;
        return dpId && !subdomainDataProductIds.has(dpId);
      }),
    [dataProducts, subdomainDataProductIds]
  );

  return (
    <div className="w-full">
      {/* Domain Header - Doc style */}
      <div className="border-b border-[rgb(var(--ec-page-border))] md:pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl md:text-4xl font-bold text-[rgb(var(--ec-page-text))]">{data.name || data.id}</h2>
            {data.summary && <p className="text-lg pt-2 text-[rgb(var(--ec-page-text-muted))] font-light">{data.summary}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={buildUrl(`/docs/domains/${data.id}/${data.version}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg hover:bg-[rgb(var(--ec-content-hover))] hover:border-[rgb(var(--ec-page-text-muted))] transition-all"
            >
              View docs
              <ArrowTopRightOnSquareIcon className="h-4 w-4 text-[rgb(var(--ec-icon-color))]" />
            </a>
            <a
              href={buildUrl(`/visualiser/domains/${data.id}/${data.version}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-zinc-800 dark:bg-zinc-700 rounded-lg hover:bg-zinc-900 dark:hover:bg-zinc-600 transition-all"
            >
              Visualizer
              <ArrowTopRightOnSquareIcon className="h-4 w-4 text-zinc-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Domain Content */}
      <div className="py-4 space-y-8">
        {/* Domain Entities */}
        {entities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BoxIcon className="h-5 w-5 text-[rgb(var(--ec-accent))]" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Entities</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {entities.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {entities.map((entity: any) => {
                const entityId = entity?.data?.id || entity?.id;
                return entityId ? <EntityBadge key={entityId} entity={entity} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Top-level Services */}
        {topLevelServices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ServerIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Services</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {topLevelServices.length}
              </span>
            </div>
            <div className="space-y-3">
              {topLevelServices.map((service: any) => {
                const serviceId = service?.data?.id || service?.id;
                return serviceId ? <ServiceCard key={serviceId} service={service} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Subdomains */}
        {subdomains.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <RectangleGroupIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Subdomains</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {subdomains.length}
              </span>
            </div>
            <div className="space-y-4">
              {subdomains.map((subdomain: any) => {
                const subdomainId = subdomain?.data?.id || subdomain?.id;
                return subdomainId ? <SubdomainSection key={subdomainId} subdomain={subdomain} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Top-level Data Products */}
        {topLevelDataProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CubeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Data Products</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {topLevelDataProducts.length}
              </span>
            </div>
            <div className="space-y-3">
              {topLevelDataProducts.map((dataProduct: any) => {
                const dataProductId = dataProduct?.data?.id || dataProduct?.id;
                return dataProductId ? <DataProductCard key={dataProductId} dataProduct={dataProduct} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {entities.length === 0 && services.length === 0 && dataProducts.length === 0 && subdomains.length === 0 && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-[rgb(var(--ec-content-hover))] rounded-2xl">
              <RectangleGroupIcon className="h-8 w-8 text-[rgb(var(--ec-icon-color))]" />
            </div>
            <p className="text-[rgb(var(--ec-page-text-muted))]">
              This domain has no entities, services, data products, or subdomains defined.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
