import React from 'react';
import Link from 'next/link';

import { CubeIcon, CollectionIcon } from '@heroicons/react/outline';

import { Event } from '@eventcatalog/types';
import getBackgroundColor from '@/utils/random-bg';

import Mermaid from '@/components/Mermaid';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

interface EventGridProps {
  events: Event[];
  showMermaidDiagrams?: boolean;
}

function EventGrid({ events = [], showMermaidDiagrams = false }: EventGridProps) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
      {events.map((event) => {
        const { draft: isDraft, domain } = event;
        const eventURL = domain ? `/domains/${domain}/events/${event.name}` : `/events/${event.name}`;
        const eventKey = domain ? `${domain}-${event.name}` : event.name;

        return (
          <li key={eventKey} className="flex">
            <Link href={eventURL}>
              <a className="flex shadow-sm rounded-md w-full">
                <div
                  style={{
                    background: getBackgroundColor(event.name),
                  }}
                  className={classNames(
                    'bg-red-500',
                    'flex-shrink-0 flex items-center justify-center w-4 text-white text-sm font-medium rounded-l-md'
                  )}
                />
                <div className="w-full border-t border-r border-b border-gray-200 bg-white rounded-r-md ">
                  <div className="p-4 text-sm space-y-2 flex flex-col justify-between h-full">
                    <div className="text-gray-900 font-bold hover:text-gray-600 break-all">
                      {event.name}
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        v{event.version}
                      </span>
                      {event.badges?.map((badge) => (
                        <span
                          key={`${event.name}-${badge.content}`}
                          className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badge.backgroundColor}-100 text-${badge.textColor}-800`}
                        >
                          {badge.content}
                        </span>
                      ))}
                      {isDraft && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-gray-100">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs font-normal mt-2 ">{event.summary}</div>
                    {showMermaidDiagrams && (
                      <div className="h-full items-center flex">
                        <Mermaid source="event" data={event} rootNodeColor={getBackgroundColor(event.name)} />
                      </div>
                    )}
                    <div className="flex space-x-4 text-xs pt-2 relative bottom-0 left-0">
                      <div className=" font-medium text-gray-500">
                        <CubeIcon className="h-4 w-4 text-green-400 inline-block mr-2" aria-hidden="true" />
                        Producers ({event.producerNames.length})
                      </div>
                      <div className=" font-medium text-gray-500">
                        <CubeIcon className="h-4 w-4 text-indigo-400 inline-block mr-2" aria-hidden="true" />
                        Subscribers ({event.consumerNames.length})
                      </div>
                      {event.domain && (
                        <div className=" font-medium text-gray-500">
                          <CollectionIcon className="h-4 w-4 text-yellow-400 inline-block mr-2" aria-hidden="true" />
                          {event.domain}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default EventGrid;
