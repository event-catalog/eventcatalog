import React from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/EventCatalog'
import type { Service } from '@eventcatalogtest/types'

import { CubeIcon } from '@heroicons/react/outline'

interface ServiceSideBarProps {
  service: Service
}

const ServiceSidebar = ({ service }: ServiceSideBarProps) => {
  const { getUserById } = useUser()

  const { owners, subscribes, publishes, repository } = service

  return (
    <aside className="hidden xl:block xl:pl-8">
      <h2 className="sr-only">Details</h2>

      <div className="pt-6 py-6 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500">
            <CubeIcon className="h-5 w-5 text-indigo-400 inline-block mr-2" aria-hidden="true" />
            Publishes Events
          </h2>
          <ul role="list" className="mt-2 leading-8">
            {publishes.map((event) => {
              return (
                <li className="inline" key={event.name}>
                  <Link href={`/events/${event.name}`}>
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
                      <div className="ml-3.5 text-sm font-medium text-gray-900">{event.name}</div>
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
            <CubeIcon className="h-5 w-5 text-green-400 inline-block mr-2" aria-hidden="true" />
            Subscribes to Events
          </h2>
          <ul role="list" className="mt-2 leading-8">
            {subscribes.map((event) => {
              return (
                <li className="inline" key={event.name}>
                  <Link href={`/events/${event.name}`}>
                    <a className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                      <div className="absolute flex-shrink-0 flex items-center justify-center">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-green-500  animate animate-pulse"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="ml-3.5 text-sm font-medium text-gray-900">{event.name}</div>
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
          <h2 className="text-sm font-medium text-gray-500">Service Owners</h2>
          <ul role="list" className="mt-4 leading-8 space-y-2">
            {owners.map((owner) => {
              const user = getUserById(owner)

              if (!user) return null

              return (
                <li className="flex justify-start" key={user.id}>
                  <Link href={`/users/${user.id}`}>
                    <a className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <img className="h-5 w-5 rounded-full" src={user.avatarUrl} alt="" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </a>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {repository && (
        <div className="border-t border-gray-200 py-6 space-y-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Repository</h2>
            <ul role="list" className="mt-4 leading-8 space-y-2">
              <li className="flex justify-start">
                <a
                  href={repository?.url}
                  target="_blank"
                  className="flex items-center space-x-3 text-blue-500 underline text-sm"
                >
                  {repository.url}
                </a>
              </li>
            </ul>
          </div>
        </div>
      )}
    </aside>
  )
}

export default ServiceSidebar
