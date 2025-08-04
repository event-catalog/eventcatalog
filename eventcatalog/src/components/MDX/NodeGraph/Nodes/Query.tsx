import { Handle } from '@xyflow/react';
import MessageContextMenu from './MessageContextMenu';
import { Position } from '@xyflow/react';
import type { CollectionEntry } from 'astro:content';

import { nodeComponents, type QueryNode, type QueryNodeData } from '@eventcatalogtest/visualizer2';
const QueryComponent = nodeComponents.query;

interface Props extends QueryNode {
  data: {
    message: CollectionEntry<'queries'>;
  } & QueryNodeData;
}

export default function QueryNode(props: Props) {
  const nodeData = {
    name: props.data.message.data.name,
    version: props.data.message.data.version,
    summary: props.data.message.data.summary,
    owners: props.data.message.data.owners,
    producers: props.data.message.data.producers,
    consumers: props.data.message.data.consumers,
    mode: props.data.mode,
  };

  return (
    <MessageContextMenu message={props.data.message} messageType="queries">
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
        <QueryComponent {...props} data={nodeData as QueryNodeData} />
      </div>
    </MessageContextMenu>
  );
}
