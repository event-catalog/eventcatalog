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
      className={`group block bg-white border border-${color}-200 rounded-lg shadow-sm hover:shadow-md hover:border-${color}-300 transition-all`}
    >
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`flex items-center justify-center w-7 h-7 bg-${color}-100 rounded-md`}>
            <Icon className={`h-4 w-4 text-${color}-600`} />
          </div>
          <h3
            className={`font-semibold text-gray-900 group-hover:text-${color}-600 transition-colors truncate ${compact ? 'text-sm' : 'text-base'}`}
          >
            {message.data.name}
          </h3>
          <span className={`text-[10px] text-${color}-600 font-medium bg-${color}-50 px-1.5 py-0.5 rounded flex-shrink-0`}>
            v{message.data.version}
          </span>
        </div>
        {message.data.summary && (
          <p className={`text-gray-600 line-clamp-2 ${compact ? 'text-xs mt-1' : 'text-sm mt-2'}`}>{message.data.summary}</p>
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
      className={`group block bg-white border rounded-lg shadow-sm hover:shadow-md transition-all ${
        type === 'reads' ? 'border-amber-200 hover:border-amber-300' : 'border-violet-200 hover:border-violet-300'
      }`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 bg-${colorClass}-100 rounded-md`}>
            <CircleStackIcon className={`h-4 w-4 text-${colorClass}-600`} />
          </div>
          <h3 className={`font-semibold text-gray-900 text-sm group-hover:text-${colorClass}-600 transition-colors truncate`}>
            {container.data.name}
          </h3>
        </div>
        {container.data.summary && <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{container.data.summary}</p>}
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
        className={`group flex items-center gap-3 p-3 bg-white border border-${color}-200 rounded-lg shadow-sm hover:shadow-md hover:border-${color}-300 transition-all`}
      >
        <img src={buildUrl(`/icons/${getSpecIcon(spec.type)}.svg`, true)} alt={`${spec.type} icon`} className="h-6 w-6" />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-gray-900 text-sm group-hover:text-${color}-600 transition-colors truncate`}>
            {spec.name || spec.filename}
          </h3>
          <p className="text-xs text-gray-500">{getSpecLabel(spec.type)}</p>
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
      <div className={`bg-white border border-${color}-200 rounded-xl shadow-sm overflow-hidden`}>
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-${color}-50/50 transition-colors ${!isCollapsed && hasContent ? `border-b border-${color}-100 bg-${color}-50/30` : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 bg-${color}-100 rounded-lg`}>
              <Icon className={`h-4 w-4 text-${color}-600`} />
            </div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <span className={`text-xs text-white bg-${color}-500 px-2 py-0.5 rounded-full font-medium`}>{messages.length}</span>
          </div>
          <div className={`text-${color}-400`}>
            {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </div>
        </div>
        {!isCollapsed && (
          <div className="p-5 bg-gray-50/50">
            {hasContent ? (
              <div className="space-y-3">
                {messages.map((message: any) => (
                  <MessageCard key={`${message.data.id}-${message.data.version}`} message={message} compact={embeded} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">{emptyText}</p>
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
      <div className={`bg-white border border-${color}-200 rounded-xl shadow-sm overflow-hidden`}>
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-${color}-50/50 transition-colors ${!isCollapsed ? `border-b border-${color}-100 bg-${color}-50/30` : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 bg-${color}-100 rounded-lg`}>
              <CircleStackIcon className={`h-4 w-4 text-${color}-600`} />
            </div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <span className={`text-xs text-white bg-${color}-500 px-2 py-0.5 rounded-full font-medium`}>{containers.length}</span>
          </div>
          <div className={`text-${color}-400`}>
            {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </div>
        </div>
        {!isCollapsed && (
          <div className="p-5 bg-gray-50/50">
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
    <div className="space-y-6">
      {/* Service Container */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Service Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-pink-100 border border-pink-200 rounded-xl shadow-sm">
                <ServerIcon className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{service.data.name}</h1>
                  <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                    v{service.data.version}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-500 font-medium">Service</span>
                  {(hasMessages || hasContainers || hasSpecs) && (
                    <span className="text-xs text-gray-400">
                      {receives.length > 0 && `${receives.length} receives`}
                      {receives.length > 0 && sends.length > 0 && ' · '}
                      {sends.length > 0 && `${sends.length} sends`}
                      {hasMessages && hasContainers && ' · '}
                      {readsFrom.length > 0 && `${readsFrom.length} reads`}
                      {readsFrom.length > 0 && writesTo.length > 0 && ' · '}
                      {writesTo.length > 0 && `${writesTo.length} writes`}
                      {(hasMessages || hasContainers) && hasSpecs && ' · '}
                      {hasSpecs && `${specifications.length} spec${specifications.length > 1 ? 's' : ''}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={buildUrl(`/docs/services/${service.data.id}/${service.data.version}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                View docs
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href={buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-900 rounded-lg hover:bg-gray-900 transition-all shadow-sm"
              >
                Visualizer
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </div>

          {service.data.summary && <p className="text-gray-600 mt-3 max-w-3xl">{service.data.summary}</p>}
        </div>

        {/* Service Content */}
        <div className="p-6">
          {/* Specifications */}
          {hasSpecs && (
            <div className="pb-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-gray-900">Specifications</h2>
                <span className="text-xs text-white bg-indigo-500 px-2 py-0.5 rounded-full font-medium">
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
            <div className={`pb-6 ${hasSpecs ? 'pt-6 border-t border-gray-200' : ''}`}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-gray-900">Sends and Receives Messages</h2>
                <span className="text-xs text-white bg-sky-500 px-2 py-0.5 rounded-full font-medium">
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
            <div className={`${hasMessages || hasSpecs ? 'pt-6 border-t border-gray-200' : ''}`}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-gray-900">Data sources</h2>
                <span className="text-xs text-white bg-amber-500 px-2 py-0.5 rounded-full font-medium">
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
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl">
                <ServerIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">
                This service has no message flows, container relationships, or specifications defined.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
