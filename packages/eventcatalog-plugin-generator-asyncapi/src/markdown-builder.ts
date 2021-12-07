import YAML from 'yamljs'
import json2md from 'json2md'
import { Event, Service } from '@eventcatalogtest/types'

export const buildMarkdownFile = ({
  frontMatterObject,
  customContent,
}: {
  frontMatterObject: Service | Event
  customContent?: string
}) => {
  const customJSON2MD = (json2md.converters.mermaid = function (render) {
    return render ? '<Mermaid />' : ''
  })

  const content = [{ h1: frontMatterObject.name, mermaid: true }]

  return `---
${YAML.stringify(frontMatterObject)}---
${customContent ? customContent : customJSON2MD(content)}`
}
