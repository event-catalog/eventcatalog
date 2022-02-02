import type { Event, Service } from '@eventcatalog/types';

import { XYPosition } from 'react-flow-renderer';
import getConfig from 'next/config';

const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const generateLink = (value, type) => (basePath !== '' ? `${basePath}/${type}/${value}` : `/${type}/${value}`);

/**
 * Builds a graph for a given event
 * @param eventName
 * @param producers
 * @param consumers
 * @param rootNodeColor
 * @param isAnimated
 */
export const buildReactFlowForEvent = (
  { name: eventName, producers, consumers }: Event,
  rootNodeColor = '#2563eb',
  isAnimated = true
) => {
  const position: XYPosition = { x: 0, y: 0 };

  const consumerColor = '#818cf8';
  const producerColor = '#75d7b6';

  // Transforms services & event into a graph model
  const leftNodes = producers.map((node) => ({
    id: `l-${node.replace(/ /g, '_')}`,
    data: { label: node, link: generateLink(node, 'services') },
    style: { border: `2px solid ${producerColor}` },
    type: 'input',
    position,
  }));
  const rightNodes = consumers.map((node) => ({
    id: `r-${node.replace(/ /g, '_')}`,
    data: { label: node, link: generateLink(node, 'services') },
    style: { border: `2px solid ${consumerColor}` },
    type: 'output',
    position,
  }));
  const centerNode = {
    id: `c-${eventName.replace(/ /g, '_')}`,
    data: { label: eventName, link: generateLink(eventName, 'events') },
    style: { border: `2px solid ${rootNodeColor}` },
    position,
  };

  // Build connections
  const connectionsLeft = producers.map((node) => ({
    id: `el-${node.replace(/ /g, '_')}`,
    source: `l-${node.replace(/ /g, '_')}`,
    target: `c-${eventName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: 'arrowclosed',
    animated: isAnimated,
  }));
  const connectionsRight = consumers.map((node) => ({
    id: `er-${node.replace(/ /g, '_')}`,
    target: `r-${node.replace(/ /g, '_')}`,
    source: `c-${eventName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: 'arrowclosed',
    animated: isAnimated,
  }));

  // Merge nodes in order
  const elements = [...leftNodes, centerNode, ...rightNodes, ...connectionsLeft, ...connectionsRight];

  return elements;
};

/**
 * Builds a graph for a given service
 * @param {Service} service
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildReactFlowForService = (
  { publishes, subscribes, name: serviceName }: Service,
  rootNodeColor = '#2563eb',
  isAnimated = true
) => {
  const position: XYPosition = { x: 0, y: 0 };

  const publishColor = '#818cf8';
  const subscribeColor = '#75d7b6';

  // Transforms services & event into a graph model
  const leftNodes = publishes.map((node) => ({
    id: `l-${node.name.replace(/ /g, '_')}`,
    data: { label: node.name, link: generateLink(node.name, 'events') },
    style: { border: `2px solid ${publishColor}` },
    type: 'output',
    position,
  }));
  const rightNodes = subscribes.map((node) => ({
    id: `r-${node.name.replace(/ /g, '_')}`,
    data: { label: node.name, link: generateLink(node.name, 'events') },
    style: { border: `2px solid ${subscribeColor}` },
    type: 'input',
    position,
  }));
  const centerNode = {
    id: `c-${serviceName.replace(/ /g, '_')}`,
    data: { label: serviceName, link: generateLink(serviceName, 'services') },
    style: { border: `2px solid ${rootNodeColor}` },
    position,
  };

  // Build connections
  const connectionsLeft = publishes.map((node) => ({
    id: `el-${node.name.replace(/ /g, '_')}`,
    target: `l-${node.name.replace(/ /g, '_')}`,
    source: `c-${serviceName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: 'arrowclosed',
    animated: isAnimated,
  }));
  const connectionsRight = subscribes.map((node) => ({
    id: `er-${node.name.replace(/ /g, '_')}`,
    source: `r-${node.name.replace(/ /g, '_')}`,
    target: `c-${serviceName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: 'arrowclosed',
    animated: isAnimated,
  }));

  // Merge nodes in order
  const elements = [...leftNodes, centerNode, ...rightNodes, ...connectionsLeft, ...connectionsRight];

  return elements;
};
