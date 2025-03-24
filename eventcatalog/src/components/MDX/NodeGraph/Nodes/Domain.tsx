import { BuildingLibraryIcon } from '@heroicons/react/24/outline';
import type { CollectionEntry } from 'astro:content';
import { Handle } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';

interface Data {
  label: string;
  description?: string;
  domain: CollectionEntry<'domains'>;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function DomainNode({ data, sourcePosition, targetPosition }: any) {
  const { label, description, domain } = data as Data;
  const { id, version, name, summary } = domain?.data || {};

  if (!domain) {
    return (
      <div className="bg-white p-3 rounded-md border border-gray-300 text-center">
        <span className="text-sm font-medium">{label || 'Domain'}</span>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
    );
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className="w-full rounded-md border-0 bg-transparent text-gray-900">
          {targetPosition && <Handle type="target" position={targetPosition} />}
          {sourcePosition && <Handle type="source" position={sourcePosition} />}
          
          <div className="flex items-center justify-start mb-2">
            <BuildingLibraryIcon className="h-5 w-5 text-indigo-500 mr-2" />
            <span className="text-base font-semibold">{name || label}</span>
          </div>
          
          {summary && (
            <div className="text-xs text-gray-600 mb-2 max-w-[250px] line-clamp-2">
              {summary}
            </div>
          )}
        </div>
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
          <ContextMenu.Item
            asChild
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-indigo-100 rounded-sm flex items-center"
          >
            <a href={buildUrl(`/docs/domains/${id}/${version}`)}>
              View domain documentation
            </a>
          </ContextMenu.Item>
          
          <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />
          
          <ContextMenu.Item asChild>
            <a
              href={buildUrl(`/visualiser/domains/${id}/${version}`)}
              className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-indigo-100 rounded-sm flex items-center"
            >
              View domain visualization
            </a>
          </ContextMenu.Item>
          
          <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />
          
          <ContextMenu.Item asChild>
            <a
              href={buildUrl(`/docs/domains/${id}/${version}/changelog`)}
              className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-indigo-100 rounded-sm flex items-center"
            >
              View changelog
            </a>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
} 