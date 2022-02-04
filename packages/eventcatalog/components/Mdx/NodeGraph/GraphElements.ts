import type { Event, Service } from '@eventcatalog/types';

import { ArrowHeadType, XYPosition, Node, Edge } from 'react-flow-renderer';
import getConfig from 'next/config';

const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const minNodeWidth = 150;
const generateLink = (value, type) => (basePath !== '' ? `${basePath}/${type}/${value}` : `/${type}/${value}`);
const calcWidth = (value) => (value.length * 7 > minNodeWidth ? value.length * 7 : minNodeWidth);

/**
 * Builds a graph for a given event
 * @param {Event} - event
 * @param rootNodeColor - The color of the root node
 * @param isAnimated - whether to animate the graph
 */
export const getEventElements = (
  { name: eventName, producers, consumers }: Event,
  rootNodeColor = '#2563eb',
  isAnimated = true
) => {
  const position: XYPosition = { x: 0, y: 0 };

  const consumerColor = '#818cf8';
  const producerColor = '#75d7b6';

  const prodNames = producers.map((s) => calcWidth(s));
  const maxProdWidth = Math.max(...prodNames);
  const conNames = consumers.map((s) => calcWidth(s));
  const maxConWidth = Math.max(...conNames);

  // Transforms services & event into a graph model
  const prodNodes: Node[] = producers.map((node) => {
    const nodeWidth = calcWidth(node);
    return {
      id: `p-${node.replace(/ /g, '_')}`,
      data: {
        label: node,
        link: generateLink(node, 'services'),
        width: nodeWidth,
        maxWidth: maxProdWidth,
      },
      style: { border: `2px solid ${producerColor}`, width: nodeWidth },
      type: 'input',
      position,
    };
  });
  const conNodes: Node[] = consumers.map((node) => {
    const nodeWidth = calcWidth(node);
    return {
      id: `c-${node.replace(/ /g, '_')}`,
      data: {
        label: node,
        link: generateLink(node, 'services'),
        width: nodeWidth,
        maxWidth: maxConWidth,
      },
      style: { border: `2px solid ${consumerColor}`, width: calcWidth(node) },
      type: 'output',
      position,
    };
  });
  const eventNode: Node = {
    id: `e-${eventName.replace(/ /g, '_')}`,
    data: {
      label: eventName,
      link: generateLink(eventName, 'events'),
      width: calcWidth(eventName),
      maxWidth: calcWidth(eventName),
    },
    style: {
      border: `2px solid ${rootNodeColor}`,
      width: calcWidth(eventName),
    },
    position,
  };

  // Build connections
  const prodEdges: Edge[] = producers.map((node) => ({
    id: `epe-${node.replace(/ /g, '_')}`,
    source: `p-${node.replace(/ /g, '_')}`,
    target: `e-${eventName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));
  const conEdges: Edge[] = consumers.map((node) => ({
    id: `ece-${node.replace(/ /g, '_')}`,
    target: `c-${node.replace(/ /g, '_')}`,
    source: `e-${eventName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));

  // Merge nodes in order
  const elements: (Node | Edge)[] = [...prodNodes, eventNode, ...conNodes, ...prodEdges, ...conEdges];
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

  const pubNames = publishes.map((e) => calcWidth(e.name));
  const maxPubWidth = Math.max(...pubNames);
  const subNames = subscribes.map((e) => calcWidth(e.name));
  const maxSubWidth = Math.max(...subNames);

  // Transforms services & event into a graph model
  const pubNodes: Node[] = publishes.map((node) => {
    const nodeWidth = calcWidth(node.name);
    return {
      id: `p-${node.name.replace(/ /g, '_')}`,
      data: {
        label: node.name,
        link: generateLink(node.name, 'events'),
        width: nodeWidth,
        maxWidth: maxPubWidth,
      },
      style: { border: `2px solid ${publishColor}`, width: nodeWidth },
      type: 'output',
      position,
    };
  });
  const subNodes: Node[] = subscribes.map((node) => {
    const nodeWidth = calcWidth(node.name);
    const diff = maxSubWidth - nodeWidth;
    const nodeMaxWidth = diff !== 0 ? nodeWidth - diff : maxSubWidth;
    return {
      id: `s-${node.name.replace(/ /g, '_')}`,
      data: {
        label: node.name,
        link: generateLink(node.name, 'events'),
        width: nodeWidth,
        maxWidth: nodeMaxWidth,
      },
      style: {
        border: `2px solid ${subscribeColor}`,
        width: nodeWidth,
      },
      type: 'input',
      position,
    };
  });

  const serviceNode: Node = {
    id: `c-${serviceName.replace(/ /g, '_')}`,
    data: {
      label: serviceName,
      link: generateLink(serviceName, 'services'),
      width: calcWidth(serviceName),
      maxWidth: calcWidth(serviceName),
    },
    style: {
      border: `2px solid ${rootNodeColor}`,
      width: calcWidth(serviceName),
    },
    position,
  };

  // Build connections
  const pubEdges: Edge[] = publishes.map((node) => ({
    id: `ecp-${node.name.replace(/ /g, '_')}`,
    source: `c-${serviceName.replace(/ /g, '_')}`,
    target: `p-${node.name.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));
  const subEdges: Edge[] = subscribes.map((node) => ({
    id: `esc-${node.name.replace(/ /g, '_')}`,
    source: `s-${node.name.replace(/ /g, '_')}`,
    target: `c-${serviceName.replace(/ /g, '_')}`,
    type: 'smoothstep',
    arrowHeadType: ArrowHeadType.ArrowClosed,
    animated: isAnimated,
  }));

  // Merge nodes in order
  const elements: (Node | Edge)[] = [...subNodes, serviceNode, ...pubNodes, ...pubEdges, ...subEdges];
  return elements;
};
