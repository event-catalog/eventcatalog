import React from 'react';
import Link from 'next/link';
import { CubeIcon, DownloadIcon } from '@heroicons/react/outline';
import type { Event } from '@eventcatalog/types';
import fileDownload from 'js-file-download';
import { useUser } from '@/hooks/EventCatalog';

interface EventSideBarProps {
  event: Event;
  loadedVersion?: string;
}

function EventSideBar({ event, loadedVersion }: EventSideBarProps) {
  const { getUserById } = useUser();

  const { name: eventName, owners, producers, consumers, historicVersions } = event;

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/event/${event.name}/download`);
      if (res.status === 404) throw new Error('Failed to find file');
      const { schema, fileName } = await res.json();
      fileDownload(schema, fileName);
    } catch (error) {
      // TODO: Maybe better error experince
      console.error(error);
    }
  };

  return (
    <aside className="hidden xl:block xl:pl-8">
      <h2 className="sr-only">Details</h2>

      <div className="pt-6 py-6 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500">
            <CubeIcon className="h-5 w-5 text-green-400 inline-block mr-2" aria-hidden="true" />
            Producers
          </h2>
          <ul className="mt-2 leading-8">
            {producers.map((producer) => (
              <li className="inline mr-1" key={producer}>
                <Link href={`/services/${producer}`}>
                  <a className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                    <div className="absolute flex-shrink-0 flex items-center justify-center">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-green-500 animate animate-pulse"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-3.5 text-sm font-medium text-gray-900">{producer}</div>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 py-6 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500">
            <CubeIcon className="h-5 w-5 text-indigo-400 inline-block mr-2" aria-hidden="true" />
            Consumers
          </h2>
          <ul className="mt-2 leading-8">
            {consumers.map((consumer) => (
              <li className="inline" key={consumer}>
                <Link href={`/services/${consumer}`}>
                  <a
                    href="#"
                    className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5"
                  >
                    <div className="absolute flex-shrink-0 flex items-center justify-center">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate animate-pulse"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-3.5 text-sm font-medium text-gray-900">{consumer}</div>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {historicVersions.length > 0 && (
        <div className="border-t border-gray-200 py-6">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Event Versions</h2>
            <ul className="mt-2 leading-8 text-left text-blue-500">
              <li className="text-sm inline ">
                <Link href={`/events/${eventName}`}>
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
                  <li className="text-sm inline ">
                    <Link href={`/events/${eventName}/v/${version}`}>
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
      {/* <div className="border-t border-gray-200 py-6 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500">
            <MapIcon className="h-5 w-5 text-red-400 inline-block mr-2" aria-hidden="true" />
            Domains
          </h2>
          <ul role="list" className="mt-2 leading-8">
            {domains.map((domain) => {
              return (
                <li className="inline" key={domain}>
                  <a
                    href="#"
                    className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5"
                  >
                    <div className="absolute flex-shrink-0 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3.5 text-sm font-medium text-gray-900">{domain}</div>
                  </a>{' '}
                </li>
              )
            })}
          </ul>
        </div>
      </div> */}
      <div className="border-t border-gray-200 py-6 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500">Event Owners</h2>
          <ul className="mt-4 leading-8 space-y-2">
            {owners.map((id) => {
              const user = getUserById(id);

              if (!user) return null;

              return (
                <li className="flex justify-start" key={id}>
                  <Link href={`/users/${id}`}>
                    <a className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <img className="h-5 w-5 rounded-full" src={user.avatarUrl} alt="" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 py-6 space-y-1">
        <button
          type="button"
          className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          onClick={() => handleDownload()}
        >
          <DownloadIcon className="-ml-1 mr-2 h-5 w-5 text-gray-200" aria-hidden="true" />
          <span>Download Schema</span>
        </button>
        {historicVersions.length > 0 && (
          <Link href={`/events/${eventName}/logs`}>
            <a className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
              <span>View Changes</span>
            </a>
          </Link>
        )}
      </div>
    </aside>
  );
}

export default EventSideBar;
