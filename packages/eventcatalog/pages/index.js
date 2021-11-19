import { Fragment, useState } from 'react'
import matter from 'gray-matter'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import {
  ChevronDownIcon,
  FilterIcon,
  MinusSmIcon,
  PlusSmIcon,
  ViewGridIcon,
  ThumbUpIcon,
  EyeIcon,
  ChatAltIcon,
  ShareIcon,
} from '@heroicons/react/solid'
import Link from 'next/link'

import { getBackgroundColor } from '@/utils/random-bg'

import fs from 'fs'
import path from 'path'

const sortOptions = [
  { name: 'Most Popular', href: '#', current: true },
  { name: 'Best Rating', href: '#', current: false },
  { name: 'Newest', href: '#', current: false },
  { name: 'Price: Low to High', href: '#', current: false },
  { name: 'Price: High to Low', href: '#', current: false },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Example({ events = [], domains = [], services = [] }) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const filters = [
    {
      id: 'domains',
      name: 'Domains',
      options: domains.map((domain) => ({
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

              <button
                type="button"
                className="p-2 -m-2 ml-5 sm:ml-7 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">View grid</span>
                <ViewGridIcon className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="p-2 -m-2 ml-4 sm:ml-6 text-gray-400 hover:text-gray-500 lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <span className="sr-only">Filters</span>
                <FilterIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <section aria-labelledby="products-heading" className="pt-6 pb-24">
            <h2 id="products-heading" className="sr-only">
              Products
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-8 gap-y-10">
              {/* Filters */}
              <form className="hidden lg:block">
                <span className="text-sm font-bold text-gray-900 mb-4 block">Events</span>
                <ul
                  role="list"
                  className=" text-sm font-medium text-gray-900 space-y-4 pb-6 border-b border-gray-200"
                >
                  {events.map((event) => (
                    <li key={event.name}>
                      <Link href={`/event/${event.name}`}>
                        <a>{event.name}</a>
                      </Link>
                    </li>
                  ))}
                </ul>

                {filters.map((section) => (
                  <Disclosure as="div" key={section.id} className="border-b border-gray-200 py-6">
                    {({ open }) => (
                      <>
                        <h3 className="-my-3 flow-root">
                          <Disclosure.Button className="py-3 bg-white w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500">
                            <span className="font-medium text-gray-900">{section.name}</span>
                            <span className="ml-6 flex items-center">
                              {open ? (
                                <MinusSmIcon className="h-5 w-5" aria-hidden="true" />
                              ) : (
                                <PlusSmIcon className="h-5 w-5" aria-hidden="true" />
                              )}
                            </span>
                          </Disclosure.Button>
                        </h3>
                        <Disclosure.Panel className="pt-6">
                          <div className="space-y-4">
                            {section.options.map((option, optionIdx) => (
                              <div key={option.value} className="flex items-center">
                                <input
                                  id={`filter-${section.id}-${optionIdx}`}
                                  name={`${section.id}[]`}
                                  defaultValue={option.value}
                                  type="checkbox"
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

              {/* Product grid */}
              <div className="lg:col-span-3">
                {/* Replace with your content */}
                <div>
                  <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                    Events / Messages
                  </h2>
                  <ul
                    role="list"
                    className="mt-3 grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-2 "
                  >
                    {events.map((event) => (
                      <li key={event.name}>
                        <Link href={`/events/${event.name}`}>
                          <a className="col-span-1 flex shadow-sm rounded-md">
                            <div
                              style={{
                                background: getBackgroundColor(event.domains[0]),
                              }}
                              className={classNames(
                                'bg-red-500',
                                'flex-shrink-0 flex items-center justify-center w-4 text-white text-sm font-medium rounded-l-md'
                              )}
                            >
                              {/* <span className="tblock -rotate-90 transform">Ordering</span> */}
                            </div>
                            <div className="w-full items-center justify-between border-t border-r border-b border-gray-200 bg-white rounded-r-md relative">
                              <div className="px-4 py-2 text-sm space-y-2">
                                <a
                                  href={event.href}
                                  className="text-gray-900 font-bold hover:text-gray-600"
                                >
                                  {event.name}
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    v{event.version}
                                  </span>
                                </a>
                                <div className="text-gray-500 text-xs block">
                                  Event is created when the user logs into the account.
                                </div>
                                <hr className="opacity-50" />
                                <div className="text-xs text-gray-500">
                                  <ul className="flex space-x-3">
                                    <li>Domains: {event.domains.length}</li>
                                    <li>•</li>
                                    <li>Producers: {event.producers.length}</li>
                                    <li>•</li>
                                    <li>Consumers: {event.consumers.length}</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </a>
                        </Link>
                      </li>
                    ))}
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
  const projectDir = process.env.PROJECT_DIR || process.cwd()

  const folders = fs.readdirSync(path.join(projectDir, 'events'))
  const files = folders.map((folder) =>
    fs.readFileSync(path.join(projectDir, 'events', folder, 'index.md'), {
      encoding: 'utf-8',
    })
  )

  const events = files.map((file) => matter(file).data)

  const domains = events.reduce((domains, event) => {
    return domains.concat(event.domains)
  }, [])

  const allConsumersAndProducers = events.reduce((domains, event) => {
    return domains.concat(event.consumers).concat(event.producers)
  }, [])

  const services = allConsumersAndProducers.map((service) => service.id)

  return {
    props: {
      events,
      domains: [...new Set(domains)],
      services: [...new Set(services)],
    },
  }
}
