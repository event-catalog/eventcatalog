import { ChatBubbleLeftIcon } from '@heroicons/react/16/solid';
import type { CollectionEntry } from 'astro:content';
import { Handle } from 'reactflow';

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  message: CollectionEntry<'commands'>;
  showTarget?: boolean;
  showSource?: boolean;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function CommandNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, message, showSource = true, showTarget = true } = data as Data;

  const { name, version, summary, owners = [], producers = [], consumers = [] } = message.data;

  const renderTarget = showTarget || (targetPosition && producers.length > 0);
  const renderSource = showSource || (sourcePosition && consumers.length > 0);

  return (
    <div className={classNames('w-full rounded-md border flex justify-start  bg-white text-black border-blue-400')}>
      <div
        className={classNames(
          'bg-gradient-to-b from-blue-500 to-blue-700 relative flex items-center w-5 justify-center rounded-l-sm text-blue-100-500',
          `border-r-[1px] border-blue-500`
        )}
      >
        <ChatBubbleLeftIcon className="w-4 h-4 opacity-90 text-white absolute top-1 " />
        {mode === 'full' && (
          <span className="rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[9px] text-white font-bold uppercase tracking-[3px] ">
            Command
          </span>
        )}
      </div>
      <div className="p-1 min-w-60 max-w-[min-content]">
        {renderTarget && <Handle type="target" position={targetPosition} />}
        {renderSource && <Handle type="source" position={sourcePosition} />}
        <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
          <span className="text-xs font-bold block pb-0.5">{name}</span>
          <div className="flex justify-between">
            <span className="text-[10px] font-light block pt-0.5 pb-0.5 ">v{version}</span>
            {mode === 'simple' && <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5 ">Command</span>}
          </div>
        </div>
        {mode === 'full' && (
          <div className="divide-y divide-gray-200 ">
            <div className="leading-3 py-1">
              <span className="text-[8px] font-light">{summary}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 py-1">
              <span className="text-xs" style={{ fontSize: '0.2em' }}>
                Producers: {producers.length}
              </span>
              <span className="text-xs" style={{ fontSize: '0.2em' }}>
                Consumers: {consumers.length}
              </span>
              <span className="text-xs" style={{ fontSize: '0.2em' }}>
                Owners: {owners.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
