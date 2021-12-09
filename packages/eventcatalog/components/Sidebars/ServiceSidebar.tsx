import React from 'react';
import Link from 'next/link';
import type { Service } from '@eventcatalogtest/types';

import { CubeIcon, TagIcon } from '@heroicons/react/outline';
import { useUser } from '@/hooks/EventCatalog';
import getBackgroundColor from '@/utils/random-bg';

const tailwindBgs = ['purple', 'pink', 'green', 'yellow', 'blue', 'indigo'];

interface ServiceSideBarProps {
  service: Service;
}

function ServiceSidebar({ service }: ServiceSideBarProps) {
  const { getUserById } = useUser();

  const { owners, subscribes, publishes, repository, tags = [] } = service;
  const { language } = repository;

  let languages = [];

  if (!language) {
    languages = Array.isArray(language) ? language : [language];
  }

  return (
    <aside className="hidden xl:block xl:pl-8">
      <h2 className="sr-only">Details</h2>

      <div className="pt-6 py-6 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500">
            <CubeIcon className="h-5 w-5 text-indigo-400 inline-block mr-2" aria-hidden="true" />
            Publishes Events ({publishes.length})
          </h2>
          <ul className="mt-2 leading-8">
            {publishes.map((event) => (
              <li className="inline" key={event.name}>
                <Link href={`/events/${event.name}`}>
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
                    <div className="ml-3.5 text-sm font-medium text-gray-900">{event.name}</div>
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
            <CubeIcon className="h-5 w-5 text-green-400 inline-block mr-2" aria-hidden="true" />
            Subscribes to Events ({subscribes.length})
          </h2>
          <ul className="mt-2 leading-8">
            {subscribes.map((event) => (
              <li className="inline" key={event.name}>
                <Link href={`/events/${event.name}`}>
                  <a className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                    <div className="absolute flex-shrink-0 flex items-center justify-center">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-green-500  animate animate-pulse"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-3.5 text-sm font-medium text-gray-900">{event.name}</div>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200 py-6 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500">Service Owners ({owners.length})</h2>
          <ul className="mt-4 leading-8 space-y-2">
            {owners.map((owner) => {
              const user = getUserById(owner);

              if (!user) return null;

              return (
                <li className="flex justify-start" key={user.id}>
                  <Link href={`/users/${user.id}`}>
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
      {repository?.url && (
        <div className="border-t border-gray-200 py-6 space-y-8">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500">Repository</h2>
            <ul className=" leading-8 space-y-2">
              <li className="flex justify-start">
                <a
                  href={repository?.url}
                  target="_blank"
                  className="flex items-center space-x-3 text-blue-600 underline text-sm"
                  rel="noreferrer"
                >
                  {/* {repository.url} */}
                  boyney123/EmailPlatform
                </a>
              </li>
            </ul>
          </div>
        </div>
      )}
      {languages.length > 0 && (
        <div className="border-t border-gray-200 py-6 space-y-8">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500">Language</h2>
            {languages.map((value) => (
              <div className="relative flex items-center mt-2">
                <div className="absolute flex-shrink-0 flex items-center justify-center">
                  <span
                    className="h-2 w-2 rounded-full"
                    aria-hidden="true"
                    style={{ background: getBackgroundColor(value) }}
                  />
                </div>
                <div className="ml-3.5 text-sm font-medium text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <div className="border-t border-gray-200 py-6 space-y-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500">
              <TagIcon className="h-5 w-5 text-gray-400 inline-block mr-2" aria-hidden="true" />
              Tags
            </h2>
            <div className="mt-3 space-y-2">
              {tags.map(({ label, url }, index) => {
                const color = tailwindBgs[index % tailwindBgs.length];

                if (url) {
                  return (
                    <a
                      href={url}
                      className="inline-block underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span
                        className={`underline inline-block mr-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-${color}-100 text-${color}-800`}
                      >
                        {label}
                      </span>
                    </a>
                  );
                }

                return (
                  <span
                    className={`inline-block mr-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-${color}-100 text-${color}-800`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default ServiceSidebar;
