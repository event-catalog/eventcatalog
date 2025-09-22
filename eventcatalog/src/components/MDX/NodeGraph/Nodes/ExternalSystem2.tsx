import { Handle, Position } from '@xyflow/react';

import { nodeComponents, type ExternalSystemNode } from '@eventcatalog/visualizer';
const ExternalSystemComponent = nodeComponents.externalSystem;

export default function ExternalSystemNode(props: ExternalSystemNode) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, background: 'pink', zIndex: 10 }}
        className="bg-gray-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, background: 'pink', zIndex: 10 }}
        className="bg-gray-500"
      />
      <ExternalSystemComponent {...props} />
    </div>
  );
}
