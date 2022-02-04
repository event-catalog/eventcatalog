import React, { useState } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, isNode, Elements, NodeExtent, Position } from 'react-flow-renderer';
import dagre from 'dagre';
import { Service, Event } from '@eventcatalog/types';

import { buildReactFlowForEvent, buildReactFlowForService } from '@/lib/node-graphs';

interface NodeGraphProps {
  data: Event | Service;
  source: 'event' | 'service';
  rootNodeColor?: string;
  maxHeight?: number;
  maxZoom?: number;
  isAnimated?: boolean;
  isHorizontal?: boolean;
  isDraggable?: boolean;
}
const defaultNodeWidth = 150;
const defaultNodeHeight = 36;

// Helper - ReactFlow canvas height calculator
const calcCanvasHeight = (data, type): number => {
  const minHeight = 300;
  const nodeSpacing = defaultNodeHeight * 2; // Each node has height of 50px, plus a margin of 50px = 100
  let nodesHeight = 0;
  if (type === 'event') {
    nodesHeight = Math.max(data.producers.length, data.consumers.length) * nodeSpacing;
  } else {
    nodesHeight = Math.max(data.publishes.length, data.subscribes.length) * nodeSpacing;
  }
  return Math.max(minHeight, nodesHeight);
};

// eslint-disable-next-line no-underscore-dangle
// const nodeHasDimension = (el) => el.__rf.width && el.__rf.height;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeExtent: NodeExtent = [
  [0, 0],
  [1000, 1000],
];

function NodeGraph({
  data,
  source,
  rootNodeColor,
  maxHeight,
  maxZoom = 5,
  isAnimated = true,
  isHorizontal = true,
  isDraggable = false,
}: NodeGraphProps) {
  // Initial elements for events or services
  const initialElements =
    source === 'event'
      ? buildReactFlowForEvent(data as Event, rootNodeColor, isAnimated)
      : buildReactFlowForService(data as Service, rootNodeColor, isAnimated);

  // Set dynamic height of node graph
  const dynamicHeight = maxHeight || calcCanvasHeight(data, source);

  const [elements, setElements] = useState<Elements>(initialElements);

  // const nodes = useStoreState((state) => state.nodes);
  // const edges = useStoreState((state) => state.edges);
  // const [shouldLayout, setShouldLayout] = useState(true);

  // const onConnect = (params: Connection | Edge) => setElements((els) => addEdge(params, els));
  // const onElementsRemove = (elementsToRemove: Elements) => setElements((els) => removeElements(elementsToRemove, els));
  const onElementClick = (event, element) => window.open(element.data.link, '_self');

  const onLayout = () => {
    const direction = isHorizontal ? 'LR' : 'TB';
    dagreGraph.setGraph({ rankdir: direction });

    elements.forEach((el) => {
      if (isNode(el)) {
        // dagreGraph.setNode(el.id, { width: 150, height: 50 });
        dagreGraph.setNode(el.id, {
          // eslint-disable-next-line no-underscore-dangle
          width: el.__rf?.width || defaultNodeWidth,
          // eslint-disable-next-line no-underscore-dangle
          height: el.__rf?.height || defaultNodeHeight,
        });
        console.log('el', el);
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
          x: nodeWithPosition.x + (nodeWithPosition.data?.width || defaultNodeWidth) / 2 + Math.random() / 1000,
          y: nodeWithPosition.y - (nodeWithPosition.data?.height || defaultNodeHeight) / 2,
          // x: nodeWithPosition.x + Math.random() / 1000,
          // y: nodeWithPosition.y,
        };
      }

      return el;
    });

    setElements(layoutedElements);
  };

  // useEffect(() => {
  //   if (
  //     shouldLayout &&
  //     nodes.length &&
  //     nodes.length > 0 &&
  //     nodes.every(nodeHasDimension)
  //   ) {
  //     const elements = [...nodes, ...edges];
  //     const elementsWithLayout = getLayoutedElements(elements);
  //
  //     setElements(elementsWithLayout);
  //     setShouldLayout(false);
  //   }
  // }, [shouldLayout, nodes, edges, setElements, setShouldLayout]);

  return (
    <div className="node-graph w-full" style={{ height: dynamicHeight }}>
      <ReactFlowProvider>
        <ReactFlow
          elements={elements}
          maxZoom={maxZoom}
          nodesDraggable={isDraggable}
          onElementClick={onElementClick}
          // onConnect={onConnect}
          // onElementsRemove={onElementsRemove}
          nodeExtent={nodeExtent}
          onLoad={() => onLayout()}
        >
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default NodeGraph;
