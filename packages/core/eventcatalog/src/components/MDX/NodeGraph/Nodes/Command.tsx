import { Handle, Position } from '@xyflow/react';
import MessageContextMenu from './MessageContextMenu';

import { nodeComponents, type CommandNode } from '@eventcatalog/visualizer';
const CommandComponent = nodeComponents.command;

export default function CommandNode(props: CommandNode) {
  return (
    <MessageContextMenu message={props.data.message as any} messageType="commands">
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
        <CommandComponent {...props} />
      </div>
    </MessageContextMenu>
  );
}
