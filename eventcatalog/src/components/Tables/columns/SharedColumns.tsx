import { createColumnHelper } from '@tanstack/react-table';
import { Tag } from 'lucide-react';
import { filterByBadge } from '../filters/custom-filters';
import type { TCollectionTypes, TData } from '../Table';
import { getIcon } from '@utils/badges';
import type { TableConfiguration } from '@types';

export const createBadgesColumn = <T extends { data: Pick<TData<U>['data'], 'badges'> }, U extends TCollectionTypes>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  tableConfiguration: TableConfiguration
) => {
  return columnHelper.accessor((row) => row.data.badges, {
    id: 'badges',
    header: () => <span>{tableConfiguration.columns?.badges?.label || 'Badges'}</span>,
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
                        {(() => {
                          if (badge.icon) {
                            const IconComponent = getIcon(badge.icon);
                            return IconComponent ? (
                              <IconComponent className="h-4 w-4 text-white" />
                            ) : (
                              <Tag className="h-4 w-4 text-white" />
                            );
                          }
                          return <Tag className="h-4 w-4 text-white" />;
                        })()}
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
