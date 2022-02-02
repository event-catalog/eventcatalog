import type { Event, Service } from '@eventcatalog/types';

import { XYPosition } from 'react-flow-renderer';
import getConfig from 'next/config';

const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const generateLink = (value, type) => (basePath !== '' ? `${basePath}/${type}/${value}` : `/${type}/${value}`);

/**
 * Builds a graph for a given event
 * @param {Event} event
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildReactFlowForEvent = ({ name: eventName, producers, consumers }: Event, rootNodeColor = '#2563eb') => {
  const position: XYPosition = { x: 0, y: 0 };

  const consumerColor = '#818cf8';
  const producerColor = '#75d7b6';

  // Transforms services & event into a graph model
  const leftNodes = producers.map((node) => ({
    id: node.replace(/ /g, '_'),
    data: { label: node, link: generateLink(node, 'services') },
    style: { border: `2px solid ${producerColor}` },
    type: 'input',
    position,
  }));
  const rightNodes = consumers.map((node) => ({
    id: node.replace(/ /g, '_'),
    data: { label: node, link: generateLink(node, 'services') },
    style: { border: `2px solid ${consumerColor}` },
    type: 'output',
    position,
  }));
  const centerNode = {
    id: eventName.replace(/ /g, '_'),
    data: { label: eventName, link: generateLink(eventName, 'events') },
    style: { border: `2px solid ${rootNodeColor}` },
    position,
  };

  // Build connections
  const connectionsLeft = producers.map((node) => ({
    id: `e${node.replace(/ /g, '_')}`,
    source: node.replace(/ /g, '_'),
    target: eventName.replace(/ /g, '_'),
    type: 'smoothstep',
    animated: true,
  }));
  const connectionsRightt = consumers.map((node) => ({
    id: `e${node.replace(/ /g, '_')}`,
    target: node.replace(/ /g, '_'),
    source: eventName.replace(/ /g, '_'),
    type: 'smoothstep',
    animated: true,
  }));

  // Merge nodes in order
  const elements = [...leftNodes, centerNode, ...rightNodes, ...connectionsLeft, ...connectionsRightt];

  return elements;
};

/**
 * Builds a graph for a given service
 * @param {Service} service
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildReactFlowForService = ({ publishes, subscribes, name: serviceName }: Service, rootNodeColor = '#2563eb') => {
  const position: XYPosition = { x: 0, y: 0 };

  const publishColor = '#818cf8';
  const subscribeColor = '#75d7b6';

  // Transforms services & event into a graph model
  const leftNodes = publishes.map((node) => ({
    id: node.name.replace(/ /g, '_'),
    data: { label: node.name, link: generateLink(node.name, 'events') },
    style: { border: `2px solid ${publishColor}` },
    type: 'input',
    position,
  }));
  const rightNodes = subscribes.map((node) => ({
    id: node.name.replace(/ /g, '_'),
    data: { label: node.name, link: generateLink(node.name, 'events') },
    style: { border: `2px solid ${subscribeColor}` },
    type: 'output',
    position,
  }));
  const centerNode = {
    id: serviceName.replace(/ /g, '_'),
    data: { label: serviceName, link: generateLink(serviceName, 'services') },
    style: { border: `2px solid ${rootNodeColor}` },
    position,
  };

  // Build connections
  const connectionsLeft = publishes.map((node) => ({
    id: `e${node.name.replace(/ /g, '_')}`,
    source: node.name.replace(/ /g, '_'),
    target: serviceName.replace(/ /g, '_'),
    type: 'smoothstep',
    animated: true,
  }));
  const connectionsRightt = subscribes.map((node) => ({
    id: `e${node.name.replace(/ /g, '_')}`,
    target: node.name.replace(/ /g, '_'),
    source: serviceName.replace(/ /g, '_'),
    type: 'smoothstep',
    animated: true,
  }));

  // Merge nodes in order
  const elements = [...leftNodes, centerNode, ...rightNodes, ...connectionsLeft, ...connectionsRightt];

  return elements;
};
