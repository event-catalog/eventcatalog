import React from 'react';
import Link from 'next/link';
import type { Event, Service } from '@eventcatalog/types';

import { CubeIcon, CollectionIcon } from '@heroicons/react/outline';
import getBackgroundColor from '@/utils/random-bg';

import ExternalLinks from './components/ExternalLinks';
import Tags from './components/Tags';
import Owners from './components/Owners';
import ItemList from './components/ItemList';

const getURLForEvent = (event: Event): string =>
  event.domain ? `/domains/${event.domain}/events/${event.name}` : `/events/${event.name}`;

interface ServiceSideBarProps {
  service: Service;
}

function ServiceSidebar({ service }: ServiceSideBarProps) {
  const { owners, subscribes, publishes, repository, tags = [], externalLinks, domain } = service;
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
    <aside className="hidden xl:block xl:pl-8 ">
      <h2 className="sr-only">Details</h2>

      {publishes.length > 0 && (
        <ItemList
          title={`Publishes Events (${publishes.length})`}
          titleIcon={{ icon: CubeIcon, className: 'text-indigo-400' }}
          items={publishes.map((event) => ({ label: event.name, href: getURLForEvent(event), bgColor: 'indigo' }))}
        />
      )}

      {subscribes.length > 0 && (
        <ItemList
          title={`Subscribes to Events (${subscribes.length})`}
          titleIcon={{ icon: CubeIcon, className: 'text-green-400' }}
          items={subscribes.map((event) => ({ label: event.name, href: getURLForEvent(event), bgColor: 'green' }))}
        />
      )}

      {domain && (
        <div className="border-t border-gray-200 py-6 space-y-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500">
              <CollectionIcon className="h-5 w-5 text-yellow-400 inline-block mr-2" aria-hidden="true" />
              Domain
            </h2>
            <ul className="mt-2 leading-8">
              <li className="inline" key={domain}>
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

      {owners.length > 0 && <Owners owners={owners} />}

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

      {externalLinks.length > 0 && <ExternalLinks externalLinks={externalLinks} />}
      {tags.length > 0 && <Tags tags={tags} />}
    </aside>
  );
}

export default ServiceSidebar;
