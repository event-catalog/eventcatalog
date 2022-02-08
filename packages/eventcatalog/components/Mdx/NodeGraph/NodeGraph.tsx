import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactFlow, { Controls, ReactFlowProvider, useStoreState, Background, useZoomPanHelper } from 'react-flow-renderer';
import { Event, Service } from '@eventcatalog/types';
import { getEventElements, getServiceElements } from './GraphElements';
import createGraphLayout, { calcCanvasHeight } from './GraphLayout';

interface NodeGraphBuilderProps {
  data: Event | Service;
  source: 'event' | 'service';
  title?: string;
  subtitle?: string;
  rootNodeColor?: string;
  maxZoom?: number;
  fitView?: boolean;
  zoomOnScroll?: boolean;
  isAnimated?: boolean;
  isDraggable?: boolean;
  isHorizontal?: boolean;
  includeBackground?: boolean;
  includeEdgeLabels?: boolean;
  includeNodeIcons?: boolean;
}

interface NodeGraphProps extends NodeGraphBuilderProps {
  maxHeight?: number | string;
  renderWithBorder?: boolean;
}

// NodeGraphBuilder component wrapping ReactFlow
function NodeGraphBuilder({
  data,
  source,
  rootNodeColor,
  maxZoom = 10,
  isAnimated = true,
  fitView = true,
  zoomOnScroll = false,
  isDraggable = false,
  isHorizontal = true,
  includeBackground = false,
  includeEdgeLabels = false,
  includeNodeIcons,
  title,
  subtitle,
}: NodeGraphBuilderProps) {
  const getElements = () => {
    if (source === 'event') {
      return getEventElements(data as Event, rootNodeColor, isAnimated, includeEdgeLabels, includeNodeIcons);
    }
    return getServiceElements(data as Service, rootNodeColor, isAnimated, includeEdgeLabels, includeNodeIcons);
  };

  // Initialize graph layout
  const isInitializedRef = useRef(false);
  const nodes = useStoreState((state) => state.nodes);
  const edges = useStoreState((state) => state.edges);
  const { fitView: resetView } = useZoomPanHelper();

  // Calculate initial element layout
  const graphElements = createGraphLayout(getElements(), isHorizontal);
  const [elements, setElements] = useState(graphElements);

  // if data changes, reset the elements
  useEffect(() => {
    const updatedElements = createGraphLayout(getElements(), isHorizontal);
    setElements(updatedElements);
    setTimeout(() => {
      resetView();
    }, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Rerender graph layout to get rendered width/height for nodes/edges
  useEffect(() => {
    if (
      isInitializedRef.current === false &&
      nodes.length > 0 &&
      // eslint-disable-next-line no-underscore-dangle
      nodes?.[0]?.__rf.width != null
    ) {
      // Calculate element layout
      const updateElements = () => {
        const updatedElements = createGraphLayout([...nodes, ...edges], isHorizontal);
        setElements(updatedElements);
        isInitializedRef.current = true;
      };
      updateElements();
    }
  }, [nodes, edges, isInitializedRef, isHorizontal]);

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

  return (
    <ReactFlow
      elements={elements}
      onLoad={onLoad}
      onElementClick={onElementClick}
      nodesDraggable={isDraggable}
      zoomOnScroll={zoomOnScroll}
      maxZoom={maxZoom}
    >
      {title && (
        <div className="absolute top-4 right-4 bg-white z-10 text-lg px-4 py-2 space-x-2">
          <span className=" font-bold">{title}</span>
          {subtitle && (
            <>
              <span className="text-gray-200">|</span>
              <span className="font-light">{subtitle}</span>
            </>
          )}
        </div>
      )}
      <Controls className="block absolute top-5 react-flow__controls-no-shadow" />
      {includeBackground && <Background color="#c1c1c1" gap={8} />}
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
  includeBackground,
  renderWithBorder = true,
  title,
  subtitle,
  includeEdgeLabels,
  includeNodeIcons,
}: NodeGraphProps) {
  // Set dynamic height of node graph
  const dynamicHeight = maxHeight || calcCanvasHeight(data, source);

  const borderClasses = `border-dashed border-2 border-slate-300`;

  return (
    <div className={`node-graph w-full h-screen ${renderWithBorder ? borderClasses : ''}`} style={{ height: dynamicHeight }}>
      <ReactFlowProvider>
        <NodeGraphBuilder
          source={source}
          data={data}
          rootNodeColor={rootNodeColor}
          maxZoom={maxZoom}
          fitView={fitView}
          includeBackground={includeBackground}
          zoomOnScroll={zoomOnScroll}
          isAnimated={isAnimated}
          isDraggable={isDraggable}
          isHorizontal={isHorizontal}
          includeEdgeLabels={includeEdgeLabels}
          includeNodeIcons={includeNodeIcons}
          title={title}
          subtitle={subtitle}
        />
      </ReactFlowProvider>
      <Link href={`/visualiser?type=${source}&name=${data.name}`}>
        <a className="block text-right  underline text-xs mt-4">Open in Visualiser &rarr;</a>
      </Link>
    </div>
  );
}

export default NodeGraph;
