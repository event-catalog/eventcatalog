import { Handle } from '@xyflow/react';

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  step: { id: string; title: string; summary: string };
  showTarget?: boolean;
  showSource?: boolean;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function StepNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, step } = data as Data;

  const { title, summary } = step;

  return (
    <div className={classNames('w-full rounded-md border flex justify-start  bg-white text-black border-blue-400 min-h-[3em]')}>
      <div
        className={classNames(
          'bg-gradient-to-b from-gray-700 to-gray-700 relative flex items-center w-5 justify-center rounded-l-sm text-orange-100-500',
          `border-r-[1px] border-gray-500`
        )}
      >
        {mode === 'full' && (
          <span className="rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[9px] text-white font-bold uppercase tracking-[3px] ">
            Step
          </span>
        )}
      </div>
      <div className="p-1 min-w-60 max-w-[min-content]">
        {targetPosition && <Handle type="target" position={targetPosition} />}
        {sourcePosition && <Handle type="source" position={sourcePosition} />}

        {!summary && (
          <div className="h-full flex items-center">
            <span className="text-sm font-bold block pb-0.5">{title}</span>
          </div>
        )}

        {summary && (
          <div>
            <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
              <span className="text-xs font-bold block pb-0.5">{title}</span>
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
