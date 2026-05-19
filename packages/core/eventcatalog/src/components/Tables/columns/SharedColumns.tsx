import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid';
import { getBadgeHref, getBadgeReactStyle } from '@utils/badge-styles';
import { filterByBadge } from '../filters/custom-filters';
import type { TCollectionTypes, TData } from '../Table';
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

      if (badges?.length === 0 || !badges) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;

      const visibleItems = isExpanded ? badges : badges.slice(0, 3);
      const hiddenCount = badges.length - 3;

      return (
        <div className="flex flex-wrap gap-1 items-center">
          {visibleItems.map((badge, index) => {
            const href = getBadgeHref(badge);
            const className =
              'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border border-[rgb(var(--ec-accent)/0.5)] text-[rgb(var(--ec-page-text))] bg-transparent';

            return href ? (
              <a
                key={`${badge.id}-${index}`}
                href={href}
                className={className}
                style={getBadgeReactStyle(badge)}
                title={badge.content}
              >
                <span>{badge.content}</span>
                <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
              </a>
            ) : (
              <span key={`${badge.id}-${index}`} className={className} style={getBadgeReactStyle(badge)} title={badge.content}>
                {badge.content}
              </span>
            );
          })}
          {hiddenCount > 0 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-[rgb(var(--ec-accent))] hover:underline">
              {isExpanded ? 'less' : `+${hiddenCount}`}
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
