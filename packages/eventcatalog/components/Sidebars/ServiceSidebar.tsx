import React from 'react';
import Link from 'next/link';
import type { Service } from '@eventcatalog/types';

import { CubeIcon, TagIcon, ExternalLinkIcon, CollectionIcon } from '@heroicons/react/outline';
import { useUser } from '@/hooks/EventCatalog';
import getBackgroundColor from '@/utils/random-bg';

const tailwindBgs = ['purple', 'pink', 'green', 'yellow', 'blue', 'indigo'];

interface ServiceSideBarProps {
  service: Service;
}

function ServiceSidebar({ service }: ServiceSideBarProps) {
  const { getUserById } = useUser();

  const { owners, subscribes, publishes, repository, tags = [], externalLinks, domains = [] } = service;
  const { language, url: repositoryUrl } = repository;

  let languages = [];

  if (language) {
    languages = Array.isArray(language) ? language : [language];
  }

  let trimmedUrl = '';

  if (repositoryUrl) {
    trimmedUrl = repositoryUrl.replace(/(^\w+:|^)\/\//, '');
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
              <li className="inline " key={event.name}>
                <Link href={`/events/${event.name}`}>
                  <a href="#" className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                    <div className="absolute flex-shrink-0 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate animate-pulse" aria-hidden="true" />
                    </div>
                    <div className="ml-3.5 text-sm font-medium text-gray-900 truncate max-w-xs">{event.name}</div>
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
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500  animate animate-pulse" aria-hidden="true" />
                    </div>
                    <div className="ml-3.5 text-sm font-medium text-gray-900 truncate max-w-xs">{event.name}</div>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {domains.length > 0 && (
        <div className="border-t border-gray-200 py-6 space-y-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500">
              <CollectionIcon className="h-5 w-5 text-yellow-400 inline-block mr-2" aria-hidden="true" />
              Domains
            </h2>
            <ul className="mt-2 leading-8">
              {domains.map((domain) => (
                <li className="inline" key={domain}>
                  <Link href={`/domain/${domain}`}>
                    <a href="#" className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                      <div className="absolute flex-shrink-0 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate animate-pulse" aria-hidden="true" />
                      </div>
                      <div className="ml-3.5 text-sm font-medium text-gray-900">{domain}</div>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

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
                  {trimmedUrl}
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
              <div className="relative flex items-center mt-2" key={value}>
                <div className="absolute flex-shrink-0 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full" aria-hidden="true" style={{ background: getBackgroundColor(value) }} />
                </div>
                <div className="ml-3.5 text-sm font-medium text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href={`/visualiser?type=service&name=${service.name}`}>
        <a className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
          <span>View in Visualiser</span>
        </a>
      </Link>

      {externalLinks.length > 0 && (
        <div className="border-t border-gray-200 py-2 space-y-8">
          <div className="space-y-3">
            {externalLinks.map((tag) => (
              <a
                href={tag.url}
                target="_blank"
                type="button"
                className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-teal-300 shadow-sm text-sm font-medium rounded-md text-teal-800 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-200"
                rel="noreferrer"
                key={tag.url}
              >
                <ExternalLinkIcon className="-ml-1 mr-2 h-5 w-5 text-teal-200" aria-hidden="true" />
                <span>{`${tag.label}`}</span>
              </a>
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
                    <a href={url} className="inline-block underline" target="_blank" rel="noreferrer">
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
