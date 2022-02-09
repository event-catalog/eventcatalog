import React from 'react';
import { useConfig } from '@/hooks/EventCatalog';

export default function Footer() {
  const { organizationName, footerLinks: navigation = [] } = useConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        {navigation && (
          <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
            {navigation.map((item) => (
              <div key={item.label} className="px-5 py-2">
                <a href={item.href} className="text-base text-gray-500 hover:text-gray-400">
                  {item.label}
                </a>
              </div>
            ))}
          </nav>
        )}
        <p className="mt-8 text-center text-base text-gray-400">
          Copyright © {year} {organizationName}. Built with{' '}
          <a className="underline" href="https://eventcatalog.dev" target="_blank" rel="noreferrer">
            EventCatalog.
          </a>
        </p>
      </div>
    </footer>
  );
}
