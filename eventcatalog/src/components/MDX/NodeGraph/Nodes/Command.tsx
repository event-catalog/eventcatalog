import type { CollectionEntry } from 'astro:content';
import { Handle, Position } from '@xyflow/react';
import MessageContextMenu from './MessageContextMenu';
import { nodeComponents, type CommandNode, type CommandNodeData } from '@eventcatalogtest/visualizer2';
const CommandComponent = nodeComponents.command;

interface Props extends CommandNode {
  data: {
    message: CollectionEntry<'commands'>;
  } & CommandNodeData;
}

export default function CommandNode(props: Props) {
  const nodeData = {
    id: props.data.message.id,
    name: props.data.message.data.name,
    version: props.data.message.data.version,
    summary: props.data.message.data.summary,
    owners: props.data.message.data.owners,
    producers: props.data.message.data.producers,
    consumers: props.data.message.data.consumers,
    mode: props.data.mode,
  };

  return (
    <MessageContextMenu message={props.data.message} messageType="commands">
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          style={{ width: 10, height: 10, background: 'blue', zIndex: 10 }}
          className="bg-blue-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: 10, height: 10, background: 'blue', zIndex: 10 }}
          className="bg-blue-500"
        />
        <CommandComponent {...props} data={nodeData as CommandNodeData} />
      </div>
    </MessageContextMenu>
  );
}
