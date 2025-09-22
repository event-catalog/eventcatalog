import { Handle, Position } from '@xyflow/react';

import { nodeComponents, type ViewNode } from '@eventcatalog/visualizer';
const ViewComponent = nodeComponents.view;

export default function ViewNode(props: ViewNode) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, background: 'blue', zIndex: 10 }}
        className="bg-gray-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, background: 'blue', zIndex: 10 }}
        className="bg-gray-500"
      />
      <ViewComponent {...props} />
    </div>
  );
}
