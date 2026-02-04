import React from 'react';
import { buildUrl } from '@utils/url-builder';
import type { SidebarItem } from '../types';
import { ExternalLinkIcon } from 'lucide-react';

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
    // Check if folder has an index file (slug) making it clickable
    const folderHasLink = !!item.slug;
    const folderPath = folderHasLink ? buildUrl(`/docs/custom/${item.slug}`) : undefined;
    const isFolderActive = folderPath && (currentPath === folderPath || currentPath.endsWith(`/${item.slug}`));

    return (
      <div className="py-1">
        <div className="flex items-center">
          <button
            className="p-1 hover:bg-[rgb(var(--ec-content-hover))] rounded-md flex-shrink-0"
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
                className="h-3 w-3 text-[rgb(var(--ec-icon-color))]"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"></path>
              </svg>
            </div>
          </button>
          {folderHasLink ? (
            // Folder has an index file - render as clickable link
            <a
              href={folderPath}
              className={`flex items-center px-2 py-1 text-xs font-medium rounded-md min-w-0 flex-1 ${
                isFolderActive
                  ? 'bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-page-text))] font-semibold'
                  : 'text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]'
              }`}
              data-active={isFolderActive}
            >
              <span className="truncate">{item.label}</span>
              {item.badge && item?.badge?.text && (
                <span
                  className={
                    item.badge.color
                      ? `text-${item.badge.color}-600 dark:text-${item.badge.color}-400 ml-2 text-[10px] font-medium bg-${item.badge.color}-50 dark:bg-${item.badge.color}-500/20 px-2 py-0.5 rounded uppercase`
                      : `text-[rgb(var(--ec-accent))] ml-2 text-[10px] font-medium bg-[rgb(var(--ec-accent-subtle))] px-2 py-0.5 rounded uppercase`
                  }
                >
                  {item.badge.text}
                </span>
              )}
            </a>
          ) : (
            // Folder without index file - render as toggle button
            <button
              className="flex items-center px-2 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] min-w-0 flex-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupCollapse(`nested-${itemId}`);
              }}
            >
              <span className="truncate">{item.label}</span>
              {item.badge && item?.badge?.text && (
                <span
                  className={
                    item.badge.color
                      ? `text-${item.badge.color}-600 dark:text-${item.badge.color}-400 ml-2 text-[10px] font-medium bg-${item.badge.color}-50 dark:bg-${item.badge.color}-500/20 px-2 py-0.5 rounded uppercase`
                      : `text-[rgb(var(--ec-accent))] ml-2 text-[10px] font-medium bg-[rgb(var(--ec-accent-subtle))] px-2 py-0.5 rounded uppercase`
                  }
                >
                  {item.badge.text}
                </span>
              )}
            </button>
          )}
        </div>

        <div
          className={`overflow-hidden transition-[height] duration-150 ease-out ${
            collapsedGroups[`nested-${itemId}`] ? 'h-0' : 'h-auto'
          }`}
        >
          <div className="space-y-0.5 border-[rgb(var(--ec-page-border))] border-l pl-4 ml-[9px] mt-1">
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

  let itemPath = item.slug ? buildUrl(`/docs/custom/${item.slug}`) : '#';
  const isActive = currentPath === itemPath || currentPath.endsWith(`/${item.slug}`);

  // Convert string style to React CSSProperties if needed
  const attrs = item.attrs
    ? {
        ...item.attrs,
        style:
          typeof item.attrs.style === 'string'
            ? item.attrs.style
                .split(';')
                .filter((style) => style.trim())
                .reduce((acc, style) => {
                  const [key, value] = style.split(':').map((s) => s.trim());
                  const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                  return { ...acc, [camelKey]: value };
                }, {})
            : item.attrs.style,
      }
    : null;

  const isExternalLink = item.slug?.startsWith('http');

  if (isExternalLink && item.slug) {
    itemPath = item.slug;
  }

  return (
    <a
      href={itemPath}
      {...(attrs || {})}
      className={`flex items-center px-2 py-1.5 text-xs ${isActive ? 'bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-page-text))] font-semibold' : 'text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]'} rounded-md`}
      data-active={isActive}
      target={isExternalLink ? '_blank' : undefined}
    >
      <span className="truncate flex items-center gap-1.5">
        {item.label}
        {isExternalLink && <ExternalLinkIcon className="w-3 -mt-0.5 h-3" />}
      </span>
      {item.badge && item?.badge?.text && (
        <span
          className={
            item.badge.color
              ? `text-${item.badge.color}-600 dark:text-${item.badge.color}-400 ml-2 text-[10px] font-medium bg-${item.badge.color}-50 dark:bg-${item.badge.color}-500/20 px-2 py-0.5 rounded uppercase`
              : `text-[rgb(var(--ec-accent))] ml-2 text-[10px] font-medium bg-[rgb(var(--ec-accent-subtle))] px-2 py-0.5 rounded uppercase`
          }
        >
          {item.badge.text}
        </span>
      )}
    </a>
  );
};

export default React.memo(NestedItem);
