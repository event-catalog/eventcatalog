import React, { useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  removeElements,
  Controls,
  isNode,
  Elements,
  Connection,
  Edge,
  NodeExtent,
  Position,
} from 'react-flow-renderer';
import dagre from 'dagre';
import { Service, Event } from '@eventcatalog/types';

import { buildReactFlowForEvent, buildReactFlowForService } from '@/lib/node-graphs';

interface NodeGraphProps {
  data: Event | Service;
  source: 'event' | 'service';
  rootNodeColor?: string;
  maxHeight?: number;
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeExtent: NodeExtent = [
  [0, 0],
  [1000, 1000],
];

function NodeGraph({ data, source, rootNodeColor, maxHeight = 400 }: NodeGraphProps) {
  const initialElements =
    source === 'event'
      ? buildReactFlowForEvent(data as Event, rootNodeColor)
      : buildReactFlowForService(data as Service, rootNodeColor);

  const [elements, setElements] = useState<Elements>(initialElements);
  const onConnect = (params: Connection | Edge) => setElements((els) => addEdge(params, els));
  const onElementsRemove = (elementsToRemove: Elements) => setElements((els) => removeElements(elementsToRemove, els));
  const onElementClick = (event, element) => window.open(element.data.link);

  const onLayout = (direction: string) => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    elements.forEach((el) => {
      if (isNode(el)) {
        dagreGraph.setNode(el.id, { width: 150, height: 50 });
      } else {
        dagreGraph.setEdge(el.source, el.target);
      }
    });

    dagre.layout(dagreGraph);

    const layoutedElements = elements.map((el) => {
      if (isNode(el)) {
        const nodeWithPosition = dagreGraph.node(el.id);
        el.targetPosition = isHorizontal ? Position.Left : Position.Top;
        el.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
        // we need to pass a slightly different position in order to notify react flow about the change
        // @TODO how can we change the position handling so that we dont need this hack?
        el.position = {
          x: nodeWithPosition.x + Math.random() / 1000,
          y: nodeWithPosition.y,
        };
      }

      return el;
    });

    setElements(layoutedElements);
  };

  return (
    <div className="node-graph w-full" style={{ height: maxHeight }}>
      <ReactFlowProvider>
        <ReactFlow
          elements={elements}
          onConnect={onConnect}
          onElementClick={onElementClick}
          onElementsRemove={onElementsRemove}
          nodeExtent={nodeExtent}
          onLoad={() => onLayout('LR')}
        >
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default NodeGraph;
