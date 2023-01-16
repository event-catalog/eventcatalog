import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { Domain } from '@eventcatalog/types';
import buildMarkdownFile from './markdown-builder';

import { FunctionInitInterface, WriteDomainToCatalogOptions, WriteDomainToCatalogResponse } from './types';

const readMarkdownFile = (pathToFile: string) => {
  const file = fs.readFileSync(pathToFile, {
    encoding: 'utf-8',
  });
  return {
    parsed: matter(file),
    raw: file,
  };
};

export const getDomainFromCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (domainName: string) => {
    try {
      // Read the directory to get the stuff we need.
      const { parsed: parsedService, raw } = readMarkdownFile(path.join(catalogDirectory, 'domains', domainName, 'index.md'));
      return {
        data: parsedService.data,
        content: parsedService.content,
        raw,
      };
    } catch (error) {
      return null;
    }
  };

export const buildDomainMarkdownForCatalog =
  () =>
  (domain: Domain, { markdownContent, renderMermaidDiagram = false, renderNodeGraph = true }: any = {}) =>
    buildMarkdownFile({
      frontMatterObject: domain,
      customContent: markdownContent,
      renderMermaidDiagram,
      renderNodeGraph,
    });

export const writeDomainToCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (domain: Domain, options?: WriteDomainToCatalogOptions): WriteDomainToCatalogResponse => {
    const { name: domainName } = domain;
    const { useMarkdownContentFromExistingDomain = true, renderMermaidDiagram = false, renderNodeGraph = true } = options || {};
    let markdownContent;

    if (!domainName) throw new Error('No `name` found for given domain');

    if (useMarkdownContentFromExistingDomain) {
      const data = getDomainFromCatalog({ catalogDirectory })(domainName);
      markdownContent = data?.content ? data?.content : '';
    }

    const data = buildDomainMarkdownForCatalog()(domain, {
      markdownContent,
      useMarkdownContentFromExistingDomain,
      renderMermaidDiagram,
      renderNodeGraph,
    });

    fs.ensureDirSync(path.join(catalogDirectory, 'domains', domain.name));
    fs.writeFileSync(path.join(catalogDirectory, 'domains', domain.name, 'index.md'), data);

    return {
      path: path.join(catalogDirectory, 'domains', domain.name),
    };
  };
