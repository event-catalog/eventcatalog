import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { Service } from '@eventcatalog/types';
import buildMarkdownFile from './markdown-builder';

import { FunctionInitInterface, WriteServiceToCatalogInterface, WriteServiceToCatalogInterfaceReponse } from './types';

const readMarkdownFile = (pathToFile: string) => {
  const file = fs.readFileSync(pathToFile, {
    encoding: 'utf-8',
  });
  return {
    parsed: matter(file),
    raw: file,
  };
};

export const buildServiceMarkdownForCatalog =
  () =>
  (service: Service, { markdownContent }: any = {}) =>
    buildMarkdownFile({ frontMatterObject: service, customContent: markdownContent });

export const getAllServicesFromCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (): any[] => {
    const servicesDir = path.join(catalogDirectory, 'services');
    const folders = fs.readdirSync(servicesDir);
    return folders.map((folder) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { raw, ...service }: any = getServiceFromCatalog({ catalogDirectory })(folder);
      return service;
    });
  };

export const getServiceFromCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (seriveName: string) => {
    try {
      // Read the directory to get the stuff we need.
      const { parsed: parsedService, raw } = readMarkdownFile(path.join(catalogDirectory, 'services', seriveName, 'index.md'));
      return {
        data: parsedService.data,
        content: parsedService.content,
        raw,
      };
    } catch (error) {
      return null;
    }
  };

export const writeServiceToCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (service: Service, options?: WriteServiceToCatalogInterface): WriteServiceToCatalogInterfaceReponse => {
    const { name: serviceName } = service;
    const { useMarkdownContentFromExistingService = true } = options || {};
    let markdownContent;

    if (!serviceName) throw new Error('No `name` found for given service');

    if (useMarkdownContentFromExistingService) {
      const data = getServiceFromCatalog({ catalogDirectory })(serviceName);
      markdownContent = data?.content ? data?.content : '';
    }

    const data = buildServiceMarkdownForCatalog()(service, { markdownContent });

    fs.ensureDirSync(path.join(catalogDirectory, 'services', service.name));
    fs.writeFileSync(path.join(catalogDirectory, 'services', service.name, 'index.md'), data);

    return {
      path: path.join(catalogDirectory, 'services', service.name),
    };
  };
