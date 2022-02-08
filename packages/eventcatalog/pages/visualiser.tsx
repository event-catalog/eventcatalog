import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import type { Event, Service } from '@eventcatalog/types';

import { SearchIcon } from '@heroicons/react/outline';

import { getAllEvents } from '@/lib/events';
import { getAllServices } from '@/lib/services';
import { useConfig } from '@/hooks/EventCatalog';
import NodeGraph from '@/components/Mdx/NodeGraph/NodeGraph';
import getBackgroundColor from '@/utils/random-bg';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export interface PageProps {
  events: Event[];
  services: Service[];
}

function Graph({ events, services }: PageProps) {
  const { title } = useConfig();
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRootNode, setSelectedRootNode] = useState<any>();
  const [listItemsToRender, setListItemsToRender] = useState({ events, services });

  const { query, isReady: isRouterReady } = useRouter();
  const { name, type } = query;

  const handleListItemSelection = (data: Event | Service, dataType: 'event' | 'service') => {
    setSelectedRootNode({ label: data.name, data, type: dataType });
  };

  const searchOnChange = useCallback(
    debounce((e) => {
      setSearchFilter(e.target.value);
    }, 500),
    [listItemsToRender]
  );

  const getListItemsToRender = useCallback(() => {
    if (!searchFilter) return { events, services };
    const filteredEvents = events.filter((event) => event.name.indexOf(searchFilter) > -1);
    const filteredServices = services.filter((service) => service.name.indexOf(searchFilter) > -1);
    return { events: filteredEvents, services: filteredServices };
  }, [events, services, searchFilter]);

  useEffect(() => {
    const filteredListItems = getListItemsToRender();
    setListItemsToRender(filteredListItems);
  }, [searchFilter, getListItemsToRender]);

  useEffect(() => {
    if (!isRouterReady) return;

    const initialDataToLoad = events[0];
    const initialSelectedRootNode = { label: initialDataToLoad.name, type: 'event', data: initialDataToLoad };

    if (name && type) {
      const dataToSearch = type === 'service' ? services : (events as []);
      const match = dataToSearch.find((item) => item.name === name);
      if (match) {
        setSelectedRootNode({ label: match.name, type, data: match });
      } else {
        setSelectedRootNode(initialSelectedRootNode);
      }
    } else {
      setSelectedRootNode(initialSelectedRootNode);
    }
  }, [name, type, events, services, isRouterReady]);

  return (
    <div className="h-screen overflow-hidden">
      <Head>
        <title>
          {title} - Visualiser
        </title>
      </Head>
      <div className="grid grid-cols-6">
        <div className="col-span-1 bg-white px-4  h-screen overflow-auto border-r-2 shadow-md border-gray-200 py-3">
          <div className="border-b border-gray-200 pb-6">
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="event"
                id="event"
                onChange={searchOnChange}
                placeholder="Find Event or Service"
                className="focus:ring-gray-500 focus:border-gray-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <span className="font-bold block py-2">
                Events {` `}
                {searchFilter && (
                  <>
                    ({listItemsToRender.events.length}/{events.length})
                  </>
                )}
                {!searchFilter && <>({events.length})</>}
              </span>
              {listItemsToRender.events.length === 0 && <span className="text-sm text-gray-300">No Events Found</span>}
              <ul className="space-y-4 overflow-auto">
                {listItemsToRender.events.map((event) => {
                  const isSelected = selectedRootNode ? selectedRootNode.label === event.name : false;
                  return (
                    <ListItem
                      type="event"
                      key={event.name}
                      data={event}
                      onClick={(e) => handleListItemSelection(e.data, 'event')}
                      isSelected={isSelected}
                    />
                  );
                })}
              </ul>
            </div>
            <div>
              <span className="font-bold block py-2">
                Services {` `}
                {searchFilter && (
                  <>
                    ({listItemsToRender.services.length}/{services.length})
                  </>
                )}
                {!searchFilter && <>({services.length})</>}
              </span>
              {listItemsToRender.services.length === 0 && <span className="text-sm text-gray-300">No Services Found</span>}
              <ul className="space-y-4 overflow-auto">
                {listItemsToRender.services.map((service) => {
                  const isSelected = selectedRootNode ? selectedRootNode.label === service.name : false;
                  return (
                    <ListItem
                      type="event"
                      key={service.name}
                      data={service}
                      onClick={(e) => handleListItemSelection(e.data, 'service')}
                      isSelected={isSelected}
                    />
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-gray-200 h-screen col-span-5">
          {selectedRootNode && (
            <NodeGraph
              source={selectedRootNode.type}
              data={selectedRootNode.data}
              title="Visualiser"
              subtitle={selectedRootNode.data.name}
              rootNodeColor={getBackgroundColor(selectedRootNode.label)}
              fitView
              isAnimated
              isDraggable
              includeBackground
              renderWithBorder={false}
              maxHeight="100%"
              includeEdgeLabels
              includeNodeIcons
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ListItemProps {
  data: Service | Event;
  // eslint-disable-next-line no-unused-vars
  onClick(data: { data: Event | Service; type: string }): void;
  type: 'event' | 'service';
  isSelected: boolean;
}

function ListItem({ data, onClick, type, isSelected }: ListItemProps) {
  const border = isSelected ? 'border-green-500 bg-green-50 shadow-md ' : '';
  return (
    <li className="flex">
      <button
        type="button"
        onClick={() => onClick({ data, type })}
        className={`flex shadow-sm rounded-md w-full text-left border ${border}`}
      >
        <div
          style={{
            background: getBackgroundColor(data.name),
          }}
          className={classNames(
            'bg-red-500',
            'flex-shrink-0 flex h-full items-center justify-center w-4 text-white text-sm font-medium rounded-l-md'
          )}
        />
        <div className={`w-full rounded-r-md border-t border-r border-b ${isSelected ? 'bg-green-50' : 'bg-white'}`}>
          <div className="p-4 text-sm space-y-2 flex flex-col justify-between h-full">
            <div className="text-gray-900 font-bold hover:text-gray-600 break-all">{data.name}</div>
            <div className="text-gray-500 text-xs font-normal mt-2 ">{data.summary}</div>
          </div>
        </div>
      </button>
    </li>
  );
}

export default Graph;

export const getStaticProps = () => {
  const events = getAllEvents();
  const services = getAllServices();

  return {
    props: {
      events,
      services,
    },
  };
};
