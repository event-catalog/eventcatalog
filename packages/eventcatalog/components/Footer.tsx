import React from 'react';
import { useConfig } from '@/hooks/EventCatalog';

// function Footer() {
//   const { organizationName } = useConfig();
//   const year = new Date().getFullYear();

//   return (
//     <footer className="bg-gray-800 py-10">
//       <div className="mt-8 md:mt-0 md:order-1">
//         <p className="text-center text-base text-gray-400">
//           Copyright © {year} {organizationName}. Built with EventCatalog.
//         </p>
//       </div>
//     </footer>
//   );
// }

// export default Footer;

/* This example requires Tailwind CSS v2.0+ */

export default function Example() {
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
