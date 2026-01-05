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
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
    >
      <BoxIcon className="h-3.5 w-3.5 text-purple-500" />
      <span>{name}</span>
    </a>
  );
});

const MessageBadge = memo(({ message }: { message: any }) => {
  const data = message?.data || message;
  const collection = message?.collection || 'events';
  const { Icon, color } = getMessageIcon(collection);
  const id = data?.id || message?.id;
  const name = data?.name || data?.id || id;
  const version = data?.version;

  return (
    <a
      href={buildUrl(`/docs/${collection}/${id}/${version}`)}
      className={`flex items-center gap-1.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm`}
    >
      <Icon className={`h-3.5 w-3.5 text-${color}-500 flex-shrink-0`} />
      <span className="truncate max-w-[140px]">{name}</span>
    </a>
  );
});

const SpecificationBadge = memo(
  ({ spec, serviceId, serviceVersion }: { spec: any; serviceId: string; serviceVersion: string }) => {
    return (
      <a
        href={getSpecUrl(spec, serviceId, serviceVersion)}
        className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
      >
        <img src={buildUrl(`/icons/${getSpecIcon(spec.type)}.svg`, true)} alt={`${spec.type} icon`} className="h-3.5 w-3.5" />
        <span>{getSpecLabel(spec.type)}</span>
      </a>
    );
  }
);

