import { useMemo } from 'react';
import { ServerIcon, GlobeAltIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import { BoxIcon, Group as GroupIcon, Waypoints, Database as DatabaseIcon } from 'lucide-react';
import { ServiceCard, EntityBadge } from './DomainGrid';

interface SystemGridProps {
  system: any;
}

const FlowLink = ({ flow }: { flow: any }) => {
  const data = flow?.data || flow;
  const id = data?.id || flow?.id;
  const name = data?.name || id;
  const version = data?.version || 'latest';

  return (
    <a
      href={buildUrl(`/docs/flows/${id}/${version}`)}
      className="inline-flex items-center gap-2 px-3 py-2 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg text-sm font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] hover:border-[rgb(var(--ec-accent)/0.5)] transition-all shadow-xs"
    >
      <Waypoints className="h-4 w-4 text-[rgb(var(--ec-accent))]" />
      <span>{name}</span>
      <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{version}</span>
    </a>
  );
};

const DataStoreLink = ({ container }: { container: any }) => {
  const data = container?.data || container;
  const id = data?.id || container?.id;
  const name = data?.name || id;
  const version = data?.version || 'latest';
  const technology = data?.technology;

  return (
    <a
      href={buildUrl(`/docs/containers/${id}/${version}`)}
      className="inline-flex items-center gap-2 px-3 py-2 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg text-sm font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] hover:border-[rgb(var(--ec-accent)/0.5)] transition-all shadow-xs"
    >
      <CircleStackIcon className="h-4 w-4 text-amber-500" />
      <span>{name}</span>
      {technology && <span className="text-xs text-[rgb(var(--ec-icon-color))]">{technology}</span>}
    </a>
  );
};

export default function SystemGrid({ system }: SystemGridProps) {
  const data = system?.data;
  if (!data) return <div className="text-[rgb(var(--ec-page-text-muted))]">No system data</div>;

  const entities = data.entities || [];
  const services = data.services || [];
  const flows = data.flows || [];
  const containers = data.containers || [];

  // Split services into internal services and external integrations
  // (mirrors the sidebar, where externalSystem services live under "External Integrations")
  const internalServices = useMemo(() => services.filter((s: any) => !(s?.data || s)?.externalSystem), [services]);
  const externalServices = useMemo(() => services.filter((s: any) => (s?.data || s)?.externalSystem), [services]);

  return (
    <div className="w-full">
      {/* System Header - Doc style */}
      <div className="border-b border-[rgb(var(--ec-page-border))] md:pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl md:text-4xl font-bold text-[rgb(var(--ec-page-text))]">{data.name || data.id}</h2>
            {data.summary && <p className="text-lg pt-2 text-[rgb(var(--ec-page-text-muted))] font-light">{data.summary}</p>}
          </div>
        </div>
      </div>

      {/* System Content */}
      <div className="py-4 space-y-8">
        {/* System Entities */}
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

        {/* Services */}
        {internalServices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ServerIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Services</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {internalServices.length}
              </span>
            </div>
            <div className="space-y-3">
              {internalServices.map((service: any) => {
                const serviceId = service?.data?.id || service?.id;
                return serviceId ? <ServiceCard key={serviceId} service={service} /> : null;
              })}
            </div>
          </div>
        )}

        {/* External Integrations (external systems) */}
        {externalServices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GlobeAltIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">External Integrations</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {externalServices.length}
              </span>
            </div>
            <div className="space-y-3">
              {externalServices.map((service: any) => {
                const serviceId = service?.data?.id || service?.id;
                return serviceId ? <ServiceCard key={serviceId} service={service} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Data Stores (containers) */}
        {containers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DatabaseIcon className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Data Stores</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {containers.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {containers.map((container: any) => {
                const containerId = container?.data?.id || container?.id;
                return containerId ? <DataStoreLink key={containerId} container={container} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Flows */}
        {flows.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Waypoints className="h-5 w-5 text-[rgb(var(--ec-accent))]" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Flows</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {flows.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {flows.map((flow: any) => {
                const flowId = flow?.data?.id || flow?.id;
                return flowId ? <FlowLink key={flowId} flow={flow} /> : null;
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {entities.length === 0 && services.length === 0 && flows.length === 0 && containers.length === 0 && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-[rgb(var(--ec-content-hover))] rounded-2xl">
              <GroupIcon className="h-8 w-8 text-[rgb(var(--ec-icon-color))]" />
            </div>
            <p className="text-[rgb(var(--ec-page-text-muted))]">
              This system has no entities, services, data stores, or flows defined.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
