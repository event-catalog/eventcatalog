import { useUser } from '@/hooks/EventCatalog'
import { CubeIcon, MapIcon, PencilIcon } from '@heroicons/react/solid'
import Admonition from '@/components/Mdx/Admonition'
import Link from 'next/link'

import { HomeIcon } from '@heroicons/react/solid'

const pages = [
  { name: 'Services', href: '#', current: false },
  { name: 'Email Platform', href: '#', current: true },
]

const BreadCrumbs = () => {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              <HomeIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>
        {pages.map((page) => (
          <li key={page.name}>
            <div className="flex items-center">
              <svg
                className="flex-shrink-0 h-5 w-5 text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
              </svg>
              <a
                href={page.href}
                className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                aria-current={page.current ? 'page' : undefined}
              >
                {page.name}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default function EventView({
  name,
  version,
  lastModifiedDate,
  children,
  domains = [],
  owners = [],
  summary,
  draft: isDraft = false,
  producers = [],
  consumers = [],
  events: { listOfEventsServicePublishes = [], listOfEventsServiceSubscribesTo = [] },
}) {
  const { getUserById } = useUser()

  return (
    <>
      <div className="min-h-full flex relative">
        <div className=" flex flex-col w-0 flex-1 ">
          <main className="flex-1">
            <div className="py-8 xl:py-10">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:max-w-7xl xl:grid xl:grid-cols-4">
                <div className="xl:col-span-3 xl:pr-8 xl:border-r xl:border-gray-200">
                  <div className="mb-5 ">
                    <BreadCrumbs />
                  </div>
                  <div>
                    <div>
                      <div className="xl:border-b pb-4 flex justify-between">
                        <div className="space-y-2">
                          <h1 className="text-3xl font-bold text-gray-900 relative">
                            {name}
                            {version && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-yellow-100 text-yellow-800">
                                v{version}
                              </span>
                            )}
                            {isDraft && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-gray-500 text-gray-100">
                                Draft
                              </span>
                            )}
                          </h1>
                          <div className="text-gray-500 mb-10 text">{summary}</div>
                        </div>
                        <div className="mt-4 flex space-x-3 md:mt-0">
                          <button
                            type="button"
                            className="hidden md:inline-flex h-10 justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                          >
                            <PencilIcon
                              className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                      <div className="py-3 xl:pt-6 xl:pb-0">
                        {isDraft && (
                          <Admonition className="mt-0 pt-0" type="warning">
                            This event is currently in <span className="underline">draft</span>{' '}
                            mode.
                          </Admonition>
                        )}
                        <div className="prose max-w-none">{children}</div>

                        {/* <DomainEventList limit=4 /> */}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-10">
                    <a href="url" className="flex text-gray-400">
                      <PencilIcon
                        className="top-1 mr-2 relative h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                      <span>Edit this page</span>
                    </a>
                    <span className="italic text-xs mt-2">Last updated on {lastModifiedDate}</span>
                  </div>
                  <div className="mt-10">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-md py-6 px-4 text-left">
                        <span className="block text-sm">Previous</span>
                        <span className="text-pink-600 font-bold">« PaymentComplete</span>
                      </div>
                      <div className="border border-gray-200 rounded-md py-6 px-4 text-right">
                        <span className="block text-sm">Next</span>
                        <span className="text-pink-600 font-bold">UserCreatedEvent »</span>
                      </div>
                    </div>
                  </div>
                </div>
                <aside className="hidden xl:block xl:pl-8">
                  <h2 className="sr-only">Details</h2>

                  <div className="pt-6 py-6 space-y-8">
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">
                        <CubeIcon
                          className="h-5 w-5 text-indigo-400 inline-block mr-2"
                          aria-hidden="true"
                        />
                        Publish Events
                      </h2>
                      <ul role="list" className="mt-2 leading-8">
                        {listOfEventsServicePublishes.map((event) => {
                          return (
                            <li className="inline">
                              <Link href={`/event/${event}`}>
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
                                  <div className="ml-3.5 text-sm font-medium text-gray-900">
                                    {event}
                                  </div>
                                </a>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 py-6 space-y-8">
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">
                        <CubeIcon
                          className="h-5 w-5 text-green-400 inline-block mr-2"
                          aria-hidden="true"
                        />
                        Subscribe Events
                      </h2>
                      <ul role="list" className="mt-2 leading-8">
                        {listOfEventsServiceSubscribesTo.map((event) => {
                          return (
                            <li className="inline">
                              <Link href={`/event/${event}`}>
                                <a className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                                  <div className="absolute flex-shrink-0 flex items-center justify-center">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full bg-green-500  animate animate-pulse"
                                      aria-hidden="true"
                                    />
                                  </div>
                                  <div className="ml-3.5 text-sm font-medium text-gray-900">
                                    {event}
                                  </div>
                                </a>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                  {/* <div className="border-t border-gray-200 py-6 space-y-8">
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">
                        <MapIcon
                          className="h-5 w-5 text-red-400 inline-block mr-2"
                          aria-hidden="true"
                        />
                        Domains
                      </h2>
                      <ul role="list" className="mt-2 leading-8">
                        {domains.map((domain) => {
                          return (
                            <li className="inline">
                              <a
                                href="#"
                                className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5"
                              >
                                <div className="absolute flex-shrink-0 flex items-center justify-center">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full bg-red-500"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3.5 text-sm font-medium text-gray-900">
                                  {domain.id}
                                </div>
                              </a>{' '}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div> */}
                  <div className="border-t border-gray-200 py-6 space-y-8">
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Service Owners</h2>
                      <ul role="list" className="mt-4 leading-8 space-y-2">
                        {owners.map((owner) => {
                          const user = getUserById(owner)

                          if (!user) return null

                          return (
                            <li className="flex justify-start">
                              <a href="#" className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <img
                                    className="h-5 w-5 rounded-full"
                                    src={user.avatarUrl}
                                    alt=""
                                  />
                                </div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              </a>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
