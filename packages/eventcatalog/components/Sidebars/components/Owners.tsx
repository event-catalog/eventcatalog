import React from 'react';
import Link from 'next/link';
import type { Owner } from '@eventcatalog/types';
import { useUser } from '@/hooks/EventCatalog';

function Owners({ owners }: { owners: Owner[] | string[] }) {
  const { getUserById } = useUser();

  return (
    <div className=" py-6 space-y-8">
      <div>
        <h2 className="text-sm font-medium text-gray-500">Domain Owners ({owners.length})</h2>
        <ul className="mt-4 leading-8 space-y-2">
          {owners.map((owner) => {
            const user = getUserById(owner);

            if (!user) return null;

            return (
              <li className="flex justify-start" key={user.id}>
                <Link href={`/users/${user.id}`}>
                  <a className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <img className="h-5 w-5 rounded-full" src={user.avatarUrl} alt="" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default Owners;
