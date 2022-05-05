import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import type { Domain, Event, Service } from '@eventcatalog/types';

import { SearchIcon } from '@heroicons/react/outline';

import { getAllEvents } from '@/lib/events';
import { getAllServices } from '@/lib/services';
import { getAllDomains } from '@/lib/domains';
import { useConfig } from '@/hooks/EventCatalog';
import NodeGraph from '@/components/Mdx/NodeGraph/NodeGraph';
import getBackgroundColor from '@/utils/random-bg';

const filterByString = (filter, data) => data.filter((item) => item.name.indexOf(filter) > -1);

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export interface PageProps {
  events: Event[];
  services: Service[];
  domains: Domain[];
}

function Graph({ events, services, domains }: PageProps) {
  const { title } = useConfig();
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRootNode, setSelectedRootNode] = useState<any>();
  const [listItemsToRender, setListItemsToRender] = useState({ events, services, domains });

  const router = useRouter();
  const { query, isReady: isRouterReady } = router;
  const { name, type } = query;

  const dropdownValues = [
    ...events.map((event) => ({ ...event, type: 'event', label: `Event: ${event.name}` })),
    ...services.map((event) => ({ ...event, type: 'service', label: `Service: ${event.name}` })),
    ...domains.map((event) => ({ ...event, type: 'domain', label: `Domain: ${event.name}` })),
  ];

  const navItems = [
    { title: 'Domains', type: 'domain', data: listItemsToRender.domains },
    { title: 'Events', type: 'event', data: listItemsToRender.events },
    { title: 'Services', type: 'service', data: listItemsToRender.services },
  ];

  const handleListItemSelection = (data: Event | Service, dataType: 'event' | 'service' | 'domain') => {
    router.push({ query: `type=${dataType}&name=${data.name}` });
    setSelectedRootNode({ label: data.name, data, type: dataType });
  };

  const handleAllEventsAndServicesSelection = () => {
    router.push({ query: `type=all&name=AllEventsAndServices` });
    setSelectedRootNode({
      label: 'All Events and Services',
      data: { name: 'All Events and Services', events, services },
      type: 'all',
    });
  };

  const searchOnChange = useCallback(
    debounce((e) => {
      setSearchFilter(e.target.value);
    }, 500),
    [listItemsToRender]
  );

  const handleDropdownSelect = (e) => {
    const { value } = e.target;
    const selectedItem = JSON.parse(value);
    setSelectedRootNode(selectedItem);
  };

  const getListItemsToRender = useCallback(() => {
    if (!searchFilter) return { events, services, domains };
    return {
      events: filterByString(searchFilter, events),
      services: filterByString(searchFilter, services),
      domains: filterByString(searchFilter, domains),
    };
  }, [events, services, domains, searchFilter]);

  useEffect(() => {
    const filteredListItems = getListItemsToRender();
    setListItemsToRender(filteredListItems);
  }, [searchFilter, getListItemsToRender]);

  useEffect(() => {
    if (!isRouterReady) return;

    const initialDataToLoad = events[0];
    const initialSelectedRootNode = { label: initialDataToLoad.name, type: 'event', data: initialDataToLoad };

    if (!name || !type) {
      setSelectedRootNode(initialSelectedRootNode);
      return;
    }

    if (type === 'all') {
      setSelectedRootNode({
        label: 'All Events and Services',
        data: { name: 'All Events and Services', events, services },
        type: 'all',
      });
      return;
    }

    const dataByType = { event: events, service: services, domain: domains };
    const match = dataByType[type.toString()].find((item) => item.name === name);
    const newSelectedItem = match ? { label: match.name, type, data: match } : initialSelectedRootNode;
    setSelectedRootNode(newSelectedItem);
  }, [name, type, events, domains, services, isRouterReady]);

  return (
    <div className="h-screen overflow-hidden">
      <Head>
        <title>{title} - Visualiser</title>
      </Head>
      <div className="sm:hidden px-4 py-2 bg-gray-200 border-b border-gray-300">
        <div className="relative rounded-md shadow-sm">
          <select
            className=" block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            onChange={handleDropdownSelect}
          >
            <option>Please select your event or service</option>
            {dropdownValues.map((item) => (
              <option key={item.name} value={JSON.stringify({ label: item.name, data: item, type: item.type })}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-8 xl:grid-cols-6">
        <div className="hidden sm:block col-span-2 xl:col-span-1 bg-white px-4  h-screen overflow-auto border-r-2 shadow-md border-gray-200 py-3">
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
                placeholder="Find Event, Service or Domain"
                className="focus:ring-gray-500 focus:border-gray-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex">
              <button
                type="button"
                className="flex shadow-sm rounded-md w-full text-left border"
                onClick={() => handleAllEventsAndServicesSelection()}
              >
                <div
                  className={classNames(
                    'bg-blue-500',
                    'flex-shrink-0 flex h-full items-center justify-center w-4 text-white text-sm font-medium rounded-l-md'
                  )}
                />
                <div
                  className={`w-full rounded-r-md border-t border-r border-b ${
                    selectedRootNode?.type === 'all' ? 'bg-green-50' : 'bg-white'
                  }`}
                >
                  <div className="p-4 text-sm space-y-2 flex flex-col justify-between h-full">
                    <div className="text-gray-900 font-bold hover:text-gray-600 break-all text-xs xl:text-md">
                      All Events and Services
                    </div>
                    <div className="hidden xl:block text-gray-500 text-xs font-normal mt-2 ">
                      Diagram that shows all your events and services in one place
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {navItems.map((navItem: any) => (
              <SelectionGroup
                key={navItem.title}
                title={navItem.title}
                filterBy={searchFilter}
                data={navItem.data}
                currentSelectedItem={selectedRootNode}
                type={navItem.type}
                onClick={handleListItemSelection}
              />
            ))}
          </div>
        </div>
        <div className="bg-gray-200 h-screen col-span-12 sm:col-span-6  xl:col-span-5">
          {selectedRootNode && (
            <NodeGraph
              source={selectedRootNode.type}
              data={selectedRootNode.data}
              title="Visualiser"
              subtitle={`${selectedRootNode.data.name} (${selectedRootNode.type})`}
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

interface SelectionGroupProps {
  title: string;
  data: Service[] | Event[] | Domain[];
  type: 'event' | 'service' | 'domain';
  // eslint-disable-next-line no-unused-vars
  onClick(data: Event | Service | Domain, type: string): void;
  currentSelectedItem?: any;
  filterBy?: string;
}

function SelectionGroup({ title, data, currentSelectedItem, onClick, filterBy, type }: SelectionGroupProps) {
  const [dataWithoutFilter] = useState(data);

  return (
    <div>
      <span className="font-bold block py-2">
        {title} {` `}
        {filterBy && (
          <>
            ({data.length}/{dataWithoutFilter.length})
          </>
        )}
        {!filterBy && <>({dataWithoutFilter.length})</>}
      </span>
      {data.length === 0 && <span className="text-sm text-gray-300">No {type}s found</span>}
      <ul className="space-y-4 overflow-auto">
        {data.map((item) => {
          const isSelected = currentSelectedItem ? currentSelectedItem.label === item.name : false;
          const itemKey = hasDomain(item) ? `${item.domain}-${item.name}}` : item.name;

          return (
            <ListItem
              type={type}
              key={itemKey}
              data={item}
              onClick={(selectedItem) => onClick(selectedItem, type)}
              isSelected={isSelected}
            />
          );
        })}
      </ul>
    </div>
  );
}

function hasDomain(item: Service | Event | Domain): item is Service | Event {
  return (item as Service | Event).domain != null;
}

interface ListItemProps {
  data: Service | Event;
  // eslint-disable-next-line no-unused-vars
  onClick(data: Event | Service | Domain, type: string): void;
  type: 'event' | 'service' | 'domain';
  isSelected: boolean;
}

function ListItem({ data, onClick, type, isSelected }: ListItemProps) {
  const border = isSelected ? 'border-green-500 bg-green-50 shadow-md ' : '';
  return (
    <li className="flex">
      <button
        type="button"
        onClick={() => onClick(data, type)}
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
            <div className="text-gray-900 font-bold hover:text-gray-600 break-all text-xs xl:text-md">{data.name}</div>
            <div className="hidden xl:block text-gray-500 text-xs font-normal mt-2 ">{data.summary}</div>
          </div>
        </div>
      </button>
    </li>
  );
}

export default Graph;

export const getStaticProps = async () => {
  const events = getAllEvents({ hydrateEvents: true });
  const services = getAllServices();
  const domains = await getAllDomains();

  return {
    props: {
      events,
      services,
      domains: domains.map((data) => data.domain),
    },
  };
};
