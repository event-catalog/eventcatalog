import { Fragment, useState } from 'react'
import type { Event, Service } from '@eventcatalogtest/types'

import Link from 'next/link'

import EventGrid from '@/components/Grids/EventGrid'
import { getAllEvents, getUniqueServicesNamesFromEvents } from '@/lib/events'

import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'

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
  services: [Service]
}

export default function Page({ events, services }: PageProps) {
  const filters = [
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

  const [selectedFilters, setSelectedFilters] = useState({ services: [] })
  const [showMermaidDiagrams, setShowMermaidDiagrams] = useState(false)

  const handleFilterSelection = (option, type, event) => {
    if (event.target.checked) {
      const newFilters = selectedFilters[type].concat([option.value])
      setSelectedFilters({ ...selectedFilters, [type]: newFilters })
    } else {
      const newFilters = selectedFilters[type].filter((value) => value !== option.value)
      setSelectedFilters({ ...selectedFilters, [type]: newFilters })
    }
  }

  let eventsToRender = events

  if (selectedFilters.services.length > 0) {
    //@ts-ignore
    eventsToRender = eventsToRender.filter((event) => {
      const { services: serviceFilters } = selectedFilters

      const hasConsumersFromFilters = event.consumers.some(
        (consumerId) => serviceFilters.indexOf(consumerId) > -1
      )
      const hasProducersFromFilters = event.producers.some(
        (producerId) => serviceFilters.indexOf(producerId) > -1
      )

      return hasConsumersFromFilters || hasProducersFromFilters
    })
  }

  return (
    <div>
      <main className="max-w-7xl mx-auto min-h-screen">
        <div className="relative z-10 flex items-baseline justify-between pt-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Events ({events.length})
          </h1>

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
          </div>
        </div>

        <section className="pt-6 pb-24">
          <div className="grid grid-cols-4 gap-x-8 gap-y-10">
            {/* Filters */}
            <form className="hidden lg:block">
              <span className="text-sm font-bold text-gray-900 mb-4 block">Events</span>
              <ul
                role="list"
                className=" text-sm text-gray-600 space-y-4 pb-6 border-b border-gray-200 items-stretch"
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
                <div key={section.id} className="border-b border-gray-200 py-6">
                  <>
                    <h3 className="-my-3 flow-root">
                      <div className="py-3 bg-white w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500">
                        <span className="font-medium text-gray-900">{section.name}</span>
                      </div>
                    </h3>
                    <div className="pt-6">
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
                    </div>
                  </>
                </div>
              ))}

              <div className="border-b border-gray-200 py-6">
                <>
                  <h3 className="-my-3 flow-root">
                    <div className="py-3 bg-white w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500">
                      <span className="font-medium text-gray-900">Features</span>
                    </div>
                  </h3>
                  <div className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          id="show-mermaid"
                          type="checkbox"
                          onChange={(e) => setShowMermaidDiagrams(e.target.checked)}
                          defaultChecked={showMermaidDiagrams}
                          className="h-4 w-4 border-gray-300 rounded text-gray-600 focus:ring-gray-500"
                        />
                        <label htmlFor="show-mermaid" className="ml-3 text-sm text-gray-600">
                          Show Mermaid Diagrams
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              </div>
            </form>

            <div className="lg:col-span-3">
              <div>
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                  Events ({eventsToRender.length})
                </h2>
                <EventGrid events={eventsToRender} showMermaidDiagrams={showMermaidDiagrams} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export const getServerSideProps = () => {
  const events = getAllEvents()
  const services = getUniqueServicesNamesFromEvents(events)

  return {
    props: {
      events,
      // @ts-ignore
      services: [...new Set(services)],
    },
  }
}
