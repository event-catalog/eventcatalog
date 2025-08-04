import { Handle } from '@xyflow/react';
import MessageContextMenu from './MessageContextMenu';
import { Position } from '@xyflow/react';

// Import from properly installed package
import { nodeComponents, type EventNode, type EventNodeData } from '@eventcatalogtest/visualizer2';
import type { CollectionEntry } from 'astro:content';
const EventComponent = nodeComponents.event;

interface Props extends EventNode {
  data: {
    message: CollectionEntry<'events'>;
  } & EventNodeData;
}

export default function EventNode(props: Props) {
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
    <MessageContextMenu message={props.data.message} messageType="events">
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
        <EventComponent {...props} data={nodeData as EventNodeData} />
      </div>
    </MessageContextMenu>
  );
}
