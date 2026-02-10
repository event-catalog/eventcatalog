import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { getIconForCollection as getIconForCollectionOriginal } from '@utils/collections/icons';
import { useMemo, useState } from 'react';
import * as icons from 'lucide-react'; // Import all icons

import './PillListFlat.styles.css';

interface Props {
  title: string;
  color: string;
  icon?: any;
  limit?: number;
  pills: {
    label: string;
    badge?: string;
    href?: string;
    target?: '_blank' | '_self';
    tag?: string;
    color?: string;
    collection?: string;
    description?: string;
    icon?: string;
    subgroup?: string | undefined;
  }[];
  emptyMessage?: string;
}

const PillList = ({ title, pills, emptyMessage, color = 'gray', limit = 10, ...props }: Props) => {
  const getIconForCollection = useMemo(() => getIconForCollectionOriginal, []);
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Set<string>>(new Set());

  const groupedPills = useMemo(() => {
    const grouped = new Map<string, typeof pills>();
    const ungrouped: typeof pills = [];

    pills.forEach((pill) => {
      if (pill.subgroup) {
        if (!grouped.has(pill.subgroup)) {
          grouped.set(pill.subgroup, []);
        }
        grouped.get(pill.subgroup)!.push(pill);
      } else {
        ungrouped.push(pill);
      }
    });

    return { grouped, ungrouped };
  }, [pills]);

  const toggleSubgroup = (subgroupName: string) => {
    setCollapsedSubgroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subgroupName)) {
        newSet.delete(subgroupName);
      } else {
        newSet.add(subgroupName);
      }
      return newSet;
    });
  };

  const renderPillItem = (item: (typeof pills)[0]) => {
    const href = item.href ?? '#';
    const Icon = item.collection ? getIconForCollection(item.collection) : null;
    const PillIcon = item.icon ? (icons as any)[item.icon] : null;

    return (
      <li className="pill-item has-tooltip rounded-md text-[rgb(var(--ec-page-text-muted))] group px-1 w-full" key={item.href}>
        <a className={`leading-3`} href={href} target={item.target ?? '_self'}>
          <span className="space-x-2 flex items-center">
            {Icon && !PillIcon && <Icon className="h-4 w-4 shrink-0" />}
            {PillIcon && <PillIcon className="h-4 w-4 shrink-0" />}
            <span className="font-light text-sm truncate">
              {item.label} {item.tag && <>({item.tag})</>}
            </span>
            {item.label.length > 24 && (
              <span className="tooltip rounded relative shadow-lg p-1 font-normal text-xs bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text))] border border-[rgb(var(--ec-page-border))] ml-[30px] mt-12">
                {item.label} {item.tag && <>({item.tag})</>}
              </span>
            )}
          </span>
          {item.description && <span className="text-[9px] block ml-6 mt-1 leading-0">{item.description}</span>}
        </a>
      </li>
    );
  };

  return (
    <div className="">
      <div className="mx-auto w-full max-w-lg divide-y divide-[rgb(var(--ec-page-border))] rounded-xl">
        <Disclosure as="div" className="" defaultOpen={pills.length <= limit}>
          <DisclosureButton className="group flex w-full items-center justify-start space-x-4">
            <span className="text-sm text-[rgb(var(--ec-page-text))] font-semibold group-data-[hover]:opacity-80 capitalize">
              {' '}
              {title}{' '}
            </span>
            <ChevronDownIcon className="size-5 ml-2 fill-[rgb(var(--ec-icon-color))] group-data-[hover]:opacity-80 group-data-[open]:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel className="mt-2 text-sm/5 text-[rgb(var(--ec-page-text-muted))]">
            <div className="space-y-2">
              {groupedPills.ungrouped.length > 0 && (
                <ul role="list" className="space-y-2">
                  {groupedPills.ungrouped.map(renderPillItem)}
                </ul>
              )}

              {Array.from(groupedPills.grouped.entries()).map(([subgroupName, subgroupPills]) => {
                const isCollapsed = collapsedSubgroups.has(subgroupName);
                return (
                  <div key={subgroupName} className="space-y-">
                    <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubgroup(subgroupName);
                        }}
                        className="p-1 hover:bg-[rgb(var(--ec-content-hover))] rounded-md"
                      >
                        <div className={`transition-transform duration-150 ${isCollapsed ? '' : 'rotate-180'}`}>
                          <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--ec-icon-color))]" />
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubgroup(subgroupName);
                        }}
                        className="flex-grow flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md text-[rgb(var(--ec-page-text))] uppercase"
                      >
                        {subgroupName} ({subgroupPills.length})
                      </button>
                    </div>
                    <div
                      className={`overflow-hidden transition-[height] duration-150 ease-out ${isCollapsed ? 'h-0' : 'h-auto'}`}
                    >
                      <ul role="list" className="space-y-2 border-l border-[rgb(var(--ec-page-border))] ml-[9px] pl-4 pt-2">
                        {subgroupPills.map(renderPillItem)}
                      </ul>
                    </div>
                  </div>
                );
              })}

              {pills.length === 0 && emptyMessage && (
                <div className="inline mr-2 leading-tight text-xs">
                  <span className="text-[rgb(var(--ec-icon-color))]">{emptyMessage}</span>
                </div>
              )}
            </div>
          </DisclosurePanel>
        </Disclosure>
      </div>
      <div className="border-b border-[rgb(var(--ec-page-border))] my-4"></div>
    </div>
  );
};

export default PillList;
