import type { CollectionEntry } from 'astro:content';
import type { PageTypes } from '@types';
import path from 'path';
import { buildUrl } from '@utils/url-builder';
import { getAbsoluteFilePathForAstroFile } from '@utils/files';
import { getFolderNameFromFilePath } from './util';

export type Schema = {
  url: string;
  format: string;
};

const getPublicPath = (resource: CollectionEntry<PageTypes>): string | undefined => {
  if (!resource.filePath) return undefined;
  const folderName = getFolderNameFromFilePath(resource.filePath);
  return path.join('/generated', resource.collection, folderName);
};

export const getSchemaURL = (resource: CollectionEntry<PageTypes>) => {
  const publicPath = getPublicPath(resource);
  const schemaFilePath = resource?.data?.schemaPath;

  // No schema file path, return an empty string
  if (!schemaFilePath) {
    return;
  }

  if (!publicPath) {
    // Then we try and get the absolute file path from the resource
    const absoluteFilePath = getAbsoluteFilePathForAstroFile(resource.filePath ?? '', schemaFilePath ?? '');
    if (absoluteFilePath) {
      return absoluteFilePath;
    }
    // Can't find the schema file, return an empty string
    return;
  }

  // new URL
  return path.join(publicPath, schemaFilePath ?? '');
};

export const getSchemaFormatFromURL = (url: string) => {
  const pathParts = url.split('.');
  const format = pathParts[pathParts.length - 1];
  return format;
};

export const getSchemasFromResource = (resource: CollectionEntry<PageTypes>): Schema[] => {
  const schemaPublicPath = getSchemaURL(resource);

  if (!schemaPublicPath) {
    return [];
  }

  if (resource.collection === 'services') {
    const specifications = resource?.data?.specifications;
    const asyncapiPath = Array.isArray(specifications)
      ? specifications.find((spec) => spec.type === 'asyncapi')?.path
      : specifications?.asyncapiPath;
    const openapiPath = Array.isArray(specifications)
      ? specifications.find((spec) => spec.type === 'openapi')?.path
      : specifications?.openapiPath;
    const graphqlPath = Array.isArray(specifications)
      ? specifications.find((spec) => spec.type === 'graphql')?.path
      : specifications?.graphqlPath;
    let publicPath = getPublicPath(resource);
    const schemas = [];

    if (asyncapiPath) {
      if (!publicPath) {
        // We try and get the absoulate file path from the resource
        const absoluteFilePath = getAbsoluteFilePathForAstroFile(resource.filePath ?? '', asyncapiPath ?? '');
        schemas.push({ url: buildUrl(absoluteFilePath), format: 'asyncapi' });
      } else {
        // The resource has the public path, so we can use it to build the URL
        schemas.push({ url: buildUrl(path.join(publicPath, asyncapiPath)), format: 'asyncapi' });
      }
    }

    if (openapiPath) {
      if (!publicPath) {
        // We try and get the absoulate file path from the resource
        const absoluteFilePath = getAbsoluteFilePathForAstroFile(resource.filePath ?? '', openapiPath ?? '');
        schemas.push({ url: buildUrl(absoluteFilePath), format: 'openapi' });
      } else {
        // The resource has the public path, so we can use it to build the URL
        schemas.push({ url: buildUrl(path.join(publicPath, openapiPath)), format: 'openapi' });
      }
    }

    if (graphqlPath) {
      if (!publicPath) {
        // We try and get the absoulate file path from the resource
        const absoluteFilePath = getAbsoluteFilePathForAstroFile(resource.filePath ?? '', graphqlPath ?? '');
        schemas.push({ url: buildUrl(absoluteFilePath), format: 'graphql' });
      } else {
        // The resource has the public path, so we can use it to build the URL
        schemas.push({ url: buildUrl(path.join(publicPath, graphqlPath)), format: 'graphql' });
      }
    }

    return schemas;
  } else {
    const pathParts = schemaPublicPath.split('.');
    const format = pathParts[pathParts.length - 1];
    return [{ url: buildUrl(schemaPublicPath), format }];
  }
};
