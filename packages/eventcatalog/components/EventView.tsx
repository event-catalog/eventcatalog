import { useUser } from '@/hooks/EventCatalog'
import { CubeIcon, MapIcon, PencilIcon } from '@heroicons/react/solid'

export default function EventView({
  name,
  version,
  lastModifiedDate,
  children,
  domains = [],
  owners = [],
  summary,
  producers = [],
  consumers = [],
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
                  <div>
                    <div>
                      <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 relative">
                            {name}
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-yellow-100 text-yellow-800">
                              v{version}
                            </span>
                          </h1>
                        </div>
                        <div className="mt-4 flex space-x-3 md:mt-0">
                          <button
                            type="button"
                            className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
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
                        <div className="text-gray-500 mb-10 text">{summary}</div>
                        <div className="prose max-w-none">{children}</div>
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
                    <span className="italic">Last updated on {lastModifiedDate}</span>
                  </div>
                </div>
                <aside className="hidden xl:block xl:pl-8">
                  <h2 className="sr-only">Details</h2>

                  <div className="pt-6 py-6 space-y-8">
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">
                        <CubeIcon
                          className="h-5 w-5 text-green-400 inline-block mr-2"
                          aria-hidden="true"
                        />
                        Producers
                      </h2>
                      <ul role="list" className="mt-2 leading-8">
                        {producers.map((producer) => {
                          return (
                            <li className="inline">
                              <a
                                href="#"
                                className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5"
                              >
                                <div className="absolute flex-shrink-0 flex items-center justify-center">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full bg-green-500 animate animate-pulse"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3.5 text-sm font-medium text-gray-900">
                                  {producer.id}
                                </div>
                              </a>{' '}
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
                          className="h-5 w-5 text-indigo-400 inline-block mr-2"
                          aria-hidden="true"
                        />
                        Consumers
                      </h2>
                      <ul role="list" className="mt-2 leading-8">
                        {consumers.map((consumer) => {
                          return (
                            <li className="inline">
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
                                  {consumer.id}
                                </div>
                              </a>{' '}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 py-6 space-y-8">
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
                                  {domain}
                                </div>
                              </a>{' '}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 py-6 space-y-8">
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Event Owners</h2>
                      <ul role="list" className="mt-4 leading-8 space-y-2">
                        {owners.map((owner) => {
                          const user = getUserById(owner.id)

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
                  <div className="border-t border-gray-200 py-6 space-y-8">
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Versions</h2>
                      <ul role="list" className="mt-2 leading-8 text-xs underline">
                        <li>0.0.3</li>
                        <li>0.0.2</li>
                        <li>0.0.1</li>
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
