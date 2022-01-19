import YAML from 'yamljs';
import json2md from 'json2md';
import { Event, Service } from '@eventcatalog/types';

export default ({
  frontMatterObject,
  customContent,
  includeSchemaComponent = false,
}: {
  frontMatterObject: Service | Event;
  customContent?: string;
  includeSchemaComponent?: boolean;
}) => {
  // eslint-disable-next-line no-multi-assign
  const customJSON2MD = (content: any) => {
    json2md.converters.mermaid = (render) => (render ? '<Mermaid />' : '');
    json2md.converters.schema = (render) => (render ? '<Schema />' : '');
    return json2md(content);
  };

  const content = [{ mermaid: true }, { schema: includeSchemaComponent }];

  return `---
${YAML.stringify(frontMatterObject)}---
${customContent || customJSON2MD(content)}`;
};
