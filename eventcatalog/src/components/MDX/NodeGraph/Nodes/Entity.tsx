import { CubeIcon } from '@heroicons/react/16/solid';
import type { CollectionEntry } from 'astro:content';
import { Handle, Position } from '@xyflow/react';
import { getIcon } from '@utils/badges';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';
import { useState } from 'react';

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  entity: CollectionEntry<'entities'>;
  showTarget?: boolean;
  showSource?: boolean;
  externalToDomain?: boolean;
  domainName?: string;
  domainId?: string;
  group?: {
    type: string;
    value: string;
  };
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function EntityNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, entity, externalToDomain, domainName } = data as Data;
  const { name, version, properties = [], aggregateRoot, styles, sidebar } = entity.data;

  const { node: { color = 'blue', label } = {}, icon = 'CubeIcon' } = styles || {};

  const Icon = getIcon(icon);

  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          className={classNames(
            'bg-white border border-blue-300 rounded-lg shadow-sm min-w-[200px]',
            externalToDomain ? 'border-yellow-400' : ''
          )}
        >
          {/* Table Header */}
          <div
            className={classNames(
              'bg-blue-100 px-4 py-2 rounded-t-lg border-b border-gray-300',
              externalToDomain ? 'bg-yellow-400' : ''
            )}
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4 text-gray-600" />}
              <span className="font-semibold text-gray-800 text-sm">{name}</span>
              {aggregateRoot && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">AR</span>}
            </div>
            {/* {externalToDomain && domainName && ( */}
            <div className="text-xs text-yellow-800 font-medium mt-1">from {domainName} domain</div>
            {/* )} */}
            {mode === 'full' && <div className="text-xs text-gray-600 mt-1">v{version}</div>}
          </div>

          {/* Properties Table */}
          {properties.length > 0 ? (
            <div className="divide-y divide-gray-200 relative">
              {properties.map((property: any, index: number) => {
                const propertyKey = `${property.name}-${index}`;
                const isHovered = hoveredProperty === propertyKey;
                return (
                  <div
                    key={propertyKey}
                    className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-50"
                    onMouseEnter={() => property.description && setHoveredProperty(propertyKey)}
                    onMouseLeave={() => setHoveredProperty(null)}
                  >
                    {/* Target handle */}
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={`${property.name}-target`}
                      className="!w-3 !h-3 !bg-white !border-2 !border-gray-400 !rounded-full !left-[-0px]"
                      style={{ left: '-6px' }}
                    />

                    {/* Source handle */}
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`${property.name}-source`}
                      className="!w-3 !h-3 !bg-white !border-2 !border-gray-400 !rounded-full !right-[-0px]"
                      style={{ right: '-6px' }}
                    />

                    {/* Property content */}
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-900">{property.name}</span>
                        {property.required && <span className="text-red-500 text-xs">*</span>}
                      </div>
                      <span className="text-sm text-gray-600 font-mono">{property.type}</span>
                    </div>

                    {/* Reference indicator */}
                    {property.references && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" title={`References ${property.references}`}></div>
                      </div>
                    )}

                    {/* Property Tooltip */}
                    {isHovered && property.description && (
                      <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-[9999] w-[200px] bg-gray-900 text-white text-xs rounded-lg py-2 px-3 pointer-events-none shadow-xl max-w-xl opacity-100">
                        <div className="text-gray-200 whitespace-normal break-words">{property.description}</div>
                        <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">No properties defined</div>
          )}

          {/* Main node handles (if no properties) */}
          {properties.length === 0 && (
            <>
              {targetPosition && <Handle type="target" position={targetPosition} />}
              {sourcePosition && <Handle type="source" position={sourcePosition} />}
            </>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
          <ContextMenu.Item
            asChild
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
          >
            <a href={buildUrl(`/docs/entities/${entity.data.id}/${version}`)}>Read documentation</a>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
