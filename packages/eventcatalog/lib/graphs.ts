import type { Event, Service } from '@eventcatalogtest/types';

export const buildMermaidFlowChart = ({ name, producers, consumers }: Event, rootNodeColor: string = '#2563eb') => {
  const producerNames = producers.map((producer) => producer.replace(' ', '_'))
  const consumerNames = consumers.map((consumer) => consumer.replace(' ', '_'))
  return `flowchart LR
${producerNames.map((producer) => `${producer}:::producer-->${name}:::event\n`).join('')}
classDef event stroke:${rootNodeColor},stroke-width: 4px;
classDef producer stroke:#75d7b6,stroke-width: 2px;
classDef consumer stroke:#818cf8,stroke-width: 2px;
${consumerNames.map((consumer) => `${name}:::event-->${consumer}:::consumer\n`).join('')}
  `
}

export const buildMermaidFlowChartForService = ({ publishes, subscribes, name}: Service, rootNodeColor: string = '#2563eb') => {
  const producerNames = publishes.map((event) => event.name.replace(' ', '_'))
  const consumerNames = subscribes.map((event) =>
    event.name.replace(' ', '_')
  )
  const nodeName = name.replace(' ', '_')

  return `flowchart LR
${consumerNames.map((consumer) => `${consumer}:::producer-->${nodeName}:::event\n`).join('')}
classDef event stroke:${rootNodeColor},stroke-width: 2px;
classDef producer stroke:#75d7b6,stroke-width: 2px;
classDef consumer stroke:#818cf8,stroke-width: 2px;
${producerNames.map((producer) => `${nodeName}:::event-->${producer}:::consumer\n`).join('')}
  `
}
