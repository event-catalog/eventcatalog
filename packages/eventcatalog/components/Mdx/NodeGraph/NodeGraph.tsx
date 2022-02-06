import React, { useCallback } from 'react';
import ReactFlow, { Controls, ReactFlowProvider } from 'react-flow-renderer';
import { Event, Service } from '@eventcatalog/types';
import { getEventElements, getServiceElements } from './GraphElements';
import createGraphLayout, { calcCanvasHeight } from './GraphLayout';

interface NodeGraphBuilderProps {
  data: Event | Service;
  source: 'event' | 'service';
  rootNodeColor?: string;
  maxZoom?: number;
  fitView?: boolean;
  zoomOnScroll?: boolean;
  isAnimated?: boolean;
  isDraggable?: boolean;
  isHorizontal?: boolean;
}

interface NodeGraphProps extends NodeGraphBuilderProps {
  maxHeight?: number;
}

// NodeGraphBuilder component wrapping ReactFlow
function NodeGraphBuilder({
  data,
  source,
  rootNodeColor,
  maxZoom = 10,
  isAnimated = false,
  fitView = true,
  zoomOnScroll = false,
  isDraggable = false,
  isHorizontal = true,
}: NodeGraphBuilderProps) {
  // Load event or service elements for graph
  let initialElements;
  if (source === 'event') {
    initialElements = getEventElements(data as Event, rootNodeColor, isAnimated);
  } else {
    initialElements = getServiceElements(data as Service, rootNodeColor, isAnimated);
  }

  // ReactFlow operations
  const onElementClick = (event, element) => window.open(element.data.link, '_self');
  const onLoad = useCallback(
    (reactFlowInstance) => {
      if (fitView) {
        reactFlowInstance.fitView();
      }
    },
    [fitView]
  );

  // Calculate element layout
  const graphElements = createGraphLayout(initialElements, isHorizontal);

  return (
    <ReactFlow
      elements={graphElements}
      onLoad={onLoad}
      onElementClick={onElementClick}
      nodesDraggable={isDraggable}
      zoomOnScroll={zoomOnScroll}
      maxZoom={maxZoom}
    >
      <Controls />
    </ReactFlow>
  );
}

// NodeGraph wrapping NodeGraphBuilder Component
function NodeGraph({
  data,
  source,
  rootNodeColor,
  maxHeight,
  maxZoom,
  fitView,
  zoomOnScroll,
  isAnimated,
  isDraggable,
  isHorizontal,
}: NodeGraphProps) {
  // Set dynamic height of node graph
  const dynamicHeight = maxHeight || calcCanvasHeight(data, source);

  return (
    <div className="node-graph w-full border-dashed border-2 border-slate-300" style={{ height: dynamicHeight }}>
      <ReactFlowProvider>
        <NodeGraphBuilder
          source={source}
          data={data}
          rootNodeColor={rootNodeColor}
          maxZoom={maxZoom}
          fitView={fitView}
          zoomOnScroll={zoomOnScroll}
          isAnimated={isAnimated}
          isDraggable={isDraggable}
          isHorizontal={isHorizontal}
        />
      </ReactFlowProvider>
    </div>
  );
}

export default NodeGraph;
