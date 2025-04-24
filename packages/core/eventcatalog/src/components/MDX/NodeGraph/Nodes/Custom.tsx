import { Handle } from '@xyflow/react';
import * as Icons from '@heroicons/react/24/solid';
import type { ComponentType } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Tooltip from '@radix-ui/react-tooltip';

type MenuItem = {
  label: string;
  url?: string;
};

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  step: { id: string; title: string; summary: string; name: string; actor: { name: string } };
  showTarget?: boolean;
  showSource?: boolean;
  custom: {
    icon?: string;
    type?: string;
    title?: string;
    summary?: string;
    url?: string;
    color?: string;
    properties?: Record<string, string>;
    menu?: MenuItem[];
    height?: number;
  };
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function UserNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, step, custom: customProps } = data as Data;

  const {
    color = 'blue',
    title = 'Custom',
    icon = 'UserIcon',
    type = 'custom',
    summary = '',
    url = '',
    properties = {},
    menu = [],
    height = 5,
  } = customProps;

  const IconComponent: ComponentType<{ className?: string }> | undefined = Icons[icon as keyof typeof Icons];

  const { actor: { name } = {} } = step;

  const isLongType = type && type.length > 10;
  const displayType = isLongType ? `${type.substring(0, 10)}...` : type;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          className={classNames(`w-full rounded-md border flex justify-start  bg-white text-black border-${color}-400`)}
          style={{ minHeight: mode === 'full' ? `${height}em` : '2em' }}
        >
          <div
            className={classNames(
              `bg-gradient-to-b from-${color}-400 to-${color}-600 relative flex items-center w-5 justify-center rounded-l-sm text-orange-100-500`,
              `border-r-[1px] border-${color}`
            )}
          >
            <IconComponent className="w-4 h-4 opacity-90 text-white absolute top-1 " />
            {mode === 'full' && (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <span className="rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[9px] text-white font-bold uppercase tracking-[3px]  ">
                      {displayType}
                    </span>
                  </Tooltip.Trigger>
                  {isLongType && (
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="bg-slate-800 text-white rounded px-2 py-1 text-xs shadow-md z-50"
                        side="right"
                        sideOffset={5}
                      >
                        {type}
                        <Tooltip.Arrow className="fill-slate-800" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  )}
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
          <div className="p-1 min-w-60 max-w-[min-content]">
            {targetPosition && <Handle type="target" position={targetPosition} />}
            {sourcePosition && <Handle type="source" position={sourcePosition} />}

            {(!summary || mode !== 'full') && (
              <div className="h-full ">
                <span className="text-sm font-bold block pb-0.5 w-full">{title}</span>
              </div>
            )}

            {summary && mode === 'full' && (
              <div>
                <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
                  <span className="text-xs font-bold block pb-0.5">{title}</span>
                </div>
                {mode === 'full' && (
                  <div className="divide-y divide-gray-200 ">
                    <div className="leading-3 py-1">
                      <span className="text-[8px] font-light">{summary}</span>
                    </div>
                    {properties && (
                      <div className="grid grid-cols-2 gap-x-4 py-1">
                        {Object.entries(properties).map(([key, value]) => (
                          <span key={key} className="text-xs" style={{ fontSize: '0.2em' }}>
                            {key}:{' '}
                            {typeof value === 'string' && value.startsWith('http') ? (
                              <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                {value}
                              </a>
                            ) : (
                              value
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ContextMenu.Trigger>
      {menu?.length > 0 && (
        <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
            {menu?.map((item) => {
              return (
                <ContextMenu.Item
                  asChild
                  className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                >
                  <a href={item.url}>{item.label}</a>
                </ContextMenu.Item>
              );
            })}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
}
