import { Handle } from '@xyflow/react';
import MessageContextMenu from './MessageContextMenu';
import { Position } from '@xyflow/react';

import { nodeComponents, type QueryNode } from '@eventcatalog/visualizer';
const QueryComponent = nodeComponents.query;

export default function QueryNode(props: QueryNode) {
  return (
    <MessageContextMenu message={props.data.message as any} messageType="queries">
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          style={{ width: 10, height: 10, background: 'green', zIndex: 10 }}
          className="bg-green-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: 10, height: 10, background: 'green', zIndex: 10 }}
          className="bg-green-500"
        />
        <QueryComponent {...props} />
      </div>
    </MessageContextMenu>
  );
}
