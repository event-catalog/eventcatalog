import type { CollectionEntry } from 'astro:content';
import type { PageTypes } from '@types';
import path from 'path';
import { buildUrl } from '@utils/url-builder';
import { getAbsoluteFilePathForAstroFile } from '@utils/files';

export type Schema = {
  url: string;
  format: string;
};

export const getSchemaURL = (resource: CollectionEntry<PageTypes>) => {
  // @ts-ignore
  const publicPath = resource?.catalog?.publicPath;
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
    // @ts-ignore
    let publicPath = resource?.catalog?.publicPath;
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

    return schemas;
  } else {
    const pathParts = schemaPublicPath.split('.');
    const format = pathParts[pathParts.length - 1];
    return [{ url: buildUrl(schemaPublicPath), format }];
  }
};
