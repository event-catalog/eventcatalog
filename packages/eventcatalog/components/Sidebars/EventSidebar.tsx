import React from 'react';
import Link from 'next/link';
import getConfig from 'next/config';
import { CubeIcon, DownloadIcon, CollectionIcon } from '@heroicons/react/outline';
import type { Event } from '@eventcatalog/types';

import ExternalLinks from './components/ExternalLinks';
import Tags from './components/Tags';
import Owners from './components/Owners';
import ItemList from './components/ItemList';

interface EventSideBarProps {
  event: Event;
  urlPath: string;
  loadedVersion?: string;
  isOldVersion?: boolean;
}

const getServiceLink = (serviceName: string, event: Event) => {
  const allEventServices = [...event.consumers, ...event.producers];
  const matchedService = allEventServices.find((service) => service.name === serviceName);
  if (matchedService && matchedService.domain) return `/domains/${matchedService.domain}/services/${serviceName}`;
  return `/services/${serviceName}`;
};

const getEventLogsURL = (event: Event) =>
  event.domain ? `/domains/${event.domain}/events/${event.name}/logs` : `/events/${event.name}/logs`;

function EventSideBar({ event, loadedVersion, isOldVersion, urlPath }: EventSideBarProps) {
  const {
    name: eventName,
    owners,
    producerNames: producers,
    consumerNames: consumers,
    tags,
    historicVersions,
    externalLinks,
    schema,
    domain,
  } = event;
  const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

  const getSchemaDownloadURL = () => {
    if (!schema) return null;
    return isOldVersion
      ? `${basePath}/schemas/${eventName}/${loadedVersion}/schema.${schema.extension}`
      : `${basePath}/schemas/${eventName}/schema.${schema.extension}`;
  };

  return (
    <aside className="hidden xl:block xl:pl-8 divide-y divide-gray-200">
      <h2 className="sr-only">Details</h2>

      {producers.length > 0 && (
        <ItemList
          title={`Producers (${producers.length})`}
          titleIcon={{ icon: CubeIcon, className: 'text-green-400' }}
          items={producers.map((producer) => ({ label: producer, href: getServiceLink(producer, event), bgColor: 'green' }))}
        />
      )}

      {consumers.length > 0 && (
        <ItemList
          title={`Consumers (${consumers.length})`}
          titleIcon={{ icon: CubeIcon, className: 'text-indigo-400' }}
          items={consumers.map((consumer) => ({ label: consumer, href: getServiceLink(consumer, event), bgColor: 'indigo' }))}
        />
      )}

      {domain && (
        <div className="py-6 space-y-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500">
              <CollectionIcon className="h-5 w-5 text-yellow-400 inline-block mr-2" aria-hidden="true" />
              Domain
            </h2>
            <ul className="mt-2 leading-8">
              <li className="inline">
                <Link href={`/domains/${domain}`}>
                  <a href="#" className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                    <div className="absolute flex-shrink-0 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate animate-pulse" aria-hidden="true" />
                    </div>
                    <div className="ml-3.5 text-sm font-medium text-gray-900">{domain}</div>
                  </a>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
      {historicVersions.length > 0 && (
        <div className=" py-6">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Event Versions</h2>
            <ul className="mt-2 leading-8 text-left text-blue-500">
              <li className="text-sm inline ">
                <Link href={urlPath}>
                  <a>
                    <span
                      className={`inline-flex mr-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative ${
                        loadedVersion === 'latest'
                          ? 'bg-blue-400 text-white shadow-md font-bold underline'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      Latest
                    </span>
                  </a>
                </Link>
              </li>

              {historicVersions.map((version) => {
                const isLoadedVersion = loadedVersion === version;
                const styles = isLoadedVersion
                  ? 'bg-blue-400 text-white shadow-md font-bold underline'
                  : 'bg-blue-100 text-blue-800';
                return (
                  <li className="text-sm inline" key={version}>
                    <Link href={`${urlPath}/v/${version}`}>
                      <a>
                        <span
                          className={`inline-flex mr-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative  ${styles}`}
                        >
                          v{version}
                        </span>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {owners.length > 0 && <Owners owners={owners} />}

      <div className=" py-6 space-y-1">
        {schema && (
          <a
            href={getSchemaDownloadURL()}
            download={`${eventName}(${event.version}).${schema.extension}`}
            className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            <DownloadIcon className="-ml-1 mr-2 h-5 w-5 text-gray-200" aria-hidden="true" />
            <span>Download Schema</span>
          </a>
        )}

        {historicVersions.length > 0 && (
          <Link href={getEventLogsURL(event)}>
            <a className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
              <span>View Changes</span>
            </a>
          </Link>
        )}

        <Link href={`/visualiser?type=event&name=${eventName}`}>
          <a className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
            <span>View in Visualiser</span>
          </a>
        </Link>

        {externalLinks.length > 0 && <ExternalLinks externalLinks={externalLinks} />}
        {tags.length > 0 && <Tags tags={tags} />}
      </div>
    </aside>
  );
}

export default EventSideBar;
