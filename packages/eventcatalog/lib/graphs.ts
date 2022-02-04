import type { Event, Service } from '@eventcatalog/types';
import getConfig from 'next/config';

const MAX_LENGTH_FOR_NODES = '50';
const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const truncateNode = (value) => (value.length > MAX_LENGTH_FOR_NODES ? `${value.substring(0, MAX_LENGTH_FOR_NODES)}...` : value);
const generateLink = (value, type) => (basePath !== '' ? `${basePath}/${type}/${value}` : `/${type}/${value}`);

/**
 * Build Mermaid graph output
 * @param centerNode
 * @param leftNodes
 * @param rightNodes
 * @param rootNodeColor
 */
const buildMermaid = (centerNode, leftNodes, rightNodes, rootNodeColor) => `flowchart LR\n
${leftNodes.map((node) => `${node.id}[${node.name}]:::producer-->${centerNode.id}[${centerNode.name}]:::event\n`).join('')}
classDef event stroke:${rootNodeColor},stroke-width: 4px;\n
classDef producer stroke:#75d7b6,stroke-width: 2px;\n
classDef consumer stroke:#818cf8,stroke-width: 2px;\n
${rightNodes.map((node) => `${centerNode.id}[${centerNode.name}]:::event-->${node.id}[${node.name}]:::consumer\n`).join('')}
${leftNodes.map((node) => `click ${node.id} href "${node.link}" "Go to ${node.name}" _self\n`).join('')}
${rightNodes.map((node) => `click ${node.id} href "${node.link}" "Go to ${node.name}" _self\n`).join('')}
click ${centerNode.id} href "${centerNode.link}" "Go to ${centerNode.name}" _self\n
`;

/**
 * Builds a graph for a given event
 * @param {Event} event
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildMermaidFlowChartForEvent = ({ name: eventName, producers, consumers }: Event, rootNodeColor = '#2563eb') => {
  // Transforms services & event into a graph model
  const leftNodes = producers.map(truncateNode).map((node) => ({
    id: node.replace(/ /g, '_'),
    name: node,
    link: generateLink(node, 'services'),
  }));
  const rightNodes = consumers.map(truncateNode).map((node) => ({
    id: node.replace(/ /g, '_'),
    name: node,
    link: generateLink(node, 'services'),
  }));
  const centerNode = {
    id: truncateNode(eventName.replace(/ /g, '_')),
    name: eventName,
    link: generateLink(eventName, 'events'),
  };

  return buildMermaid(centerNode, leftNodes, rightNodes, rootNodeColor);
};

/**
 * Builds a graph for a given service
 * @param {Service} service
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildMermaidFlowChartForService = (
  { publishes, subscribes, name: serviceName }: Service,
  rootNodeColor = '#2563eb'
) => {
  // Transforms services & event into a graph model
  const leftNodes = subscribes.map(truncateNode).map((node) => ({
    id: node.name.replace(/ /g, '_'),
    name: node.name,
    link: generateLink(node.name, 'events'),
  }));
  const rightNodes = publishes.map(truncateNode).map((node) => ({
    id: node.name.replace(/ /g, '_'),
    name: node.name,
    link: generateLink(node.name, 'events'),
  }));
  const centerNode = {
    id: truncateNode(serviceName.replace(/ /g, '_')),
    name: serviceName,
    link: generateLink(serviceName, 'services'),
  };
  return buildMermaid(centerNode, leftNodes, rightNodes, rootNodeColor);
};
