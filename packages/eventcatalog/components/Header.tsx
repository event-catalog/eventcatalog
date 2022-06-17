import Link from 'next/link';
import getConfig from 'next/config';
import { useRouter } from 'next/router';
import { useConfig } from '@/hooks/EventCatalog';

const defaultNavigation = [
  { label: 'Events', href: '/events' },
  { label: 'Services', href: '/services' },
  { label: 'Domains', href: '/domains' },
  { label: 'Visualiser', href: '/visualiser' },
  { label: '3D Node Graph', href: '/overview' },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Example() {
  const { title, homepageLink, logo, headerLinks: configNavigation } = useConfig();
  const router = useRouter();

  const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();
  const logoToLoad = logo || { alt: 'EventCatalog Logo', src: `logo.svg` };

  const headerNavigation = configNavigation || defaultNavigation;

  return (
    <div className="bg-gray-800">
      <div className="max-w-7xl mx-auto  ">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex-shrink-0 flex items-center text-white font-bold">
              {!homepageLink && (
                <Link href="/">
                  <a className="flex items-center">
                    <img alt="logo" className="text-white w-8 inline-block mr-3" src={`${basePath}/${logoToLoad.src}`} />
                    <span className="text-xl">{title}</span>
                  </a>
                </Link>
              )}
              {homepageLink && (
                <a href={homepageLink} className="flex items-center">
                  <img alt="logo" className="text-white w-8 inline-block mr-3" src={`${basePath}/${logoToLoad.src}`} />
                  <span className="text-xl">{title}</span>
                </a>
              )}
            </div>
          </div>
          <div className="hidden sm:block sm:ml-6">
            <div className="flex space-x-4">
              {headerNavigation.map((item) => {
                const current = router.pathname === item.href;
                return (
                  <Link key={item.label} href={item.href}>
                    <a
                      className={classNames(
                        current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'px-3 py-2 rounded-md text-sm font-medium'
                      )}
                      aria-current={current ? 'page' : undefined}
                    >
                      {item.label}
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
