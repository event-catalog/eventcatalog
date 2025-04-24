import { UserIcon } from '@heroicons/react/20/solid';
import { Handle } from '@xyflow/react';

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  step: { id: string; title: string; summary: string; name: string; actor: { name: string } };
  showTarget?: boolean;
  showSource?: boolean;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function UserNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, step, showTarget = true, showSource = true } = data as Data;

  const { summary, actor: { name } = {} } = step;

  return (
    <div
      className={classNames(
        `w-full rounded-md border flex justify-start  bg-white text-black border-yellow-400`,
        mode === 'full' ? 'min-h-[5em]' : 'min-h-[2em]'
      )}
    >
      <div
        className={classNames(
          'bg-gradient-to-b from-yellow-400 to-yellow-600 relative flex items-center w-5 justify-center rounded-l-sm text-orange-100-500',
          `border-r-[1px] border-yellow-500`
        )}
      >
        <UserIcon className="w-4 h-4 opacity-90 text-white absolute top-1 " />
        {mode === 'full' && (
          <span className="rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[9px] text-white font-bold uppercase tracking-[3px] ">
            ACTOR
          </span>
        )}
      </div>
      <div className="p-1 min-w-60 max-w-[min-content]">
        {targetPosition && <Handle type="target" position={targetPosition} />}
        {sourcePosition && <Handle type="source" position={sourcePosition} />}

        {(!summary || mode !== 'full') && (
          <div className="h-full ">
            <span className="text-sm font-bold block pb-0.5 w-full">{name}</span>
            {mode === 'simple' && (
              <div className="w-full text-right">
                <span className=" w-full text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5 ">Event</span>
              </div>
            )}
          </div>
        )}

        {summary && mode === 'full' && (
          <div>
            <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
              <span className="text-xs font-bold block pb-0.5">{name}</span>
            </div>
            {mode === 'full' && (
              <div className="divide-y divide-gray-200 ">
                <div className="leading-3 py-1">
                  <span className="text-[8px] font-light">{summary}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
