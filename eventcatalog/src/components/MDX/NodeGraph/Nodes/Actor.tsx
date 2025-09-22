import { Handle, Position, type XYPosition } from '@xyflow/react';

import { nodeComponents } from '@eventcatalog/visualizer';
const ActorComponent = nodeComponents.actor;

interface Data {
  data: {
    actor: {
      name: string;
      summary: string;
    };
    mode: 'simple' | 'full';
  };
  type: 'actor';
  id: string;
  position: XYPosition;
}

export default function ActorNode(props: Data) {
  const componentData = {
    ...props,
    data: {
      ...props.data,
      name: props.data.actor.name,
      summary: props.data.actor.summary,
    },
  };

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
      <ActorComponent {...componentData} />
    </div>
  );
}
