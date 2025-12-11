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
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import { BoxIcon } from 'lucide-react';

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
      return { Icon: MagnifyingGlassIcon, color: 'green' };
    default:
      return { Icon: BoltIcon, color: 'gray' };
  }
};

// ============================================
// Simple Sub-components
// ============================================

const EntityBadge = memo(({ entity }: { entity: any }) => {
  const id = entity?.data?.id || entity?.id;
  const name = entity?.data?.name || entity?.name || id;

  return (
    <a
      href={buildUrl(`/docs/entities/${id}`)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 border border-purple-300 rounded-md text-xs font-medium hover:bg-purple-200 transition-colors"
    >
      <BoxIcon className="h-3.5 w-3.5 text-purple-600" />
      <span className="text-purple-800">{name}</span>
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
      className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-[11px] font-medium hover:bg-gray-50 transition-colors"
    >
      <Icon className={`h-3 w-3 text-${color}-500`} />
      <span className="text-gray-700 truncate max-w-[120px]">{name}</span>
    </a>
  );
});

const ContainerBadge = memo(({ container, type }: { container: any; type: 'reads' | 'writes' }) => {
  const data = container?.data || container;
  const id = data?.id || container?.id;
  const name = data?.name || id;
  const version = data?.version;
  const colorClass = type === 'reads' ? 'orange' : 'purple';

  return (
    <a
      href={buildUrl(`/docs/containers/${id}/${version}`)}
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-${colorClass}-100 border border-${colorClass}-300 rounded text-[11px] font-medium hover:bg-${colorClass}-200 transition-colors`}
    >
      <CircleStackIcon className={`h-3 w-3 text-${colorClass}-600`} />
      <span className={`text-${colorClass}-800`}>{name}</span>
    </a>
  );
});

const ServiceCard = memo(({ service }: { service: any }) => {
  const data = service?.data || service;
  if (!data?.id) return null;

  const receives = data.receives || [];
  const sends = data.sends || [];
  const readsFrom = data.readsFrom || [];
  const writesTo = data.writesTo || [];
  const hasMessages = receives.length > 0 || sends.length > 0;
  const hasContainers = readsFrom.length > 0 || writesTo.length > 0;

  return (
    <div className="bg-white border-2 border-dashed border-pink-400 rounded-lg p-4">
      {/* Service Header */}
      <div className="flex items-center justify-between">
        <a
          href={buildUrl(`/architecture/services/${data.id}/${data.version}`)}
          className="flex items-center gap-2 hover:underline"
        >
          <ServerIcon className="h-5 w-5 text-pink-500" />
          <span className="font-semibold text-gray-900">{data.name || data.id}</span>
          <span className="text-xs text-gray-500">v{data.version}</span>
        </a>
        <a
          href={buildUrl(`/architecture/services/${data.id}/${data.version}`)}
          className="p-1 hover:bg-pink-100 rounded-md transition-colors duration-200"
          title="Expand service architecture"
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowsPointingOutIcon className="h-4 w-4 text-gray-500 hover:text-pink-600" />
        </a>
      </div>

      {data.summary && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{data.summary}</p>}

      {/* Message Flow Diagram */}
      {hasMessages && (
        <div className="mt-4 flex items-stretch gap-3">
          {/* Receives (Inbound) */}
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold text-blue-700 uppercase">Inbound Messages</span>
              <span className="text-xs text-blue-500">({receives.length})</span>
            </div>
            {receives.length > 0 ? (
              <div className="space-y-1.5">
                {receives.slice(0, 4).map((msg: any, idx: number) => {
                  const msgId = msg?.data?.id || msg?.id;
                  return msgId ? <MessageBadge key={`${msgId}-${idx}`} message={msg} /> : null;
                })}
                {receives.length > 4 && <p className="text-[10px] text-gray-500 text-center">+{receives.length - 4} more</p>}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 italic">No incoming messages</p>
            )}
          </div>

          {/* Service Icon (Center) */}
          <div className="flex items-center">
            <div className="bg-pink-100 border-2 border-pink-300 rounded-lg p-3">
              <ServerIcon className="h-6 w-6 text-pink-500" />
            </div>
          </div>

          {/* Sends (Outbound) */}
          <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold text-green-700 uppercase">Outbound Messages</span>
              <span className="text-xs text-green-500">({sends.length})</span>
            </div>
            {sends.length > 0 ? (
              <div className="space-y-1.5">
                {sends.slice(0, 4).map((msg: any, idx: number) => {
                  const msgId = msg?.data?.id || msg?.id;
                  return msgId ? <MessageBadge key={`${msgId}-${idx}`} message={msg} /> : null;
                })}
                {sends.length > 4 && <p className="text-[10px] text-gray-500 text-center">+{sends.length - 4} more</p>}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 italic">No outgoing messages</p>
            )}
          </div>
        </div>
      )}

      {/* Container Relationships */}
      {hasContainers && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
          {/* Reads From */}
          {readsFrom.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CircleStackIcon className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-gray-700">Reads from</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {readsFrom.slice(0, 3).map((container: any, idx: number) => {
                  const containerId = container?.data?.id || container?.id;
                  return containerId ? <ContainerBadge key={`${containerId}-${idx}`} container={container} type="reads" /> : null;
                })}
                {readsFrom.length > 3 && <span className="text-[10px] text-gray-500">+{readsFrom.length - 3} more</span>}
              </div>
            </div>
          )}

          {/* Writes To */}
          {writesTo.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CircleStackIcon className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs font-semibold text-gray-700">Writes to</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {writesTo.slice(0, 3).map((container: any, idx: number) => {
                  const containerId = container?.data?.id || container?.id;
                  return containerId ? (
                    <ContainerBadge key={`${containerId}-${idx}`} container={container} type="writes" />
                  ) : null;
                })}
                {writesTo.length > 3 && <span className="text-[10px] text-gray-500">+{writesTo.length - 3} more</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const SubdomainSection = memo(({ subdomain }: { subdomain: any }) => {
  const data = subdomain?.data || subdomain;
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!data?.id) return null;

  const services = data.services || [];
  const entities = data.entities || [];

  return (
    <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-6">
      {/* Subdomain Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RectangleGroupIcon className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">{data.name || data.id}</h3>
          <span className="text-xs text-gray-500">v{data.version}</span>
          <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded">Subdomain</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-orange-200 rounded-md transition-colors cursor-pointer text-gray-500 hover:text-gray-700"
          >
            {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </button>
          <a
            href={buildUrl(`/architecture/domains/${data.id}/${data.version}`)}
            className="p-1 hover:bg-orange-200 rounded-md transition-colors cursor-pointer text-gray-500 hover:text-gray-700"
            title="Expand domain architecture"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowsPointingOutIcon className="h-5 w-5" />
          </a>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Subdomain Entities */}
          {entities.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Entities</h4>
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
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</h4>
              <div className="grid gap-4 xl:grid-cols-2">
                {services.map((service: any) => {
                  const serviceId = service?.data?.id || service?.id;
                  // Ensure we pass the service down with its messages populated
                  return serviceId ? <ServiceCard key={serviceId} service={service} /> : null;
                })}
              </div>
            </div>
          )}

          {entities.length === 0 && services.length === 0 && (
            <p className="text-sm text-gray-500 italic">No entities or services in this subdomain</p>
          )}
        </>
      )}
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export default function DomainGrid({ domain }: DomainGridProps) {
  const data = domain?.data;
  if (!data) return <div>No domain data</div>;

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
      {/* Domain Container - Yellow */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6">
        {/* Domain Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RectangleGroupIcon className="h-7 w-7 text-yellow-600" />
            <h1 className="text-2xl font-bold text-gray-900">{data.name || data.id}</h1>
            <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">v{data.version}</span>
            <span className="px-2 py-0.5 bg-yellow-300 text-yellow-900 text-xs font-medium rounded">Domain</span>
          </div>
          <div className="flex gap-3">
            <a
              href={buildUrl(`/docs/domains/${data.id}/${data.version}`)}
              className="text-sm bg-white px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              View docs
            </a>
            <a
              href={buildUrl(`/visualiser/domains/${data.id}/${data.version}`)}
              className="text-sm bg-white px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Visualizer
            </a>
          </div>
        </div>

        {data.summary && <p className="text-gray-600 mb-4">{data.summary}</p>}

        {/* Domain Entities */}
        {entities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Entities</h3>
            <div className="flex flex-wrap gap-2">
              {entities.map((entity: any) => {
                const entityId = entity?.data?.id || entity?.id;
                return entityId ? <EntityBadge key={entityId} entity={entity} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Top-level Services (not in subdomains) */}
        {topLevelServices.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Services</h3>
            <div className="grid gap-4 xl:grid-cols-2">
              {topLevelServices.map((service: any) => {
                const serviceId = service?.data?.id || service?.id;
                return serviceId ? <ServiceCard key={serviceId} service={service} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Subdomains - nested inside domain */}
        {subdomains.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Subdomains</h3>
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
          <div className="text-center py-8">
            <p className="text-gray-500">This domain has no entities, services, or subdomains defined.</p>
          </div>
        )}
      </div>
    </div>
  );
}
