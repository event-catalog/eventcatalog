import YAML from 'yamljs'
import json2md from 'json2md'

interface Producer {
  id: string
}

interface Consumer {
  id: string
}

interface Person {
  id: string
}

interface Event {
  name: string
  version: string
  draft?: boolean
  summary?: string
  producers?: [Producer]
  consumers?: [Consumer]
  owners?: [Person]
  examples?: any
  schema?: any
}

export const buildEventMarkdownFile = (event: Event) => {
  const customJSON2MD = (json2md.converters.mermaid = function (render) {
    return render ? '<Mermaid />' : ''
  })

  const content = [{ h1: event.name, mermaid: true }]

  return `---
${YAML.stringify(event)}---
${customJSON2MD(content)}`
}

export const buildServiceMarkdownFile = (service: any) => {
  const customJSON2MD = (json2md.converters.mermaid = function (render) {
    return render ? '<Mermaid />' : ''
  })

  const content = [{ h1: service.name, mermaid: true }]

  return `---
${YAML.stringify(service)}---
${customJSON2MD(content)}`
}
