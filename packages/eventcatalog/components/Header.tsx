/* This example requires Tailwind CSS v2.0+ */
import { Disclosure } from '@headlessui/react'
import { MenuIcon, XIcon } from '@heroicons/react/outline'
import { useConfig } from '@/hooks/EventCatalog'
import Link from 'next/link'
import { useRouter } from 'next/router'

const navigation = [
  { name: 'Events', href: '/events' },
  { name: 'Services', href: '/services' },
  { name: 'Overview Graph', href: '/overview' }
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Example() {
  const { projectName } = useConfig()
  const router = useRouter()

  return (
    <Disclosure as="nav" className="bg-gray-800">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto ">
            <div className="relative flex items-center justify-between h-16">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                {/* Mobile menu button*/}
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
              <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
                <div className="flex-shrink-0 flex items-center text-white font-bold">
                  <Link href="/events">
                    <a className="flex items-center">
                      <img className="text-white w-8 inline-block mr-3" src="/logo-white.svg"/>
                      <span className="text-xl">{projectName}</span>
                    </a>
                  </Link>
                </div>
              </div>
              <div className="hidden sm:block sm:ml-6">
                <div className="flex space-x-4">
                  {navigation.map((item) => {
                    const current = router.pathname.includes(item.href);
                    return (
                      <Link key={item.name} href={item.href}>
                        <a
                          className={classNames(
                            current
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                            'px-3 py-2 rounded-md text-sm font-medium'
                          )}
                          aria-current={current ? 'page' : undefined}
                        >
                          {item.name}
                        </a>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Disclosure>
  )
}
