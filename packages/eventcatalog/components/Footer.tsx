import React from 'react';
import { useConfig } from '@/hooks/EventCatalog';

export default function Footer() {
  const { organizationName, editUrl } = useConfig();
  const year = new Date().getFullYear();

  const navigation = {
    main: [
      { name: 'Events', href: '/events' },
      { name: 'Services', href: '/services' },
      { name: '3D Node Graph', href: '/overview' },
      { name: 'GitHub', href: editUrl },
    ],
  };

  return (
    <footer className="bg-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
          {navigation.main.map((item) => (
            <div key={item.name} className="px-5 py-2">
              <a href={item.href} className="text-base text-gray-500 hover:text-gray-900">
                {item.name}
              </a>
            </div>
          ))}
        </nav>
        <p className="mt-8 text-center text-base text-gray-400">
          Copyright © {year} {organizationName}. Built with{' '}
          <a className="underline" href="https://eventcatalog.io" target="_blank" rel="noreferrer">
            EventCatalog.
          </a>
        </p>
      </div>
    </footer>
  );
}
