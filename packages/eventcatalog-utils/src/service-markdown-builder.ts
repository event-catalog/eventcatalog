import YAML from 'yamljs';
import json2md from 'json2md';
import { Event, Service, Domain } from '@eventcatalog/types';

type Content = Array<{ mermaid?: boolean; schema?: boolean; nodeGraph?: boolean; asyncAPI?: boolean }>;
export default ({
  frontMatterObject,
  customContent,
  includeSchemaComponent = false,
  renderMermaidDiagram = false,
  renderNodeGraph = true,
  renderAsyncAPI = false,
}: {
  frontMatterObject: Service | Event | Domain;
  customContent?: string;
  includeSchemaComponent?: boolean;
  renderMermaidDiagram?: boolean;
  renderNodeGraph?: boolean;
  renderAsyncAPI?: boolean;
}) => {
  const customJSON2MD = (content: any) => {
    json2md.converters.mermaid = (render) => (render ? '<Mermaid />' : '');
    json2md.converters.schema = (render) => (render ? '<Schema />' : '');
    json2md.converters.nodeGraph = (render) => (render ? '<NodeGraph />' : '');
    json2md.converters.asyncAPI = (render) => (render  ? '<AsyncAPI />' : '');
    return json2md(content);
  };

  const content: Content = [
    { mermaid: renderMermaidDiagram }, 
    { nodeGraph: renderNodeGraph }, 
    { schema: includeSchemaComponent },
    { asyncAPI: renderAsyncAPI }];

  return `---
${YAML.stringify(frontMatterObject)}---
${customContent || customJSON2MD(content)}`;
};

