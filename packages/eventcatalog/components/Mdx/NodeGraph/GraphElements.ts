import { ArrowHeadType, XYPosition, Node, Edge } from 'react-flow-renderer';
import getConfig from 'next/config';
import type { Event, Service } from '@eventcatalog/types';

const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const MIN_NODE_WIDTH = 150;
const generateLink = (value, type) => (basePath !== '' ? `${basePath}/${type}/${value}` : `/${type}/${value}`);
const calcWidth = (value) => (value.length * 8 > MIN_NODE_WIDTH ? value.length * 8 : MIN_NODE_WIDTH);

const buildNodeEdge = ({ id, target, source, isAnimated = true }) => ({
  id,
  target,
  source,
  type: 'smoothstep',
  arrowHeadType: ArrowHeadType.ArrowClosed,
  animated: isAnimated,
});

const buildNodeData = ({ label, type, maxWidth }: { label: string; type: 'service' | 'event'; maxWidth?: number }) => {
  const width = calcWidth(label);
  const linkType = type === 'service' ? 'services' : 'events';
  const link = generateLink(label, linkType);
  return { label, link, width, maxWidth };
};

/**
 * Builds a graph for a given event
 * @param {Event} - event
 * @param rootNodeColor - The color of the root node
 * @param isAnimated - whether to animate the graph
 */
export const getEventElements = (
  { name: eventName, producers: eventProducers, consumers: eventConsumers }: Event,
  rootNodeColor = '#2563eb',
  isAnimated = true
) => {
  const position: XYPosition = { x: 0, y: 0 };

  const consumerColor = '#818cf8';
  const producerColor = '#75d7b6';

  const producersNames = eventProducers.map((s) => calcWidth(s));
  const maxProducersWidth = Math.max(...producersNames);
  const consumersNames = eventConsumers.map((s) => calcWidth(s));
  const maxConsumersWidth = Math.max(...consumersNames);

  const eventNameAsNodeID = `ev-${eventName.replace(/ /g, '_')}`;
  const eventNodeWidth = calcWidth(eventName);

  const producers = eventProducers.map((node) => ({ label: node, id: `pr-${node.replace(/ /g, '_')}` }));
  const consumers = eventConsumers.map((node) => ({ label: node, id: `co-${node.replace(/ /g, '_')}` }));

  // Transforms services & event into a graph model
  const producersNodes: Node[] = producers.map(({ label, id }) => {
    const nodeWidth = calcWidth(label);
    const diff = maxProducersWidth - nodeWidth;
    const nodeMaxWidth = diff !== 0 ? nodeWidth - diff : maxProducersWidth;
    return {
      id,
      data: buildNodeData({ label, type: 'service', maxWidth: nodeMaxWidth }),
      style: { border: `2px solid ${producerColor}`, width: nodeWidth },
      type: 'input',
      position,
    };
  });
  const consumersNodes: Node[] = consumers.map(({ id, label }) => {
    const width = calcWidth(label);
    return {
      id,
      data: buildNodeData({ label, type: 'service', maxWidth: maxConsumersWidth }),
      style: { border: `2px solid ${consumerColor}`, width },
      type: 'output',
      position,
    };
  });
  const eventNode: Node = {
    id: eventNameAsNodeID,
    data: buildNodeData({ label: eventName, type: 'event', maxWidth: eventNodeWidth }),
    style: {
      border: `2px solid ${rootNodeColor}`,
      width: eventNodeWidth,
    },
    position,
  };

  // Build connections
  const producersEdges: Edge[] = producers.map(({ id, label }) =>
    buildNodeEdge({ id: `epe-${label.replace(/ /g, '_')}`, source: id, target: eventNameAsNodeID, isAnimated })
  );
  const consumersEdges: Edge[] = consumers.map(({ id, label }) =>
    buildNodeEdge({ id: `ece-${label.replace(/ /g, '_')}`, target: id, source: eventNameAsNodeID, isAnimated })
  );

  // Merge nodes in order
  const elements: (Node | Edge)[] = [...producersNodes, eventNode, ...consumersNodes, ...producersEdges, ...consumersEdges];
  return elements;
};

/**
 * Builds a graph for a given service
 * @param {Service} service
 * @param {string} rootNodeColor of the root node
 * @param isAnimated whether the graph should be animated
 * @returns {string} Mermaid Graph
 */
export const getServiceElements = (
  { publishes, subscribes, name: serviceName }: Service,
  rootNodeColor = '#2563eb',
  isAnimated = true
) => {
  const position: XYPosition = { x: 0, y: 0 };

  const publishColor = '#818cf8';
  const subscribeColor = '#75d7b6';

  const publishesNames = publishes.map((e) => calcWidth(e.name));
  const maxPublishesWidth = Math.max(...publishesNames);
  const subscribesNames = subscribes.map((e) => calcWidth(e.name));
  const maxSubscribesWidth = Math.max(...subscribesNames);

  const serviceNameAsNodeID = `ser-${serviceName.replace(/ /g, '_')}`;

  // Transforms services & event into a graph model
  const publishesNodes: Node[] = publishes.map((node) => {
    const nodeWidth = calcWidth(node.name);
    return {
      id: `pub-${node.name.replace(/ /g, '_')}`,
      data: buildNodeData({ label: node.name, type: 'event', maxWidth: maxPublishesWidth }),
      style: { border: `2px solid ${publishColor}`, width: nodeWidth },
      type: 'output',
      position,
    };
  });
  const subscribesNodes: Node[] = subscribes.map((node) => {
    const nodeWidth = calcWidth(node.name);
    const diff = maxSubscribesWidth - nodeWidth;
    const nodeMaxWidth = diff !== 0 ? nodeWidth - diff : maxSubscribesWidth;
    return {
      id: `sub-${node.name.replace(/ /g, '_')}`,
      data: buildNodeData({ label: node.name, type: 'event', maxWidth: nodeMaxWidth }),
      style: {
        border: `2px solid ${subscribeColor}`,
        width: nodeWidth,
      },
      type: 'input',
      position,
    };
  });

  const serviceNode: Node = {
    id: serviceNameAsNodeID,
    data: buildNodeData({ label: serviceName, type: 'service', maxWidth: calcWidth(serviceName) }),
    style: {
      border: `2px solid ${rootNodeColor}`,
      width: calcWidth(serviceName),
    },
    position,
  };

  // Build connections
  const publishesEdges: Edge[] = publishes.map((node) =>
    buildNodeEdge({
      id: `ecp-${node.name.replace(/ /g, '_')}`,
      source: serviceNameAsNodeID,
      target: `pub-${node.name.replace(/ /g, '_')}`,
      isAnimated,
    })
  );

  const subscribesEdges: Edge[] = subscribes.map((node) =>
    buildNodeEdge({
      id: `esc-${node.name.replace(/ /g, '_')}`,
      target: serviceNameAsNodeID,
      source: `sub-${node.name.replace(/ /g, '_')}`,
      isAnimated,
    })
  );

  // Merge nodes in order
  const elements: (Node | Edge)[] = [...subscribesNodes, serviceNode, ...publishesNodes, ...publishesEdges, ...subscribesEdges];
  return elements;
};
