import React from 'react';
import Link from 'next/link';
import { CubeIcon } from '@heroicons/react/outline';

function ItemList({ title, titleIcon: { icon: Icon = CubeIcon, className: iconClassName }, items }: any) {
  return (
    <div className="pt-6 py-6 space-y-8">
      <div>
        <h2 className="text-sm font-medium text-gray-500">
          <Icon className={`h-5 w-5  inline-block mr-2 ${iconClassName}`} aria-hidden="true" />
          {title}
        </h2>
        <ul className="mt-2 leading-8">
          {items.map((item) => (
            <li className="inline mr-2" key={item.label}>
              <Link href={item.href}>
                <a className="relative inline-flex items-center rounded-full border border-gray-300 px-3 py-0.5">
                  <div className="absolute flex-shrink-0 flex items-center justify-center">
                    <span className={`h-1.5 w-1.5 rounded-full bg-${item.bgColor}-500`} aria-hidden="true" />
                  </div>
                  <div className="ml-3.5 text-sm font-medium text-gray-900 truncate max-w-xs">{item.label}</div>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ItemList;
