import { createColumnHelper } from '@tanstack/react-table';
import { Tag } from 'lucide-react';
import { filterByBadge } from '../filters/custom-filters';
import type { TCollectionTypes, TData } from '../Table';

export const createBadgesColumn = <T extends { data: Pick<TData<U>['data'], 'badges'> }, U extends TCollectionTypes>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>
) => {
  return columnHelper.accessor((row) => row.data.badges, {
    id: 'badges',
    header: () => <span>Badges</span>,
    cell: (info) => {
      const item = info.row.original;
      const badges = item.data.badges || [];

      if (badges?.length === 0 || !badges)
        return <div className="font-light text-sm text-gray-400/60 text-left italic">No badges documented</div>;

      return (
        <ul>
          {badges.map((badge, index) => {
            return (
              <li key={`${badge.id}-${index}`} className="py-1 group font-light ">
                <div className="group-hover:text-primary flex space-x-1 items-center ">
                  <div className="flex items-center border border-gray-300 shadow-sm rounded-md">
                    <span className="flex items-center">
                      <span className={`bg-${badge.backgroundColor}-500 h-full rounded-tl rounded-bl p-1`}>
                        {badge.icon && <badge.icon className="h-4 w-4 text-white" />}
                        {!badge.icon && <Tag className="h-4 w-4 text-white" />}
                      </span>
                      <span className="leading-none px-2 group-hover:underline ">{badge.content}</span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      );
    },
    meta: {
      filterVariant: 'badges',
    },
    filterFn: filterByBadge,
  });
};
