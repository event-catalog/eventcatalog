import { ServerIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import { getCollectionStyles } from './utils';

interface MessageGridV2Props {
  service: CollectionEntry<'services'>;
  embeded?: boolean;
}

export default function MessageGridV2({ service, embeded = false }: MessageGridV2Props) {
  const { sends = [], receives = [], writesTo = [], readsFrom = [] } = service.data;

  const renderMessageGrid = (messages: any[]) => (
    <div className="grid grid-cols-1 gap-6">
      {messages.map((message) => {
        const { color, Icon } = getCollectionStyles(message.collection);
        return (
          <a
            key={message.data.name}
            href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
            className={`group bg-white border hover:bg-${color}-100 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border-${color}-500`}
          >
            <div className="p-4 py-2 flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {!embeded && <Icon className={`h-5 w-5 text-${color}-500`} />}
                  <h3
                    className={`font-semibold text-gray-900 truncate group-hover:text-${color}-500 transition-colors duration-200 ${embeded ? 'text-sm' : 'text-md'}`}
                  >
                    {message.data.name} (v{message.data.version})
                  </h3>
                </div>
              </div>
              {message.data.summary && <p className="text-gray-600 text-xs line-clamp-2 mb-4">{message.data.summary}</p>}
            </div>
          </a>
        );
      })}
    </div>
  );

  return (
    <div className={`rounded-xl overflow-hidden bg-white p-8 border-2 border-dashed border-pink-300`}>
      {/* Service Title */}
      {/* <div className="flex items-center gap-2 mb-8">
        <ServerIcon className="h-6 w-6 text-pink-500" />
        <h2 className="text-2xl font-semibold text-gray-900">{service.data.name}</h2>
        <div className="flex gap-2 ml-auto">
          <a
            href={buildUrl(`/visualiser/services/${service.data.id}`)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md transition-colors duration-200 hover:bg-gray-50"
          >
            View in visualizer
          </a>
          <a
            href={buildUrl(`/docs/services/${service.data.id}/${service.data.version}`)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-black border border-gray-300 bg-white rounded-md transition-colors duration-200 hover:bg-gray-50"
          >
            Read documentation
          </a>
        </div>
      </div> */}

      <div className="grid grid-cols-3 gap-8 relative">
        {/* Left Column - Receives Messages & Reads From Containers */}
        <div className="space-y-6">
          {/* Receives Messages Section */}
          <div className="bg-blue-50 bg-opacity-50 border border-blue-300 border-dashed rounded-lg p-4">
            <div className="mb-6">
              <h2 className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}>
                <ServerIcon className="h-5 w-5 text-blue-500" />
                Inbound Messages ({receives.length})
              </h2>
            </div>
            {receives.length > 0 ? (
              renderMessageGrid(receives)
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No messages</p>
              </div>
            )}
          </div>

          {/* Reads From Containers */}
          {readsFrom.length > 0 && (
            <div className="bg-orange-50 border border-orange-300 border-dashed rounded-lg p-4 relative">
              <div className="mb-6">
                <h2 className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}>
                  <CircleStackIcon className="h-5 w-5 text-orange-500" />
                  Reads from ({readsFrom.length})
                </h2>
              </div>
              <div className="space-y-3">
                {readsFrom.map((container: any) => (
                  <a
                    key={container.data.id}
                    href={buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`)}
                    className="group bg-white border border-orange-200 hover:bg-orange-100 rounded-lg p-3 block transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <CircleStackIcon className="h-4 w-4 text-orange-500" />
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-orange-700">{container.data.name}</h3>
                    </div>
                    {container.data.summary && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{container.data.summary}</p>
                    )}
                  </a>
                ))}
              </div>
              {/* Arrow from Reads From to Service */}
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-16 z-10">
                <div className="absolute left-0 w-4 h-4 border-b-[3px] border-l-[3px] border-orange-200 transform rotate-45 -translate-x-1 translate-y-[-1px] shadow-[-1px_1px_0_1px_rgba(0,0,0,0.1)]"></div>
                <div className="w-full h-[3px] bg-orange-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
              </div>
            </div>
          )}
        </div>

        {/* Arrow from Receives to Service */}
        <div className="absolute left-[30%] top-[25%] -translate-y-1/2 flex items-center justify-center w-16">
          <div className="w-full h-[3px] bg-blue-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
          <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-blue-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
        </div>

        {/* Service Information (Center) */}
        <div className="bg-pink-50 border-2 border-pink-100 rounded-lg p-6 flex flex-col justify-center">
          <div className="flex flex-col items-center gap-4">
            <ServerIcon className="h-12 w-12 text-pink-500" />
            <p className="text-xl font-semibold text-gray-900 text-center">{service.data.name}</p>

            {/* Quick Stats Grid */}
            <div className="w-full grid grid-cols-2 gap-3 mt-2">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{receives.length}</div>
                <div className="text-xs text-gray-600 mt-1">Inbound Messages</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{sends.length}</div>
                <div className="text-xs text-gray-600 mt-1">Outbound Messages</div>
              </div>
              {readsFrom.length > 0 && (
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{readsFrom.length}</div>
                  <div className="text-xs text-gray-600 mt-1">Reads from</div>
                </div>
              )}
              {writesTo.length > 0 && (
                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">{writesTo.length}</div>
                  <div className="text-xs text-gray-600 mt-1">Writes to</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Arrow from Service to Sends */}
        <div className="absolute right-[30%] top-[25%] -translate-y-1/2 flex items-center justify-center w-16">
          <div className="w-full h-[3px] bg-green-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
          <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-green-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
        </div>

        {/* Right Column - Sends Messages & Writes To Containers */}
        <div className="space-y-6">
          {/* Sends Messages Section */}
          <div className="bg-green-50 border border-green-300 border-dashed rounded-lg p-4">
            <div className="mb-6">
              <h2 className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}>
                <ServerIcon className="h-5 w-5 text-emerald-500" />
                Outbound Messages ({sends.length})
              </h2>
            </div>
            {sends.length > 0 ? (
              renderMessageGrid(sends)
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No messages</p>
              </div>
            )}
          </div>

          {/* Writes To Containers */}
          {writesTo.length > 0 && (
            <div className="bg-purple-50 border border-purple-300 border-dashed rounded-lg p-4 relative">
              {/* Arrow from Service to Writes To */}
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-16 z-10">
                <div className="w-full h-[3px] bg-purple-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
                <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-purple-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
              </div>
              <div className="mb-6">
                <h2 className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}>
                  <CircleStackIcon className="h-5 w-5 text-purple-500" />
                  Writes to ({writesTo.length})
                </h2>
              </div>
              <div className="space-y-3">
                {writesTo.map((container: any) => (
                  <a
                    key={container.data.id}
                    href={buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`)}
                    className="group bg-white border border-purple-200 hover:bg-purple-100 rounded-lg p-3 block transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <CircleStackIcon className="h-4 w-4 text-purple-500" />
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-purple-700">{container.data.name}</h3>
                    </div>
                    {container.data.summary && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{container.data.summary}</p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
