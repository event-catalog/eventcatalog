import { Fragment, useState } from 'react';
import Head from 'next/head';
import { Service } from '@eventcatalog/types';

import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/solid';
import ServiceGrid from '@/components/Grids/ServiceGrid';
import { getAllServices } from '@/lib/services';
import { useConfig } from '@/hooks/EventCatalog';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const sortOptions = [
  { name: 'Name', href: '#', current: true },
  { name: 'Version', href: '#', current: false },
  { name: 'Domains', href: '#', current: false },
];

export interface PageProps {
  services: [Service];
}

export default function Page({ services }: PageProps) {
  const [showMermaidDiagrams, setShowMermaidDiagrams] = useState(false);
  const { title } = useConfig();

  return (
    <>
      <Head>
        <title>{title} - All Services</title>
      </Head>
      <main className="max-w-7xl mx-auto md:min-h-screen px-4 xl:px-0">
        <div className="relative z-10 flex items-baseline justify-between pt-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Services ({services.length})</h1>

          <div className="flex items-center">
            <Menu as="div" className="relative hidden text-left">
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
              <div className="border-b border-gray-200 pb-6">
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
              </div>
            </form>

            <div className="col-span-4 lg:col-span-3">
              <div>
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">Services</h2>
                <ServiceGrid services={services} showMermaidDiagrams={showMermaidDiagrams} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const services = getAllServices();

  return {
    props: {
      services,
    },
  };
}
