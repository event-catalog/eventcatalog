import type { Event, Service, Domain } from '@eventcatalog/types';
import getConfig from 'next/config';
import Mermaid from './mermaid';

const MAX_LENGTH_FOR_NODES = '50';
const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();


const node = (name, link) => {
  return {
    id: truncateNode(name.replace(/ /g, '_')),
    name: name,
    link: link
  }
}
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
): String => {
  // Transforms services & event into a graph model
  const centerNode = node(eventName, generateLink(eventName, 'events', domain))
  const leftNodes = producerNames
    .map((producer) => node(producer, generateLink(producer, 'services', producers.find((item) => item.name === producer)?.domain)))
  const rightNodes = consumerNames
    .map((consumer) => node(consumer, generateLink(consumer, 'services', consumers.find((item) => item.name === consumer)?.domain)))

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
  const builder = new Mermaid(rootNodeColor);

  const centerNode = node(serviceName, generateLink(serviceName, 'services', domain))
  subscribes
    .map((event) => {
      builder.addProducerFlow(node(event.name, generateLink(event.name, 'events', event.domain)), centerNode)
    })
  publishes
    .map((event) => {
      builder.addConsumerFlow(centerNode, node(event.name, generateLink(event.name, 'events', event.domain)))
    })
  
  return builder.build();
};

/**
 * Builds a graph for a given domain
 * @param {Domain} domain
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildMermaidFlowChartForDomain = (
  domain: Domain,
  rootNodeColor = '#2563eb'
): String => {
  const builder = new Mermaid(rootNodeColor);

  domain.services
    .map((service) => {
      const serviceNode = node(service.name, generateLink(service.name, 'services', domain))

      service.subscribes
        .map((event) => {
          const eventNode = node(event.name, generateLink(event.name, 'events', event.domain))
          builder.addProducerFlow(eventNode, serviceNode)
        })
      service.publishes
        .map((event) => {
          const eventNode = node(event.name, generateLink(event.name, 'events', event.domain))
          builder.addConsumerFlow(serviceNode, eventNode)
        })
    })


  return builder.build()
}