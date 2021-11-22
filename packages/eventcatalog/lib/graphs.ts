export const buildMermaidFlowChart = (event, producers = [], consumers = []) => {
  const producerNames = producers.map((producer) => producer.id.replace(' ', '_'))
  const consumerNames = consumers.map((consumer) => consumer.id.replace(' ', '_'))
  return `flowchart LR
${producerNames.map((producer) => `${producer}-->${event}\n`).join('')}
${consumerNames.map((consumer) => `${event}-->${consumer}\n`).join('')}
  `
}
