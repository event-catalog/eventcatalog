import { ArrowHeadType, XYPosition, Node, Edge } from 'react-flow-renderer';
import getConfig from 'next/config';
import type { Event, Service } from '@eventcatalog/types';
import CustomNode from './Node';

const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const MIN_NODE_WIDTH = 150;
type NODE_TYPES = 'service' | 'event';

const generateLink = (value, type, domain?) => `${basePath}/${domain ? `domains/${domain}/` : ''}${type}/${value}`;
const calcWidth = (value) => (value.length * 8 > MIN_NODE_WIDTH ? value.length * 8 : MIN_NODE_WIDTH);

const buildNodeEdge = ({ id, target, source, label, isAnimated = true }): Edge => ({
  id,
  target,
  source,
  type: 'smoothstep',
  arrowHeadType: ArrowHeadType.ArrowClosed,
  animated: isAnimated,
  label,
  labelBgPadding: [8, 4],
  labelBgBorderRadius: 4,
  labelStyle: { fontSize: '6px' },
  labelBgStyle: { fill: 'white', color: '#fff', fillOpacity: 0.5 },
});

const buildNodeData = ({
  name,
  label,
  type,
  maxWidth,
  renderInColumn,
  domain,
}: {
  name: string;
  label: string;
  type: NODE_TYPES;
  maxWidth?: number;
  renderInColumn?: number;
  domain?: string;
}) => {
  const width = calcWidth(label);
  const linkType = type === 'service' ? 'services' : 'events';

  const link = generateLink(name, linkType, domain);
  return { label, link, width, maxWidth, renderInColumn };
};

const getNodeLabel = ({ type, label, includeIcon }: { type: NODE_TYPES; label: any; includeIcon: boolean }) => {
  if (!includeIcon) return label;
  return <CustomNode type={type} label={label} />;
};

/**
 * Builds a graph for a given event
 * @param {Event} - event
 * @param rootNodeColor - The color of the root node
 * @param isAnimated - whether to animate the graph
 */
