/* This example requires Tailwind CSS v2.0+ */

import Link from 'next/link';
import getConfig from 'next/config';
import { useConfig } from '@/hooks/EventCatalog';

export default function Example() {
  const { title, tagline, logo, primaryCTA = { label: 'Explore Events', href: '/events' }, secondaryCTA } = useConfig();

  const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();
  const logoToLoad = logo || { alt: 'EventCatalog Logo', src: `logo.svg` };

  return (
    <main className="sm:bg-top md:min-h-screen bg-gradient-to-t from-blue-700  to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-48">
        <img src={`${basePath}/${logoToLoad.src}`} alt={logoToLoad.alt} style={{ height: '85px' }} className="mx-auto" />
        <h1 className="mt-2 text-4xl font-extrabold text-white tracking-tight sm:text-5xl">{title}</h1>
        {tagline && <p className="mt-2 text-lg font-medium text-white">{tagline}</p>}
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <Link href={primaryCTA.href}>
              <a className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
                {primaryCTA.label}
              </a>
            </Link>
          </div>
          {secondaryCTA && (
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              {secondaryCTA.href.includes('http') && (
                <a
                  href={secondaryCTA.href}
                  target="_blank"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                  rel="noreferrer"
                >
                  {secondaryCTA.label}
                </a>
              )}
              {!secondaryCTA.href.includes('http') && (
                <Link href={secondaryCTA.href}>
                  <a
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                    rel="noreferrer"
                  >
                    {secondaryCTA.label}
                  </a>
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 space-x-5" />
      </div>
    </main>
  );
}
