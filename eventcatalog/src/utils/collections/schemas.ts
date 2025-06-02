import type { CollectionEntry } from 'astro:content';
import type { PageTypes } from '@types';
import path from 'path';
import { buildUrl } from '@utils/url-builder';

export type Schema = {
  url: string;
  format: string;
};

export const getSchemaURL = (resource: CollectionEntry<PageTypes>) => {
  // @ts-ignore
  const publicPath = resource?.catalog?.publicPath;
  const schemaFilePath = resource?.data?.schemaPath;

  if (!publicPath || !schemaFilePath) {
    return;
  }

  // new URL
  return path.join(publicPath, schemaFilePath);
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
    const publicPath = resource?.catalog?.publicPath;
    const schemas = [];

    if (asyncapiPath) {
      const asyncapiUrl = path.join(publicPath, asyncapiPath);
      schemas.push({ url: buildUrl(asyncapiUrl), format: 'asyncapi' });
    }

    if (openapiPath) {
      const openapiUrl = path.join(publicPath, openapiPath);
      schemas.push({ url: buildUrl(openapiUrl), format: 'openapi' });
    }

    return schemas;
  } else {
    const pathParts = schemaPublicPath.split('.');
    const format = pathParts[pathParts.length - 1];
    return [{ url: buildUrl(schemaPublicPath), format }];
  }
};
