import { ServerIcon } from '@heroicons/react/16/solid';
import { GlobeAmericasIcon } from '@heroicons/react/20/solid';
import type { CollectionEntry } from 'astro:content';
import { Handle } from '@xyflow/react';

interface Data {
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  step: { id: string; title: string; summary: string; externalSystem: { name: string; summary?: string; url?: string } };
  showTarget?: boolean;
  showSource?: boolean;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function ExternalSystemNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, step } = data as Data;
  const { externalSystem } = step;
  const { name, summary, url } = externalSystem;

  return (
    <div
      className={classNames(
        `w-full rounded-md border flex justify-start  bg-white text-black border-pink-500`,
        mode === 'full' ? 'min-h-[7em]' : 'min-h-[2em]'
      )}
    >
      <div
        className={classNames(
          'bg-gradient-to-b from-pink-500 to-pink-700 relative flex items-center w-5 justify-center rounded-l-sm text-red-100-500',
          `border-r-[1px] border-pink-500`
        )}
      >
        <GlobeAmericasIcon className="w-4 h-4 opacity-90 text-white absolute top-1 " />
        {mode === 'full' && (
          <span className="rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[9px] text-white font-bold uppercase tracking-[3px] ">
            External
          </span>
        )}
      </div>
      <div className="p-1 min-w-60 max-w-[min-content]">
        {targetPosition && <Handle type="target" position={targetPosition} />}
        {sourcePosition && <Handle type="source" position={sourcePosition} />}
        <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
          <div className="h-full ">
            <span className="text-sm font-bold pb-0.5 block w-full">{name}</span>
            {mode === 'simple' && (
              <div className="w-full text-right">
                <span className=" w-full text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5 ">External System</span>
              </div>
            )}
          </div>
        </div>
        {mode === 'full' && (
          <div className="divide-y divide-gray-200 ">
            <div className="leading-3 py-1">
              <span className="text-[8px] font-light">{summary}</span>
            </div>

            {url && (
              <div className="grid grid-cols-2 gap-x-4 py-1">
                <span className="text-xs" style={{ fontSize: '0.2em' }}>
                  URL:{' '}
                  <a href={url} target="_blank" className="text-primary underline">
                    {url}
                  </a>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
