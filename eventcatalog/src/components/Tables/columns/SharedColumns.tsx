import { createColumnHelper } from '@tanstack/react-table';
import { Tag } from 'lucide-react';
import { useState } from 'react';
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
      const [isExpanded, setIsExpanded] = useState(false);

      if (badges?.length === 0 || !badges)
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-[rgb(var(--ec-icon-color))] bg-[rgb(var(--ec-content-hover))] rounded-md border border-[rgb(var(--ec-page-border))]">
            No badges
          </span>
        );

      const visibleItems = isExpanded ? badges : badges.slice(0, 4);
      const hiddenCount = badges.length - 4;

      return (
        <div className="flex flex-wrap gap-1.5 items-center">
          {visibleItems.map((badge, index) => {
            const IconComponent = badge.icon ? getIcon(badge.icon) : null;
            return (
              <span
                key={`${badge.id}-${index}`}
                className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle))] transition-colors"
              >
                <span className={`flex items-center justify-center w-6 h-6 bg-${badge.backgroundColor}-500 rounded-l-md`}>
                  {IconComponent ? <IconComponent className="h-3 w-3 text-white" /> : <Tag className="h-3 w-3 text-white" />}
                </span>
                <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))]">{badge.content}</span>
              </span>
            );
          })}
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] px-2 py-1 rounded hover:bg-[rgb(var(--ec-content-hover))] transition-colors"
            >
              {isExpanded ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      );
    },
    meta: {
      filterVariant: 'badges',
    },
    filterFn: filterByBadge,
  });
};
