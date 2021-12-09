import { PencilIcon } from '@heroicons/react/solid'
import Admonition from '@/components/Mdx/Admonition'

export default function ContentView({
  title,
  subtitle,
  tags = [],
  lastModifiedDate,
  children,
  sidebar: SideBar,
  breadCrumbs: BreadCrumbs,
  editUrl,
  draft: isDraft = false,
}) {
  return (
    <>
      <div className="flex relative">
        <div className=" flex flex-col w-0 flex-1 ">
          <main className="flex-1 ">
            <div className="py-8 xl:py-10">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:max-w-7xl xl:grid xl:grid-cols-4">
                <div className="xl:col-span-3 xl:pr-8 xl:border-r xl:border-gray-200 flex-col justify-between flex">
                  <div>
                    {BreadCrumbs && (
                      <div className="mb-5 border-b border-gray-100 pb-4">
                        <BreadCrumbs />
                      </div>
                    )}
                    <div>
                      <div>
                        <div className="xl:border-b pb-4 flex justify-between ">
                          <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-gray-900 relative">
                              {title}
                              <div className="-top-1 relative inline-block ml-2">
                                {tags.map((tag, index) => {
                                  return (
                                    <span
                                      key={`${tag}-${index}`}
                                      className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-yellow-100 text-yellow-800"
                                    >
                                      {tag.label}
                                    </span>
                                  )
                                })}
                                {isDraft && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-gray-500 text-gray-100">
                                    Draft
                                  </span>
                                )}
                              </div>
                            </h1>
                            <div className="text-gray-600 mb-10 text py-2">{subtitle}</div>
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
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-10">
                    <a href={editUrl} target="_blank" className="flex text-gray-400">
                      <PencilIcon
                        className="top-1 mr-2 relative h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                      <span>Edit this page</span>
                    </a>
                    <span className="italic text-xs mt-2">Last updated on {lastModifiedDate}</span>
                  </div>
                </div>
                <div className="min-h-screen">
                  <SideBar />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
