import { Handle, Position } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';

import { nodeComponents, type ChannelNode } from '@eventcatalog/visualizer';
const ChannelComponent = nodeComponents.channel;

export default function ChannelNode(props: ChannelNode) {
  // @ts-ignore
  const { id, version } = props.data.channel;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className="relative">
          <Handle
            type="target"
            position={Position.Left}
            style={{ width: 10, height: 10, background: 'green', zIndex: 10 }}
            className="bg-gray-500"
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{ width: 10, height: 10, background: 'green', zIndex: 10 }}
            className="bg-gray-500"
          />
          <ChannelComponent {...props} />
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
          <ContextMenu.Item
            asChild
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
          >
            <a href={buildUrl(`/docs/channels/${id}/${version}`)}>Read documentation</a>
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />

          <ContextMenu.Item asChild>
            <a
              href={buildUrl(`/docs/channels/${id}/${version}/changelog`)}
              className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read changelog
            </a>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
