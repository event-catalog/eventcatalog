import React from 'react';
import Link from 'next/link';
import type { Domain } from '@eventcatalog/types';
import { CubeIcon } from '@heroicons/react/outline';
import ExternalLinks from './components/ExternalLinks';
import Tags from './components/Tags';
import Owners from './components/Owners';
import ItemList from './components/ItemList';

interface DomainSideBarProps {
  domain: Domain;
}

function ServiceSidebar({ domain }: DomainSideBarProps) {
  const { name, owners, services, events, tags = [], externalLinks } = domain;

  return (
    <aside className="hidden xl:block xl:pl-8 divide-y divide-gray-200">
      <h2 className="sr-only">Details</h2>

      {events.length > 0 && (
        <ItemList
          title={`Events (${events.length})`}
          titleIcon={{ icon: CubeIcon, className: 'text-indigo-400' }}
          items={events.map((event) => ({ label: event.name, href: `/domains/${name}/events/${event.name}`, bgColor: 'indigo' }))}
        />
      )}

      {services.length > 0 && (
        <ItemList
          title={`Services (${services.length})`}
          titleIcon={{ icon: CubeIcon, className: 'text-green-400' }}
          items={services.map((service) => ({
            label: service.name,
            href: `/domains/${name}/services/${service.name}`,
            bgColor: 'green',
          }))}
        />
      )}

      {owners.length > 0 && <Owners owners={owners} />}

      <Link href={`/visualiser?type=domain&name=${domain.name}`}>
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
