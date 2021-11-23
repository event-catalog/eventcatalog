import { Event, Service } from '@/types/index'

export const buildMermaidFlowChart = ({ name, producers, consumers }: Event) => {
  const producerNames = producers.map((producer) => producer.replace(' ', '_'))
  const consumerNames = consumers.map((consumer) => consumer.replace(' ', '_'))
  return `flowchart LR
${producerNames.map((producer) => `${producer}:::producer-->${name}:::event\n`).join('')}
classDef event fill:#2563eb,color:white;
classDef producer stroke:#75d7b6,stroke-width: 2px;
classDef consumer stroke:#818cf8,stroke-width: 2px;
${consumerNames.map((consumer) => `${name}:::event-->${consumer}:::consumer\n`).join('')}
  `
}

export const buildMermaidFlowChartForService = ({ listOfEventsServicePublishes, listOfEventsServiceSubscribesTo, name}: Service) => {
  const producerNames = listOfEventsServicePublishes.map((producer) => producer.replace(' ', '_'))
  const consumerNames = listOfEventsServiceSubscribesTo.map((consumer) =>
    consumer.replace(' ', '_')
  )
  const nodeName = name.replace(' ', '_')

  return `flowchart LR
${consumerNames.map((consumer) => `${consumer}:::producer-->${nodeName}:::event\n`).join('')}
classDef event fill:#2563eb,color:white;
classDef producer stroke:#75d7b6,stroke-width: 2px;
classDef consumer stroke:#818cf8,stroke-width: 2px;
${producerNames.map((producer) => `${nodeName}:::event-->${producer}:::consumer\n`).join('')}
  `
}
