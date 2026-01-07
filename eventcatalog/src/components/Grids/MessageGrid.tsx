import { memo, useState } from 'react';
import {
  ServerIcon,
  CircleStackIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLongRightIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import { getSpecUrl, getSpecIcon, getSpecLabel, getSpecColor, type Specification } from './specification-utils';

interface MessageGridV2Props {
  service: CollectionEntry<'services'>;
  embeded?: boolean;
  specifications?: Specification[];
}

// Helper to get message icon and color
const getMessageStyle = (collection: string) => {
  switch (collection) {
    case 'events':
      return { Icon: BoltIcon, color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' };
    case 'commands':
      return { Icon: ChatBubbleLeftIcon, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' };
    case 'queries':
      return {
        Icon: MagnifyingGlassIcon,
        color: 'emerald',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-600',
      };
    default:
      return { Icon: BoltIcon, color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' };
  }
};

// Message Card Component
const MessageCard = memo(({ message, compact = false }: { message: any; compact?: boolean }) => {
  const { Icon, color } = getMessageStyle(message.collection);

  return (
    <a
      href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
      className={`group block bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-${color}-200 dark:border-${color}-500/30 rounded-lg shadow-sm hover:shadow-md hover:border-${color}-300 dark:hover:border-${color}-500/50 transition-all`}
    >
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`flex items-center justify-center w-7 h-7 bg-${color}-100 dark:bg-${color}-500/20 rounded-md`}>
            <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <h3
            className={`font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-${color}-600 dark:group-hover:text-${color}-400 transition-colors truncate ${compact ? 'text-sm' : 'text-base'}`}
          >
            {message.data.name}
          </h3>
          <span className={`text-[10px] text-${color}-600 dark:text-${color}-400 font-medium bg-${color}-50 dark:bg-${color}-500/20 px-1.5 py-0.5 rounded flex-shrink-0`}>
            v{message.data.version}
          </span>
        </div>
        {message.data.summary && (
          <p className={`text-[rgb(var(--ec-page-text-muted))] line-clamp-2 ${compact ? 'text-xs mt-1' : 'text-sm mt-2'}`}>{message.data.summary}</p>
        )}
      </div>
    </a>
  );
});

// Container Card Component
const ContainerCard = memo(({ container, type }: { container: any; type: 'reads' | 'writes' }) => {
  const colorClass = type === 'reads' ? 'amber' : 'violet';

  return (
    <a
      href={buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`)}
      className={`group block bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border rounded-lg shadow-sm hover:shadow-md transition-all ${
        type === 'reads' ? 'border-amber-200 dark:border-amber-500/30 hover:border-amber-300 dark:hover:border-amber-500/50' : 'border-violet-200 dark:border-violet-500/30 hover:border-violet-300 dark:hover:border-violet-500/50'
      }`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 bg-${colorClass}-100 dark:bg-${colorClass}-500/20 rounded-md`}>
            <CircleStackIcon className={`h-4 w-4 text-${colorClass}-600 dark:text-${colorClass}-400`} />
          </div>
          <h3 className={`font-semibold text-[rgb(var(--ec-page-text))] text-sm group-hover:text-${colorClass}-600 dark:group-hover:text-${colorClass}-400 transition-colors truncate`}>
            {container.data.name}
          </h3>
        </div>
        {container.data.summary && <p className="text-xs text-[rgb(var(--ec-page-text-muted))] mt-1.5 line-clamp-2">{container.data.summary}</p>}
      </div>
    </a>
  );
});

// Specification Card Component
const SpecificationCard = memo(
  ({ spec, serviceId, serviceVersion }: { spec: any; serviceId: string; serviceVersion: string }) => {
    const color = getSpecColor(spec.type);

    return (
      <a
        href={getSpecUrl(spec, serviceId, serviceVersion)}
        className={`group flex items-center gap-3 p-3 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-${color}-200 dark:border-${color}-500/30 rounded-lg shadow-sm hover:shadow-md hover:border-${color}-300 dark:hover:border-${color}-500/50 transition-all`}
      >
        <img src={buildUrl(`/icons/${getSpecIcon(spec.type)}.svg`, true)} alt={`${spec.type} icon`} className="h-6 w-6" />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-[rgb(var(--ec-page-text))] text-sm group-hover:text-${color}-600 dark:group-hover:text-${color}-400 transition-colors truncate`}>
            {spec.name || spec.filename}
          </h3>
          <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">{getSpecLabel(spec.type)}</p>
        </div>
      </a>
    );
  }
);

// Collapsible Message Section Component
const CollapsibleMessageSection = memo(
  ({
    icon: Icon,
    title,
    messages,
    color,
    emptyText,
    embeded = false,
  }: {
    icon: any;
    title: string;
    messages: any[];
    color: string;
    emptyText: string;
    embeded?: boolean;
  }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const hasContent = messages.length > 0;

    return (
      <div className="bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-xl shadow-sm overflow-hidden">
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[rgb(var(--ec-content-hover))] transition-colors ${!isCollapsed && hasContent ? 'border-b border-[rgb(var(--ec-page-border))]' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 bg-${color}-100 dark:bg-${color}-500/20 rounded-lg`}>
              <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <h2 className="text-base font-bold text-[rgb(var(--ec-page-text))]">{title}</h2>
            <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded-full font-medium">{messages.length}</span>
          </div>
          <div className="text-[rgb(var(--ec-icon-color))]">
            {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </div>
        </div>
        {!isCollapsed && (
          <div className="p-5">
            {hasContent ? (
              <div className="space-y-3">
                {messages.map((message: any) => (
                  <MessageCard key={`${message.data.id}-${message.data.version}`} message={message} compact={embeded} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-[rgb(var(--ec-icon-color))]">{emptyText}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

// Collapsible Container Section Component
const CollapsibleContainerSection = memo(
  ({ title, containers, color, type }: { title: string; containers: any[]; color: string; type: 'reads' | 'writes' }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
      <div className="bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-xl shadow-sm overflow-hidden">
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[rgb(var(--ec-content-hover))] transition-colors ${!isCollapsed ? 'border-b border-[rgb(var(--ec-page-border))]' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 bg-${color}-100 dark:bg-${color}-500/20 rounded-lg`}>
              <CircleStackIcon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <h2 className="text-base font-bold text-[rgb(var(--ec-page-text))]">{title}</h2>
            <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded-full font-medium">{containers.length}</span>
          </div>
          <div className="text-[rgb(var(--ec-icon-color))]">
            {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </div>
        </div>
        {!isCollapsed && (
          <div className="p-5">
            <div className="space-y-3">
              {containers.map((container: any) => (
                <ContainerCard key={container.data.id} container={container} type={type} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default function MessageGridV2({ service, embeded = false, specifications = [] }: MessageGridV2Props) {
  const { sends = [], receives = [], writesTo = [], readsFrom = [] } = service.data;
  const hasContainers = readsFrom.length > 0 || writesTo.length > 0;
  const hasMessages = receives.length > 0 || sends.length > 0;
  const hasSpecs = specifications.length > 0;

  return (
    <div className="w-full">
      {/* Service Header - Doc style */}
      <div className="border-b border-[rgb(var(--ec-page-border))] md:pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl md:text-4xl font-bold text-[rgb(var(--ec-page-text))]">{service.data.name}</h2>
            {service.data.summary && <p className="text-lg pt-2 text-[rgb(var(--ec-page-text-muted))] font-light">{service.data.summary}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={buildUrl(`/docs/services/${service.data.id}/${service.data.version}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg hover:bg-[rgb(var(--ec-content-hover))] hover:border-[rgb(var(--ec-page-text-muted))] transition-all"
            >
              View docs
              <ArrowTopRightOnSquareIcon className="h-4 w-4 text-[rgb(var(--ec-icon-color))]" />
            </a>
            <a
              href={buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-zinc-800 dark:bg-zinc-700 rounded-lg hover:bg-zinc-900 dark:hover:bg-zinc-600 transition-all"
            >
              Visualizer
              <ArrowTopRightOnSquareIcon className="h-4 w-4 text-zinc-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Service Content */}
      <div className="py-4 space-y-8">
        {/* Specifications */}
        {hasSpecs && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Specifications</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {specifications.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {specifications.map((spec: any) => (
                <SpecificationCard
                  key={`${spec.type}-${spec.filename}`}
                  spec={spec}
                  serviceId={service.data.id}
                  serviceVersion={service.data.version}
                />
              ))}
            </div>
          </div>
        )}

        {/* Message Flow - Two columns side by side */}
        {hasMessages && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BoltIcon className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Messages</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {receives.length + sends.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CollapsibleMessageSection
                icon={ArrowLongRightIcon}
                title="Receives"
                messages={receives}
                color="blue"
                emptyText="No messages received"
                embeded={embeded}
              />
              <CollapsibleMessageSection
                icon={ArrowLongRightIcon}
                title="Sends"
                messages={sends}
                color="emerald"
                emptyText="No messages sent"
                embeded={embeded}
              />
            </div>
          </div>
        )}

        {/* Container Relationships */}
        {hasContainers && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CircleStackIcon className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Data Sources</h3>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2.5 py-0.5 rounded-full font-medium">
                {readsFrom.length + writesTo.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readsFrom.length > 0 && (
                <CollapsibleContainerSection title="Reads from" containers={readsFrom} color="amber" type="reads" />
              )}
              {writesTo.length > 0 && (
                <CollapsibleContainerSection title="Writes to" containers={writesTo} color="violet" type="writes" />
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasMessages && !hasContainers && !hasSpecs && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-[rgb(var(--ec-content-hover))] rounded-2xl">
              <ServerIcon className="h-8 w-8 text-[rgb(var(--ec-icon-color))]" />
            </div>
            <p className="text-[rgb(var(--ec-page-text-muted))]">
              This service has no message flows, container relationships, or specifications defined.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
