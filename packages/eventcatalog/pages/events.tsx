import { Fragment, useState } from 'react'
import { Event, Domain, Service } from '@/types/index'
import Link from 'next/link'

import Mermaid from '@/components/Mermaid'

import { getAllEvents, getAllDomainsFromEvents, getAllServicesFromEvents } from '@/lib/eventcatalog'

import { getBackgroundColor } from '@/utils/random-bg'

import { Disclosure, Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'

import { useFeatures } from '@/hooks/EventCatalog'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const sortOptions = [
  { name: 'Name', href: '#', current: true },
  { name: 'Version', href: '#', current: false },
  { name: 'Domains', href: '#', current: false },
]

export interface PageProps {
  events: [Event]
  domains: [Domain]
  services: [Service]
}

export default function Page({ events, domains, services }: PageProps) {
  const filters = [
    {
      id: 'domains',
      name: 'Domains',
      options: domains.map(domain => ({
        value: domain,
        label: domain,
        checked: false,
      })),
    },
    {
      id: 'services',
      name: 'Services',
      options: services.map((service) => ({
        value: service,
        label: service,
        checked: false,
      })),
    },
  ]

  const [selectedFilters, setSelectedFilters] = useState({domains: [], services: []})

  const handleFilterSelection = (option, type, event) => {
    if(event.target.checked){
      const newFilters = selectedFilters[type].concat([option.value]);
      setSelectedFilters({...selectedFilters, [type]: newFilters});
    } else {
      const newFilters = selectedFilters[type].filter(value => value !== option.value);
      setSelectedFilters({...selectedFilters, [type]: newFilters});
    }
  }

  const { getFeature } = useFeatures()
  const isMermaidOnEventsEnabled = getFeature('showMermaidOnEvents')

  let eventsToRender = events;

  if(selectedFilters.domains.length > 0 || selectedFilters.services.length > 0){

    console.log('FILTER')

    eventsToRender = eventsToRender.filter(event => {

      const { domains: domainFilters, services: serviceFilters } = selectedFilters;

      const hasDomainsFromFilters = event.domains.some(domain => domainFilters.indexOf(domain.id) > -1);
      const hasConsumersFromFilters = event.consumers.some(consumer => serviceFilters.indexOf(consumer.id) > -1);
      const hasProducersFromFilters = event.producers.some(producer => serviceFilters.indexOf(producer.id) > -1);

      return hasDomainsFromFilters || hasConsumersFromFilters || hasProducersFromFilters;

    });
  }


  return (
    <div className="bg-white">
      <div>
        <main className="max-w-7xl mx-auto h-screen">
          <div className="relative z-10 flex items-baseline justify-between pt-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900"></h1>

            <div className="flex items-center">
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                    Sort
                    <ChevronDownIcon
                      className="flex-shrink-0 -mr-1 ml-1 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                  </Menu.Button>
                </div>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      {sortOptions.map((option) => (
                        <Menu.Item key={option.name}>
                          {({ active }) => (
                            <a
                              href={option.href}
                              className={classNames(
                                option.current ? 'font-medium text-gray-900' : 'text-gray-500',
                                active ? 'bg-gray-100' : '',
                                'block px-4 py-2 text-sm'
                              )}
                            >
                              {option.name}
                            </a>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
              {/* <button type="button" className="p-2 -m-2 ml-5 sm:ml-7 text-gray-400 hover:text-gray-500">
                <ViewGridIcon className="w-5 h-5" aria-hidden="true" />
              </button> */}
            </div>
          </div>

          <section aria-labelledby="products-heading" className="pt-6 pb-24">
            <h2 id="products-heading" className="sr-only">
              Products
            </h2>

            <div className="grid grid-cols-4 gap-x-8 gap-y-10">
              {/* Filters */}
              <form className="hidden lg:block">
                <span className="text-sm font-bold text-gray-900 mb-4 block">Events</span>
                <ul
                  role="list"
                  className=" text-sm font-medium text-gray-900 space-y-4 pb-6 border-b border-gray-200 items-stretch"
                >
                  {events.map((event) => (
                    <li key={event.name}>
                      <Link href={`/events/${event.name}`}>
                        <a>{event.name}</a>
                      </Link>
                    </li>
                  ))}
                </ul>

                {filters.map((section: any) => (
                  <Disclosure as="div" key={section.id} className="border-b border-gray-200 py-6">
                    {() => (
                      <>
                        <h3 className="-my-3 flow-root">
                          <Disclosure.Button className="py-3 bg-white w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500">
                            <span className="font-medium text-gray-900">{section.name}</span>
                          </Disclosure.Button>
                        </h3>
                        <Disclosure.Panel static className="pt-6">
                          <div className="space-y-4">
                            {section.options.map((option, optionIdx) => (
                              <div key={option.value} className="flex items-center">
                                <input
                                  id={`filter-${section.id}-${optionIdx}`}
                                  name={`${section.id}[]`}
                                  defaultValue={option.value}
                                  type="checkbox"
                                  onChange={(event) => handleFilterSelection(option, section.id, event)}
                                  defaultChecked={option.checked}
                                  className="h-4 w-4 border-gray-300 rounded text-gray-600 focus:ring-gray-500"
                                />
                                <label
                                  htmlFor={`filter-${section.id}-${optionIdx}`}
                                  className="ml-3 text-sm text-gray-600"
                                >
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                ))}
              </form>

              <div className="lg:col-span-3">
                <div>
                  <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                    Events / Messages
                  </h2>
                  <ul
                    role="list"
                    className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 "
                  >
                    {eventsToRender.map((event) => {
                      const { draft: isDraft } = event

                      return (
                        <li key={event.name} className={`h-full items-stretch ${isMermaidOnEventsEnabled ? 'flex': ''}`}>
                          <Link href={`/events/${event.slug}`}>
                            <a className="flex shadow-sm rounded-md">
                              <div
                                style={{
                                  background: getBackgroundColor(event.domains[0]),
                                }}
                                className={classNames(
                                  'bg-red-500',
                                  'flex-shrink-0 flex items-center justify-center w-4 text-white text-sm font-medium rounded-l-md'
                                )}
                              ></div>
                              <div className="w-full items-center justify-between border-t border-r border-b border-gray-200 bg-white rounded-r-md relative">
                                <div className="px-4 text-sm space-y-2 flex flex-col h-full py-4">
                                  <div className="text-gray-900 font-bold hover:text-gray-600">
                                    {event.name}
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      v{event.version}
                                    </span>
                                    {isDraft && (
                                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-gray-100">
                                        Draft
                                      </span>
                                    )}
                                    <div className="text-gray-500 text-xs font-normal mt-2 ">
                                      {event.summary}
                                    </div>
                                  </div>
                                  {!isMermaidOnEventsEnabled && (
                                    <div className="h-full items-center flex">
                                      <Mermaid data={event}  />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </a>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export const getServerSideProps = () => {
  const events = getAllEvents()
  const domains = getAllDomainsFromEvents(events)
  const services = getAllServicesFromEvents(events)

  return {
    props: {
      events,
      domains: [...new Set(domains)],
      services: [...new Set(services)],
    },
  }
}
