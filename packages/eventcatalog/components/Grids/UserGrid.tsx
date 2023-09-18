import React from 'react';
import Link from 'next/link';

import { User } from '@eventcatalog/types';

import getBackgroundColor from '@/utils/random-bg';

interface UserGridProps {
  users: User[];
}

function UserGrid({ users = [] }: UserGridProps) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
      {users.map((user, index) => {
        const UserUrl = `/users/${user.id}`;
        return (
          <li key={`${user.name}-${index}`} className="flex">
            <Link href={UserUrl}>
              <a className="flex shadow-sm w-full">
                <div
                  style={{
                    background: getBackgroundColor(user.name),
                  }}
                  className="w-4 rounded-l-md"
                />

                <div className="w-full border-t border-r border-b border-gray-200 bg-white rounded-r-md ">
                  <div className="p-4 text-sm space-y-2 space-x-4 flex flex-col justify-between h-full">
                    <div className="flex space-x-4 text-xs pt-2 relative bottom-0 left-0">
                      <div className="font-medium text-gray-500">
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <img className="h-16 w-16 rounded-full max-w-none" src={user.avatarUrl} alt="" />
                            <span className="absolute inset-0 shadow-inner rounded-full" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div className="font-medium text-gray-500">
                        <span className="text-gray-900 font-bold">{user.name}</span>
                        <div className="text-gray-500 text-xs font-normal mt-2 line-clamp-3">{user.summary}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default UserGrid;
