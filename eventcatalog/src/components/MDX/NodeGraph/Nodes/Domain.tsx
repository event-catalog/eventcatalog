import type { CollectionEntry } from 'astro:content';
import { Handle } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';
import { getIcon } from '@utils/badges';

interface Data {
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  domain: CollectionEntry<'domains'>;
  servicesCount?: number;
  messagesCount?: number;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function DomainNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, domain, servicesCount = 0, messagesCount = 0 } = data as Data;

  const { id, version, name, summary, services = [], styles } = domain.data;
  const { node: { color = 'yellow', label } = {}, icon = 'RectangleGroupIcon' } = styles || {};

  const Icon = getIcon(icon);
  const nodeLabel = label || domain?.data?.sidebar?.badge || 'Domain';
  const fontSize = nodeLabel.length > 10 ? '7px' : '9px';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className={classNames(`w-full rounded-md border flex justify-start  bg-white text-black border-${color}-400`)}>
          <div
            className={classNames(
              `bg-gradient-to-b from-${color}-500 to-${color}-700 relative flex items-center w-5 justify-center rounded-l-sm text-${color}-100`,
              `border-r-[1px] border-${color}-500`
            )}
          >
            {Icon && <Icon className="w-4 h-4 opacity-90 text-white absolute top-1 " />}
            {mode === 'full' && (
              <span
                className={`rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[${fontSize}] text-white font-bold uppercase tracking-[3px] `}
              >
                {nodeLabel}
              </span>
            )}
          </div>
          <div className="p-1 min-w-60 max-w-[min-content]">
            {targetPosition && <Handle type="target" position={targetPosition} />}
            {sourcePosition && <Handle type="source" position={sourcePosition} />}
            <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
              <span className="text-xs font-bold block pt-0.5 pb-0.5">{name}</span>
              <div className="flex justify-between">
                <span className="text-[10px] font-light block pt-0.5 pb-0.5 ">v{version}</span>
                {mode === 'simple' && (
                  <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5 ">{nodeLabel}</span>
                )}
              </div>
            </div>
            {mode === 'full' && (
              <div className="divide-y divide-gray-200 ">
                <div className="leading-3 py-1">
                  <span className="text-[8px] font-light">{summary}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 py-1">
                  <span className="text-xs" style={{ fontSize: '0.2em' }}>
                    Services: {servicesCount}
                  </span>
                  <span className="text-xs" style={{ fontSize: '0.2em' }}>
                    Messages: {messagesCount}
                  </span>
                  <span className="text-xs" style={{ fontSize: '0.2em' }}>
                    Subdomains: {domain.data.domains?.length || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md overflow-hidden p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
          <ContextMenu.Item
            className="group text-[13px] leading-none text-violet11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1 cursor-pointer"
            onClick={() => (window.location.href = buildUrl(`/docs/domains/${id}/${version}`))}
          >
            View Domain Documentation
          </ContextMenu.Item>
          <ContextMenu.Item
            className="group text-[13px] leading-none text-violet11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1 cursor-pointer"
            onClick={() => (window.location.href = buildUrl(`/visualiser/domains/${id}/${version}`))}
          >
            View Domain Visualizer
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
