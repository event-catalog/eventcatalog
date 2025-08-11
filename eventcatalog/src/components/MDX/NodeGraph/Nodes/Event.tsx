import { Handle } from '@xyflow/react';
import MessageContextMenu from './MessageContextMenu';
import { Position } from '@xyflow/react';

// Import from properly installed package
import { nodeComponents, type EventNode } from '@eventcatalog/visualizer';
const EventComponent = nodeComponents.event;

export default function EventNode(props: EventNode) {
  return (
    <MessageContextMenu message={props.data.message as any} messageType="events">
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          style={{ width: 10, height: 10, background: 'orange', zIndex: 10 }}
          className="bg-orange-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: 10, height: 10, background: 'orange', zIndex: 10 }}
          className="bg-orange-500"
        />
        <EventComponent {...props} />
      </div>
    </MessageContextMenu>
  );
}
