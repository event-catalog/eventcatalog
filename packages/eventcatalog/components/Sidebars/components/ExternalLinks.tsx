import React from 'react';

import { ExternalLinkIcon } from '@heroicons/react/outline';

function ExternalLinks({ externalLinks }: { externalLinks: any[] }) {
  if (externalLinks.length === 0) return null;
  return (
    <div className=" py-2 space-y-8">
      <div className="space-y-3">
        {externalLinks.map((tag) => (
          <a
            href={tag.url}
            target="_blank"
            type="button"
            className="hidden w-full md:inline-flex h-10 justify-center px-4 py-2 border border-teal-300 shadow-sm text-sm font-medium rounded-md text-teal-800 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-200"
            rel="noreferrer"
            key={tag.url}
          >
            <ExternalLinkIcon className="-ml-1 mr-2 h-5 w-5 text-teal-200" aria-hidden="true" />
            <span>{`${tag.label}`}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default ExternalLinks;
