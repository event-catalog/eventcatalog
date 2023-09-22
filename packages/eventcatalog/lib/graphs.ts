import type { Event, Service, Domain } from '@eventcatalog/types';
import getConfig from 'next/config';
import Mermaid from './mermaid';

const MAX_LENGTH_FOR_NODES = '50';
const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();

const node = (name, link) => ({
  id: truncateNode(name.replace(/ /g, '_')),
  name,
  link,
});
const truncateNode = (value) => (value.length > MAX_LENGTH_FOR_NODES ? `${value.substring(0, MAX_LENGTH_FOR_NODES)}...` : value);
const generateLink = (value, type, domain?) => {
  const url = `/${domain ? `domains/${domain}/` : ''}${type}/${value}`;
  return basePath ? `${basePath}${url}` : url;
};

/**
 * Build Mermaid graph output
 * @param centerNode
 * @param leftNodes
 * @param rightNodes
 * @param rootNodeColor
 */
const buildMermaid = (centerNode, leftNodes, rightNodes, rootNodeColor) => `flowchart LR\n
${leftNodes.map((node) => `l-${node.id}[${node.name}]:::producer-->${centerNode.id}[${centerNode.name}]:::event\n`).join('')}
classDef event stroke:${rootNodeColor},stroke-width: 4px;\n
classDef producer stroke:#75d7b6,stroke-width: 2px;\n
classDef consumer stroke:#818cf8,stroke-width: 2px;\n
${rightNodes.map((node) => `${centerNode.id}[${centerNode.name}]:::event-->r-${node.id}[${node.name}]:::consumer\n`).join('')}
${leftNodes.map((node) => `click l-${node.id} href "${node.link}" "Go to ${node.name}" _self\n`).join('')}
${rightNodes.map((node) => `click r-${node.id} href "${node.link}" "Go to ${node.name}" _self\n`).join('')}
click ${centerNode.id} href "${centerNode.link}" "Go to ${centerNode.name}" _self\n
`;

/**
 * Builds a graph for a given event
 * @param {Event} event
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildMermaidFlowChartForEvent = (
  { name: eventName, producerNames, consumerNames, producers = [], consumers = [], domain }: Event,
  rootNodeColor = '#2563eb'
): string => {
  const leftNodes = producerNames.map(truncateNode).map((node) => ({
    id: node.replace(/ /g, '_'),
    name: node,
    link: generateLink(node, 'services', producers.find((producer) => producer.name === node)?.domain),
  }));
  const rightNodes = consumerNames.map(truncateNode).map((node) => ({
    id: node.replace(/ /g, '_'),
    name: node,
    link: generateLink(node, 'services', consumers.find((consumer) => consumer.name === node)?.domain),
  }));
  const centerNode = {
    id: truncateNode(eventName.replace(/ /g, '_')),
    name: eventName,
    link: generateLink(eventName, 'events', domain),
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
  { publishes, subscribes, name: serviceName, domain }: Service,
  rootNodeColor = '#2563eb'
) => {
  // Transforms services & event into a graph model
  const leftNodes = subscribes
    .map((event) => ({ event, truncatedName: truncateNode(event.name) }))
    .map(({ event, truncatedName }) => ({
      id: truncatedName.replace(/ /g, '_'),
      name: truncatedName,
      link: generateLink(event.name, 'events', event.domain),
    }));
  const rightNodes = publishes
    .map((event) => ({ event, truncatedName: truncateNode(event.name) }))
    .map(({ event, truncatedName }) => ({
      id: truncatedName.replace(/ /g, '_'),
      name: truncatedName,
      link: generateLink(event.name, 'events', event.domain),
    }));
  const centerNode = {
    id: truncateNode(serviceName.replace(/ /g, '_')),
    name: serviceName,
    link: generateLink(serviceName, 'services', domain),
  };
  return buildMermaid(centerNode, leftNodes, rightNodes, rootNodeColor);
};

/**
 * Builds a graph for a given domain
 * @param {Domain} domain
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildMermaidFlowChartForDomain = (domain: Domain, rootNodeColor = '#2563eb'): string => {
  const builder = new Mermaid(rootNodeColor);

  domain.services.forEach((service) => {
    const serviceNode = node(service.name, generateLink(service.name, 'services', domain));

    service.subscribes.forEach((event) => {
      const eventNode = node(event.name, generateLink(event.name, 'events', event.domain));
      builder.addProducerFlow(eventNode, serviceNode);
    });
    service.publishes.forEach((event) => {
      const eventNode = node(event.name, generateLink(event.name, 'events', event.domain));
      builder.addConsumerFlow(serviceNode, eventNode);
    });
  });

  return builder.build();
};
