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
 * Builds a graph for a given event
 * @param {Event} event
 * @param {string} rootNodeColor of the root node
 * @returns {string} Mermaid Graph
 */
export const buildMermaidFlowChartForEvent = (
  { name: eventName, producerNames, consumerNames, producers = [], consumers = [], domain }: Event,
  rootNodeColor = '#2563eb'
): string => {
  const builder = new Mermaid(rootNodeColor);

  const centerNode = node(eventName, generateLink(eventName, 'events', domain));
  producerNames.forEach((producer) => {
    const eventNode = node(
      producer,
      generateLink(producer, 'services', producers.find((item) => item.name === producer)?.domain)
    );
    builder.addProducerFlow(eventNode, centerNode);
  });
  consumerNames.forEach((consumer) => {
    const eventNode = node(
      consumer,
      generateLink(consumer, 'services', consumers.find((item) => item.name === consumer)?.domain)
    );
    builder.addConsumerFlow(centerNode, eventNode);
  });

  return builder.build();
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

  const centerNode = node(serviceName, generateLink(serviceName, 'services', domain));
  subscribes.forEach((event) => {
    const eventNode = node(event.name, generateLink(event.name, 'events', event.domain));
    builder.addProducerFlow(eventNode, centerNode);
  });
  publishes.forEach((event) => {
    const eventNode = node(event.name, generateLink(event.name, 'events', event.domain));
    builder.addConsumerFlow(centerNode, eventNode);
  });

  return builder.build();
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