export const getEventElements = (
  { name: eventName, domain, consumers: eventConsumers = [], producers: eventProducers = [] }: Event,
  rootNodeColor = '#2563eb',
  isAnimated = true,
  includeLabels = false,
  includeNodeIcons = false
) => {
  const position: XYPosition = { x: 0, y: 0 };

  const consumerColor = '#818cf8';
  const producerColor = '#75d7b6';
  const nodeStyles = {
    fontSize: includeNodeIcons ? '8px' : 'auto',
  };

  const producersNames = eventProducers.map((s) => calcWidth(s.name));
  const maxProducersWidth = Math.max(...producersNames);
  const consumersNames = eventConsumers.map((s) => calcWidth(s.name));
  const maxConsumersWidth = Math.max(...consumersNames);

  const eventNameAsNodeID = `ev-${eventName.replace(/ /g, '_')}`;
  const eventNodeWidth = calcWidth(eventName);

  const producers = eventProducers.map((node) => ({
    label: node.name,
    id: `pr-${node.name.replace(/ /g, '_')}`,
    domain: node.domain,
  }));
  const consumers = eventConsumers.map((node) => ({
    label: node.name,
    id: `co-${node.name.replace(/ /g, '_')}`,
    domain: node.domain,
  }));

  // Transforms services & event into a graph model
  const producersNodes: Node[] = producers.map(({ label, id, domain: producerDomain }) => {
    const nodeWidth = calcWidth(label);
    const diff = maxProducersWidth - nodeWidth;
    const nodeMaxWidth = diff !== 0 ? nodeWidth - diff : maxProducersWidth;
    const labelToRender = getNodeLabel({ type: 'service', label, includeIcon: includeNodeIcons });
    return {
      id,
      data: buildNodeData({
        name: label,
        label: labelToRender,
        type: 'service',
        maxWidth: nodeMaxWidth,
        renderInColumn: 1,
        domain: producerDomain,
      }),
      style: { border: `2px solid ${producerColor}`, width: nodeWidth, ...nodeStyles },
      type: 'input',
      position,
    };
  });
  const consumersNodes: Node[] = consumers.map(({ id, label, domain: consumerDomain }) => {
    const width = calcWidth(label);
    const labelToRender = getNodeLabel({ type: 'service', label, includeIcon: includeNodeIcons });
    return {
      id,
      data: buildNodeData({
        name: label,
        label: labelToRender,
        type: 'service',
        maxWidth: maxConsumersWidth,
        renderInColumn: 3,
        domain: consumerDomain,
      }),
      style: { border: `2px solid ${consumerColor}`, width, ...nodeStyles },
      type: 'output',
      position,
    };
  });

  const eventNode: Node = {
    id: eventNameAsNodeID,
    data: buildNodeData({
      name: eventName,
      label: getNodeLabel({ type: 'event', label: eventName, includeIcon: includeNodeIcons }),
      type: 'event',
      maxWidth: eventNodeWidth,
      renderInColumn: 2,
      domain,
    }),
    style: {
      border: `2px solid ${rootNodeColor}`,
      width: eventNodeWidth,
      ...nodeStyles,
    },
    position,
  };

  // Build connections
  const producersEdges: Edge[] = producers.map(({ id, label }) =>
    buildNodeEdge({
      id: `epe-${label.replace(/ /g, '_')}-${eventNameAsNodeID}`,
      source: id,
      target: eventNameAsNodeID,
      isAnimated,
      label: includeLabels ? 'publishes' : '',
    })
  );
  const consumersEdges: Edge[] = consumers.map(({ id, label }) =>
    buildNodeEdge({
      id: `ece-${label.replace(/ /g, '_')}-${eventNameAsNodeID}`,
      target: id,
      source: eventNameAsNodeID,
      isAnimated,
      label: includeLabels ? 'subscribed by' : '',
    })
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
  { publishes, subscribes, name: serviceName, domain }: Service,
  rootNodeColor = '#2563eb',
  isAnimated = true,
  includeEdgeLabels = false,
  includeNodeIcons = false
) => {
  const position: XYPosition = { x: 0, y: 0 };

  const publishColor = '#818cf8';
  const subscribeColor = '#75d7b6';
  const nodeStyles = {
    fontSize: includeNodeIcons ? '8px' : 'auto',
  };

  const publishesNames = publishes.map((e) => calcWidth(e.name));
  const maxPublishesWidth = Math.max(...publishesNames);
  const subscribesNames = subscribes.map((e) => calcWidth(e.name));
  const maxSubscribesWidth = Math.max(...subscribesNames);

  const serviceNameAsNodeID = `ser-${serviceName.replace(/ /g, '_')}`;

  // Transforms services & event into a graph model
  const publishesNodes: Node[] = publishes.map((node) => {
    const nodeWidth = calcWidth(node.name);
    const labelToRender = getNodeLabel({ type: 'event', label: node.name, includeIcon: includeNodeIcons });
    return {
      id: `pub-${node.name.replace(/ /g, '_')}`,
      data: buildNodeData({
        name: node.name,
        label: labelToRender,
        type: 'event',
        maxWidth: maxPublishesWidth,
        renderInColumn: 3,
        domain: node.domain,
      }),
      style: { border: `2px solid ${publishColor}`, width: nodeWidth, ...nodeStyles },
      type: 'output',
      position,
    };
  });
  const subscribesNodes: Node[] = subscribes.map((node) => {
    const nodeWidth = calcWidth(node.name);
    const diff = maxSubscribesWidth - nodeWidth;
    const nodeMaxWidth = diff !== 0 ? nodeWidth - diff : maxSubscribesWidth;
    const labelToRender = getNodeLabel({ type: 'event', label: node.name, includeIcon: includeNodeIcons });
    return {
      id: `sub-${node.name.replace(/ /g, '_')}`,
      data: buildNodeData({
        name: node.name,
        label: labelToRender,
        type: 'event',
        maxWidth: nodeMaxWidth,
        ...nodeStyles,
        renderInColumn: 1,
        domain: node.domain,
      }),
      style: {
        border: `2px solid ${subscribeColor}`,
        width: nodeWidth,
        ...nodeStyles,
      },
      type: 'input',
      position,
    };
  });

  const serviceNode: Node = {
    id: serviceNameAsNodeID,
    data: buildNodeData({
      name: serviceName,
      label: getNodeLabel({ type: 'service', label: serviceName, includeIcon: includeNodeIcons }),
      type: 'service',
      maxWidth: calcWidth(serviceName),
      renderInColumn: 2,
      domain,
    }),
    style: {
      border: `2px solid ${rootNodeColor}`,
      width: calcWidth(serviceName),
      ...nodeStyles,
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
      label: includeEdgeLabels ? 'publishes' : '',
    })
  );

  const subscribesEdges: Edge[] = subscribes.map((node) =>
    buildNodeEdge({
      id: `esc-${node.name.replace(/ /g, '_')}`,
      target: serviceNameAsNodeID,
      source: `sub-${node.name.replace(/ /g, '_')}`,
      isAnimated,
      label: includeEdgeLabels ? 'subscribed by' : '',
    })
  );

  // Merge nodes in order
  const elements: (Node | Edge)[] = [...subscribesNodes, serviceNode, ...publishesNodes, ...publishesEdges, ...subscribesEdges];
  return elements;
};
