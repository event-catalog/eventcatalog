import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ReactFlow, { Controls, ReactFlowProvider, Background, useZoomPanHelper } from 'react-flow-renderer';
import { Domain, Event, Service } from '@eventcatalog/types';
import { getEventElements, getServiceElements } from './GraphElements';
import createGraphLayout, { calcCanvasHeight } from './GraphLayout';

interface CombinedEventsAndServices {
  events: Event[];
  services: Service[];
  name?: string;
}

interface NodeGraphBuilderProps {
  data: Event | Service | Domain | CombinedEventsAndServices;
  source: 'event' | 'service' | 'domain' | 'all';
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
  const getElements = useCallback(() => {
    if (source === 'domain' || source === 'all') {
      const graphData = source === 'domain' ? (data as Domain) : (data as CombinedEventsAndServices);
      const totalEventElements = graphData.events.map((event) => getEventElements(event, rootNodeColor, isAnimated, true, true));
      const totalServiceElements = graphData.services.map((service) =>
        getServiceElements(service, rootNodeColor, isAnimated, true, true)
      );
      const eventsWithServices = totalEventElements.flat().concat(totalServiceElements.flat());
      // after we merge make sure all elements are unique for the diagram
      // @ts-ignore
      return [...new Map(eventsWithServices.map((item) => [item.id, item])).values()];
    }

    if (source === 'event') {
      return getEventElements(data as Event, rootNodeColor, isAnimated, includeEdgeLabels, includeNodeIcons);
    }

    return getServiceElements(data as Service, rootNodeColor, isAnimated, includeEdgeLabels, includeNodeIcons);
  }, [data, includeEdgeLabels, includeNodeIcons, isAnimated, rootNodeColor, source]);

  const { fitView: resetView } = useZoomPanHelper();

  const [elements, setElements] = useState([]);

  useEffect(() => {
    const elementsForGraph = createGraphLayout(getElements(), isHorizontal);
    setElements(elementsForGraph);
    setTimeout(() => {
      resetView();
    }, 1);
  }, [data, getElements, isHorizontal, resetView]);

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
