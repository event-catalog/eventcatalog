import type { Event, Service } from '@eventcatalog/types';

import { ArrowHeadType, XYPosition } from 'react-flow-renderer';
import getConfig from 'next/config';

import { Node, Edge } from 'react-flow-renderer';

const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const generateLink = (value, type) => (basePath !== '' ? `${basePath}/${type}/${value}` : `/${type}/${value}`);
const calcWidth = (value) => (value.length > 15 ? value.length * 8 : 150);

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
  const leftNodes: Node[] = producers.map((node) => ({
    id: `l-${node.replace(/ /g, '_')}`,
    data: { label: node, link: generateLink(node, 'services'), width: calcWidth(node) },
    style: { border: `2px solid ${producerColor}`, width: calcWidth(node) },
    type: 'input',
    position,
  }));
  const rightNodes: Node[] = consumers.map((node) => ({
    id: `r-${node.replace(/ /g, '_')}`,
    data: { label: node, link: generateLink(node, 'services'), width: calcWidth(node) },
    style: { border: `2px solid ${consumerColor}`, width: calcWidth(node) },
    type: 'output',
    position,
  }));
  const centerNode: Node = {
    id: `c-${eventName.replace(/ /g, '_')}`,
    data: { label: eventName, link: generateLink(eventName, 'events'), width: calcWidth(eventName) },
    style: { border: `2px solid ${rootNodeColor}`, width: calcWidth(eventName) },
    position,
  };

  // Build connections
  const edgesLeft: Edge[] = producers.map((node) => ({
    id: `el-${node.replace(/ /g, '_')}`,
    source: `l-${node.replace(/ /g, '_')}`,
    target: `c-${eventName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));
  const edgesRight: Edge[] = consumers.map((node) => ({
    id: `er-${node.replace(/ /g, '_')}`,
    target: `r-${node.replace(/ /g, '_')}`,
    source: `c-${eventName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));

  // Merge nodes in order
  const elements: (Node | Edge)[] = [...leftNodes, centerNode, ...rightNodes, ...edgesLeft, ...edgesRight];
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
  const leftNodes: Node[] = publishes.map((node) => ({
    id: `l-${node.name.replace(/ /g, '_')}`,
    data: { label: node.name, link: generateLink(node.name, 'events'), width: calcWidth(node.name) },
    style: { border: `2px solid ${publishColor}`, width: calcWidth(node.name) },
    type: 'output',
    position,
  }));
  const rightNodes: Node[] = subscribes.map((node) => ({
    id: `r-${node.name.replace(/ /g, '_')}`,
    data: { label: node.name, link: generateLink(node.name, 'events') },
    style: { border: `2px solid ${subscribeColor}` },
    type: 'input',
    position,
  }));
  const centerNode: Node = {
    id: `c-${serviceName.replace(/ /g, '_')}`,
    data: { label: serviceName, link: generateLink(serviceName, 'services') },
    style: { border: `2px solid ${rootNodeColor}` },
    position,
  };

  // Build connections
  const edgesLeft: Edge[] = publishes.map((node) => ({
    id: `el-${node.name.replace(/ /g, '_')}`,
    target: `l-${node.name.replace(/ /g, '_')}`,
    source: `c-${serviceName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));
  const edgesRight: Edge[] = subscribes.map((node) => ({
    id: `er-${node.name.replace(/ /g, '_')}`,
    source: `r-${node.name.replace(/ /g, '_')}`,
    target: `c-${serviceName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));

  // Merge nodes in order
  const elements: (Node | Edge)[] = [...leftNodes, centerNode, ...rightNodes, ...edgesLeft, ...edgesRight];
  return elements;
};
