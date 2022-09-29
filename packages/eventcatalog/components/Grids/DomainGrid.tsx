import React from 'react';
import Link from 'next/link';

import { CubeIcon } from '@heroicons/react/outline';

import { Domain } from '@eventcatalog/types';

import getBackgroundColor from '@/utils/random-bg';

interface DomainGridProps {
  domains: Domain[];
}

function DomainGrid({ domains = [] }: DomainGridProps) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
      {domains.map((domain) => (
        <li key={domain.name} className="flex">
          <Link href={`/domains/${domain.name}`}>
            <a className="flex shadow-sm w-full">
              <div
                style={{
                  background: getBackgroundColor(domain.name),
                }}
                className="w-4 rounded-l-md"
              />
              <div className="w-full border-t border-r border-b border-gray-200 bg-white rounded-r-md ">
                <div className="p-4 text-sm space-y-2 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-gray-900 font-bold">{domain.name}</span>
                    {domain.badges?.map((badge) => (
                      <span
                        key={`${domain.name}-${badge.content}`}
                        className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badge.backgroundColor}-100 text-${badge.textColor}-800`}
                      >
                        {badge.content}
                      </span>
                    ))}
                    <div className="text-gray-500 text-xs font-normal mt-2 line-clamp-3">{domain.summary}</div>
                  </div>
                  <div className="flex space-x-4 text-xs pt-2 relative bottom-0 left-0">
                    <div className=" font-medium text-gray-500">
                      <CubeIcon className="h-4 w-4 text-green-400 inline-block mr-2" aria-hidden="true" />
                      Services ({domain.services.length})
                    </div>
                    <div className=" font-medium text-gray-500">
                      <CubeIcon className="h-4 w-4 text-indigo-400 inline-block mr-2" aria-hidden="true" />
                      Events ({domain.events.length})
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default DomainGrid;