const ContainerBadge = memo(({ container, type }: { container: any; type: 'reads' | 'writes' }) => {
  const data = container?.data || container;
  const id = data?.id || container?.id;
  const name = data?.name || id;
  const version = data?.version;

  return (
    <a
      href={buildUrl(`/docs/containers/${id}/${version}`)}
      className={`inline-flex items-center gap-1.5 px-2 py-1.5 bg-white border rounded-lg text-xs font-medium transition-all shadow-sm ${
        type === 'reads'
          ? 'border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300'
          : 'border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300'
      }`}
    >
      <CircleStackIcon className={`h-3.5 w-3.5 ${type === 'reads' ? 'text-amber-500' : 'text-violet-500'}`} />
      <span>{name}</span>
    </a>
  );
});

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
  const hasContent = hasMessages || hasContainers || hasSpecs;

  return (
    <div className="bg-white border border-pink-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* Service Header - Clickable */}
      <div
        onClick={() => hasContent && setIsCollapsed(!isCollapsed)}
        className={`flex items-center justify-between px-4 py-3 ${hasContent ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors ${!isCollapsed && hasContent ? 'border-b border-gray-100' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-pink-100 border border-pink-200 rounded-lg">
            <ServerIcon className="h-4 w-4 text-pink-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{data.name || data.id}</span>
              <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">v{data.version}</span>
              {/* Show summary counts when collapsed */}
              {isCollapsed && hasContent && (
                <span className="text-[11px] text-gray-500 ml-2 flex items-center gap-2">
                  {specifications.length > 0 && (
                    <span>
                      {specifications.length} spec{specifications.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {receives.length > 0 && <span>{receives.length} receives</span>}
                  {sends.length > 0 && <span>{sends.length} sends</span>}
                  {readsFrom.length > 0 && <span>{readsFrom.length} reads</span>}
                  {writesTo.length > 0 && <span>{writesTo.length} writes</span>}
                </span>
              )}
            </div>
            {data.summary && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-md">{data.summary}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasContent && (
            <div className="p-1.5 text-gray-400">
              {isCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
            </div>
          )}
          <a
            href={buildUrl(`/architecture/services/${data.id}/${data.version}`)}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            title="View service architecture"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Specifications */}
      {!isCollapsed && hasSpecs && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Specifications</span>
            <span className="text-[10px] text-white bg-indigo-500 px-1.5 py-0.5 rounded-full font-medium">
              {specifications.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {specifications.map((spec: any, idx: number) => (
              <SpecificationBadge key={`${spec.type}-${idx}`} spec={spec} serviceId={data.id} serviceVersion={data.version} />
            ))}
          </div>
        </div>
      )}

      {/* Message Flow */}
      {!isCollapsed && hasMessages && (
        <div className="p-4">
          <div className="flex items-stretch gap-3">
            {/* Inbound Messages */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowLongRightIcon className="h-4 w-4 text-blue-500" />
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Receives</span>
                <span className="text-[10px] text-white bg-blue-500 px-1.5 py-0.5 rounded-full font-medium">
                  {receives.length}
                </span>
              </div>
              {receives.length > 0 ? (
                <div className="space-y-1.5">
                  {receives.slice(0, 3).map((msg: any, idx: number) => {
                    const msgId = msg?.data?.id || msg?.id;
                    return msgId ? <MessageBadge key={`${msgId}-${idx}`} message={msg} /> : null;
                  })}
                  {receives.length > 3 && (
                    <p className="text-[10px] text-gray-400 font-medium pl-2">+{receives.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic pl-2">None</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center px-2">
              <div className="w-px h-full bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
            </div>

            {/* Outbound Messages */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowLongLeftIcon className="h-4 w-4 text-emerald-500 rotate-180" />
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Sends</span>
                <span className="text-[10px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-full font-medium">
                  {sends.length}
                </span>
              </div>
              {sends.length > 0 ? (
                <div className="space-y-1.5">
                  {sends.slice(0, 3).map((msg: any, idx: number) => {
                    const msgId = msg?.data?.id || msg?.id;
                    return msgId ? <MessageBadge key={`${msgId}-${idx}`} message={msg} /> : null;
                  })}
                  {sends.length > 3 && <p className="text-[10px] text-gray-400 font-medium pl-2">+{sends.length - 3} more</p>}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic pl-2">None</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Container Relationships */}
      {!isCollapsed && hasContainers && (
        <div className={`px-4 pb-4 ${hasMessages ? 'pt-0' : 'pt-4'}`}>
          {hasMessages && <div className="border-t border-gray-100 mb-4" />}
          <div className="grid grid-cols-2 gap-4">
            {/* Reads From */}
            {readsFrom.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CircleStackIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold text-gray-600">Reads from</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {readsFrom.slice(0, 2).map((container: any, idx: number) => {
                    const containerId = container?.data?.id || container?.id;
                    return containerId ? (
                      <ContainerBadge key={`${containerId}-${idx}`} container={container} type="reads" />
                    ) : null;
                  })}
                  {readsFrom.length > 2 && <span className="text-[10px] text-gray-400 self-center">+{readsFrom.length - 2}</span>}
                </div>
              </div>
            )}

            {/* Writes To */}
            {writesTo.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CircleStackIcon className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[11px] font-semibold text-gray-600">Writes to</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {writesTo.slice(0, 2).map((container: any, idx: number) => {
                    const containerId = container?.data?.id || container?.id;
                    return containerId ? (
                      <ContainerBadge key={`${containerId}-${idx}`} container={container} type="writes" />
                    ) : null;
                  })}
                  {writesTo.length > 2 && <span className="text-[10px] text-gray-400 self-center">+{writesTo.length - 2}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const SubdomainSection = memo(({ subdomain }: { subdomain: any }) => {
  const data = subdomain?.data || subdomain;
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!data?.id) return null;

  const services = data.services || [];
  const entities = data.entities || [];

  return (
    <div className="bg-white border border-orange-200 rounded-xl overflow-hidden shadow-sm">
      {/* Subdomain Header - Clickable */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center justify-between px-5 py-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors ${!isCollapsed ? 'border-b border-gray-200' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-orange-100 border border-orange-200 rounded-lg">
            <RectangleGroupIcon className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{data.name || data.id}</h3>
              <span className="text-[11px] text-gray-500 font-medium bg-white px-1.5 py-0.5 rounded border border-gray-200">
                v{data.version}
              </span>
              {/* Show counts when collapsed */}
              {isCollapsed && (services.length > 0 || entities.length > 0) && (
                <span className="text-[11px] text-gray-400 ml-1">
                  {services.length > 0 && `${services.length} service${services.length > 1 ? 's' : ''}`}
                  {services.length > 0 && entities.length > 0 && ', '}
                  {entities.length > 0 && `${entities.length} entit${entities.length > 1 ? 'ies' : 'y'}`}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Subdomain</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="p-2 text-gray-400">
            {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </div>
          <a
            href={buildUrl(`/architecture/domains/${data.id}/${data.version}`)}
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
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
                <BoxIcon className="h-4 w-4 text-purple-600" />
                <h4 className="text-sm font-bold text-gray-900">Entities</h4>
                <span className="text-xs text-white bg-purple-500 px-2 py-0.5 rounded-full font-medium">{entities.length}</span>
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
                <ServerIcon className="h-4 w-4 text-pink-600" />
                <h4 className="text-sm font-bold text-gray-900">Services</h4>
                <span className="text-xs text-white bg-pink-500 px-2 py-0.5 rounded-full font-medium">{services.length}</span>
              </div>
              <div className="space-y-3">
                {services.map((service: any) => {
                  const serviceId = service?.data?.id || service?.id;
                  return serviceId ? <ServiceCard key={serviceId} service={service} /> : null;
                })}
              </div>
            </div>
          )}

          {entities.length === 0 && services.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">No entities or services in this subdomain</p>
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
  if (!data) return <div className="text-gray-500">No domain data</div>;

  const subdomains = data.domains || [];
  const entities = data.entities || [];
  const services = data.services || [];

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

  const topLevelServices = useMemo(
    () =>
      services.filter((s: any) => {
        const sId = s?.data?.id || s?.id;
        return sId && !subdomainServiceIds.has(sId);
      }),
    [services, subdomainServiceIds]
  );

  return (
    <div className="space-y-6">
      {/* Domain Container */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Domain Header */}
        <div className="bg-gray-50/80 border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-100 border border-amber-200 rounded-xl shadow-sm">
                <RectangleGroupIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{data.name || data.id}</h1>
                  <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                    v{data.version}
                  </span>
                </div>
                <span className="text-sm text-gray-500 font-medium">Domain</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={buildUrl(`/docs/domains/${data.id}/${data.version}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                View docs
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href={buildUrl(`/visualiser/domains/${data.id}/${data.version}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-900 rounded-lg hover:bg-gray-900 transition-all shadow-sm"
              >
                Visualizer
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </div>

          {data.summary && <p className="text-gray-600 mt-3 max-w-3xl">{data.summary}</p>}
        </div>

        {/* Domain Content */}
        <div className="p-6 space-y-6">
          {/* Domain Entities */}
          {entities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BoxIcon className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-gray-900">Entities</h3>
                <span className="text-xs text-white bg-purple-500 px-2 py-0.5 rounded-full font-medium">{entities.length}</span>
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
              <div className="flex items-center gap-2 mb-3">
                <ServerIcon className="h-4 w-4 text-pink-600" />
                <h3 className="text-sm font-bold text-gray-900">Services</h3>
                <span className="text-xs text-white bg-pink-500 px-2 py-0.5 rounded-full font-medium">
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
              <div className="flex items-center gap-2 mb-3">
                <RectangleGroupIcon className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-bold text-gray-900">Subdomains</h3>
                <span className="text-xs text-white bg-orange-500 px-2 py-0.5 rounded-full font-medium">{subdomains.length}</span>
              </div>
              <div className="space-y-4">
                {subdomains.map((subdomain: any) => {
                  const subdomainId = subdomain?.data?.id || subdomain?.id;
                  return subdomainId ? <SubdomainSection key={subdomainId} subdomain={subdomain} /> : null;
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {entities.length === 0 && services.length === 0 && subdomains.length === 0 && (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl">
                <RectangleGroupIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">This domain has no entities, services, or subdomains defined.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
