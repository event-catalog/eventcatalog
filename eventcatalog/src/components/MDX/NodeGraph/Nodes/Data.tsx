import { Handle, Position } from '@xyflow/react';

import { nodeComponents, type DataNode } from '@eventcatalog/visualizer';
const DataComponent = nodeComponents.data;

export default function DataNode(props: DataNode) {
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
      <DataComponent {...props} />
    </div>
  );
}
