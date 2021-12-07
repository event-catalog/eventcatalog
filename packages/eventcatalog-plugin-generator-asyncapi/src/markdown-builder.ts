import YAML from 'yamljs'
import json2md from 'json2md'
import { Event, Service } from '@eventcatalogtest/types'

export const buildEventMarkdownFile = (event: Event) => {
  const customJSON2MD = (json2md.converters.mermaid = function (render) {
    return render ? '<Mermaid />' : ''
  })

  const content = [{ h1: event.name, mermaid: true }]

  return `---
${YAML.stringify(event)}---
${customJSON2MD(content)}`
}

export const buildServiceMarkdownFile = (service: Service) => {
  const customJSON2MD = (json2md.converters.mermaid = function (render) {
    return render ? '<Mermaid />' : ''
  })

  const content = [{ h1: service.name, mermaid: true }]

  return `---
${YAML.stringify(service)}---
${customJSON2MD(content)}`
}
