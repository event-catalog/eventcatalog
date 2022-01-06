import Link from 'next/link';
import { useRouter } from 'next/router';
import { useConfig } from '@/hooks/EventCatalog';

const navigation = [
  { name: 'Events', href: '/events' },
  { name: 'Services', href: '/services' },
  { name: '3D Node Graph', href: '/overview' },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Example() {
  const { title } = useConfig();
  const router = useRouter();

  return (
    <div className="bg-gray-800">
      <div className="max-w-7xl mx-auto  ">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex-shrink-0 flex items-center text-white font-bold">
              <Link href="/events">
                <a className="flex items-center">
                  <img alt="logo" className="text-white w-8 inline-block mr-3" src="/logo.svg" />
                  <span className="text-xl">{title}</span>
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
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
