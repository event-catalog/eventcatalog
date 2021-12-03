import { Fragment, useState } from 'react'
import { Service } from '@eventcatalogtest/types'

import Link from 'next/link'

import ServiceGrid from '@/components/Grids/ServiceGrid'
import { getAllServices } from '@/lib/services'

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
  services: [Service]
}

export default function Page({ services }: PageProps) {

  return (
    <div className="bg-white">
      <div>
        <main className="max-w-7xl mx-auto h-screen">
          <div className="relative z-10 flex items-baseline justify-between pt-8 pb-6 border-b border-gray-200">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Services ({services.length})</h1>

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
                <span className="text-sm font-bold text-gray-900 mb-4 block">Services</span>
                <ul
                  role="list"
                  className=" text-sm font-medium text-gray-900 space-y-4 pb-6 border-b border-gray-200 items-stretch"
                >
                  {services.map((service) => (
                    <li key={service.name}>
                      <Link href={`/services/${service.name}`}>
                        <a>{service.name}</a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </form>

              <div className="lg:col-span-3">
                <div>
                  <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                    Services
                  </h2>
                  <ServiceGrid services={services} />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export async function getServerSideProps() {
  const services = getAllServices()

  return {
    props: {
      services,
    },
  }
}
