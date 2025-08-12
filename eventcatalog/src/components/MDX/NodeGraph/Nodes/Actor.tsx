import { Handle, Position } from '@xyflow/react';

import { nodeComponents, type ActorNode } from '@eventcatalog/visualizer';
const ActorComponent = nodeComponents.actor;

export default function ActorNode(props: ActorNode) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, background: 'orange', zIndex: 10 }}
        className="bg-gray-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, background: 'orange', zIndex: 10 }}
        className="bg-gray-500"
      />
      <ActorComponent {...props} />
    </div>
  );
}
