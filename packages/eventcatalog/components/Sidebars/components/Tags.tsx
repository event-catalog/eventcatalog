import React from 'react';
import type { Tag } from '@eventcatalog/types';
import { TagIcon } from '@heroicons/react/outline';

const tailwindBgs = ['purple', 'pink', 'green', 'yellow', 'blue', 'indigo'];

function Tags({ tags }: { tags: Tag[] }) {
  return (
    <div className=" py-6 space-y-8">
      <div>
        <h2 className="text-sm font-medium text-gray-500">
          <TagIcon className="h-5 w-5 text-gray-400 inline-block mr-2" aria-hidden="true" />
          Tags
        </h2>
        <div className="mt-3 space-y-2">
          {tags.map(({ label, url }, index) => {
            const color = tailwindBgs[index % tailwindBgs.length];

            if (url) {
              return (
                <a href={url} className="inline-block underline" target="_blank" rel="noreferrer">
                  <span
                    className={`underline inline-block mr-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-${color}-100 text-${color}-800`}
                  >
                    {label}
                  </span>
                </a>
              );
            }

            return (
              <span
                className={`inline-block mr-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium -top-0.5 relative bg-${color}-100 text-${color}-800`}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Tags;
