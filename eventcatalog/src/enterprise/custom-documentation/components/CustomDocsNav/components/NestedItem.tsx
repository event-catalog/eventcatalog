import React from 'react';
import { buildUrl } from '@utils/url-builder';
import type { SidebarItem } from '../types';

interface NestedItemProps {
  item: SidebarItem;
  currentPath: string;
  parentId: string;
  itemIndex: number;
  collapsedGroups: { [key: string]: boolean };
  toggleGroupCollapse: (group: string) => void;
}

const NestedItem: React.FC<NestedItemProps> = ({
  item,
  currentPath,
  parentId,
  itemIndex,
  collapsedGroups,
  toggleGroupCollapse,
}) => {
  const hasNestedItems = item.items && item.items.length > 0;
  const itemId = `${parentId}-${itemIndex}`;

  if (hasNestedItems && item.items) {
    return (
      <div className="py-1">
        <div className="flex items-center">
          <button
            className="p-1 hover:bg-gray-100 rounded-md flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleGroupCollapse(`nested-${itemId}`);
            }}
          >
            <div className={`transition-transform duration-150 ${collapsedGroups[`nested-${itemId}`] ? '' : 'rotate-180'}`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
                data-slot="icon"
                className="h-3 w-3 text-gray-500"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"></path>
              </svg>
            </div>
          </button>
          <button
            className="flex items-center px-2 py-1 text-xs font-medium text-gray-700 rounded-md hover:bg-purple-50 min-w-0 flex-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleGroupCollapse(`nested-${itemId}`);
            }}
          >
            <span className="truncate">{item.label}</span>
            {item.badge && item?.badge?.text && (
              <span
                className={`text-${item.badge.color || 'purple'}-600 ml-2 text-[10px] font-medium bg-${item.badge.color || 'purple'}-50 px-2 py-0.5 rounded uppercase`}
              >
                {item.badge.text}
              </span>
            )}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-[height] duration-150 ease-out ${
            collapsedGroups[`nested-${itemId}`] ? 'h-0' : 'h-auto'
          }`}
        >
          <div className="space-y-0.5 border-gray-200/80 border-l pl-4 ml-[9px] mt-1">
            {item.items.map((nestedItem: SidebarItem, nestedIndex: number) => (
              <NestedItem
                key={`nested-${itemId}-${nestedIndex}`}
                item={nestedItem}
                currentPath={currentPath}
                parentId={itemId}
                itemIndex={nestedIndex}
                collapsedGroups={collapsedGroups}
                toggleGroupCollapse={toggleGroupCollapse}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const itemPath = item.slug ? buildUrl(`/docs/custom/${item.slug}`) : '#';
  const isActive = currentPath === itemPath || currentPath.endsWith(`/${item.slug}`);

  return (
    <a
      href={itemPath}
      className={`flex items-center px-2 py-1.5 text-xs ${isActive ? 'bg-purple-100 text-purple-900 font-medium' : 'text-gray-600 hover:bg-purple-100'} rounded-md`}
      data-active={isActive}
    >
      <span className="truncate">{item.label}</span>
      {item.badge && item?.badge?.text && (
        <span
          className={`text-${item.badge.color || 'purple'}-600 ml-2 text-[10px] font-medium bg-${item.badge.color || 'purple'}-50 px-2 py-0.5 rounded uppercase`}
        >
          {item.badge.text}
        </span>
      )}
    </a>
  );
};

export default React.memo(NestedItem);
