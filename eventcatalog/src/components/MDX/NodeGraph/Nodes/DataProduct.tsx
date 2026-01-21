import { Handle } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';
import { Position } from '@xyflow/react';
import { Package } from 'lucide-react';

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

interface DataProductNodeProps {
  data: {
    mode: 'simple' | 'full';
    dataProduct: {
      id: string;
      version: string;
      name: string;
      summary?: string;
      inputs?: any[];
      outputs?: any[];
      owners?: any[];
    };
  };
  selected?: boolean;
}

export default function DataProductNode(props: DataProductNodeProps) {
  const { id, version, name, summary, inputs = [], outputs = [], owners = [] } = props.data.dataProduct;
  const mode = props.data.mode || 'simple';
  const nodeLabel = 'Data Product';
  const rotatedLabel = 'Product';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className="relative">
          <Handle
            type="target"
            position={Position.Left}
            style={{ width: 10, height: 10, background: '#6366f1', zIndex: 10 }}
            className="bg-indigo-500"
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{ width: 10, height: 10, background: '#6366f1', zIndex: 10 }}
            className="bg-indigo-500"
          />
          <div
            className={classNames(
              'w-full rounded-md border flex justify-start bg-white text-black',
              props.selected ? 'border-indigo-600 ring-2 ring-indigo-500 shadow-lg' : 'border-indigo-400'
            )}
          >
            <div
              className={`bg-gradient-to-b from-indigo-500 to-indigo-700 relative flex items-center w-5 justify-center rounded-l-sm text-indigo-100 border-r-[1px] border-indigo-500`}
            >
              <Package className="w-4 h-4 opacity-90 text-white absolute top-1" />
              {mode === 'full' && (
                <span
                  className={'w-1/2 text-center absolute bottom-1 text-[8px] text-white font-bold uppercase tracking-[3px]'}
                  style={{ transform: 'rotate(-90deg)' }}
                >
                  {rotatedLabel}
                </span>
              )}
            </div>
            <div className="p-1 min-w-60 max-w-[min-content]">
              <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
                <span className="text-xs font-bold block pt-0.5 pb-0.5">{name}</span>
                <div className="flex justify-between">
                  <span className="text-[10px] font-light block pt-0.5 pb-0.5">v{version}</span>
                  {mode === 'simple' && (
                    <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5">{nodeLabel}</span>
                  )}
                </div>
              </div>
              {mode === 'full' && (
                <div className="divide-y divide-gray-200">
                  <div className="leading-3 py-1">
                    <div
                      className="text-[8px] font-light overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                      title={summary}
                    >
                      {summary}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 py-1">
                    <span className="text-xs" style={{ fontSize: '0.2em' }}>
                      Inputs: {inputs.length}
                    </span>
                    <span className="text-xs" style={{ fontSize: '0.2em' }}>
                      Outputs: {outputs.length}
                    </span>
                    <span className="text-xs" style={{ fontSize: '0.2em' }}>
                      Owners: {owners.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
          <ContextMenu.Item
            asChild
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-indigo-100 rounded-sm flex items-center"
          >
            <a href={buildUrl(`/docs/data-products/${id}/${version}`)}>Read documentation</a>
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />
          <ContextMenu.Item asChild>
            <a
              href={buildUrl(`/visualiser/data-products/${id}/${version}`)}
              className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-indigo-100 rounded-sm flex items-center"
            >
              View in Visualiser
            </a>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
