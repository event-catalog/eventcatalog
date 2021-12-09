import YAML from 'yamljs';
import json2md from 'json2md';
import { Event, Service } from '@eventcatalogtest/types';

export default ({
  frontMatterObject,
  customContent,
}: {
  frontMatterObject: Service | Event;
  customContent?: string;
}) => {
  // eslint-disable-next-line no-multi-assign
  const customJSON2MD = (json2md.converters.mermaid = (render) => (render ? '<Mermaid />' : ''));

  const content = [{ h1: frontMatterObject.name, mermaid: true }];

  return `---
${YAML.stringify(frontMatterObject)}---
${customContent || customJSON2MD(content)}`;
};
