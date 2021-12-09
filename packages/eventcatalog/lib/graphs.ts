import type { Event, Service } from '@eventcatalogtest/types';

const buildMermaid = (centerNode, leftNodes, rightNodes, rootNodeColor) => {
  // mermaid does not work with spaces in nodes
  const removeSpacesInNames = (nodes) => nodes.map((node) => node.replace(/ /g, '_'));
  const lNodes = removeSpacesInNames(leftNodes);
  const rNodes = removeSpacesInNames(rightNodes);
  const nodeValue = centerNode.replace(/ /g, '_');

  return `flowchart LR
${lNodes.map((node) => `${node}:::producer-->${nodeValue}:::event\n`).join('')}
classDef event stroke:${rootNodeColor},stroke-width: 4px;
classDef producer stroke:#75d7b6,stroke-width: 2px;
classDef consumer stroke:#818cf8,stroke-width: 2px;
${rNodes.map((node) => `${nodeValue}:::event-->${node}:::consumer\n`).join('')}
  `;
};

export const buildMermaidFlowChartForEvent = (
  { name: eventName, producers, consumers }: Event,
  rootNodeColor = '#2563eb'
) => buildMermaid(eventName, producers, consumers, rootNodeColor);

export const buildMermaidFlowChartForService = (
  { publishes, subscribes, name: serviceName }: Service,
  rootNodeColor = '#2563eb'
) =>
  buildMermaid(
    serviceName,
    subscribes.map((s) => s.name),
    publishes.map((p) => p.name),
    rootNodeColor
  );
