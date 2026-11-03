import type { APIContext, APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';
import type { CollectionTypes } from '@types';
import { getSpecificationMediaType, processSpecifications, type SpecificationType } from '@utils/collections/util';
import { readResourceFile, resourceFileExists } from '@utils/resource-files';
import { resolveHeaders } from '@utils/remote-spec';
import { buildUrl } from '@utils/url-builder';
import Config from '@utils/eventcatalog-config/catalog';

/** The folder each kind of specification page lives in, under /docs/{type}/{id}/{version}/ */
const PAGE_SEGMENT_BY_SPECIFICATION_TYPE: Record<SpecificationType, string> = {
  asyncapi: 'asyncapi',
  openapi: 'spec',
  graphql: 'graphql',
  generic: 'generic',
};

export type StaticPath = { params: Record<string, string | undefined>; props: Record<string, any> };

/** The data a specification page loads: the resource, plus the specification's path and file names */
export type SpecificationPageData = CollectionEntry<CollectionTypes> & {
  path: string;
  filename: string;
  filenameWithoutExtension: string;
};

/** A specification page's data loader (the `Page` class in each `_[filename].data.ts`) */
export type SpecificationPage = {
  getStaticPaths(): Promise<StaticPath[]>;
  getData(astro: { params: Record<string, string | undefined>; props: Record<string, any> }): Promise<any>;
};

/**
 * The name a specification's file has in its URL: a remote specification's file name without the URL's query
 * or fragment (orders.yaml?token=abc is orders.yaml), which would otherwise end the URL's path
 */
export const getRawSpecificationFileName = (filename: string) => filename.split(/[?#]/, 1)[0];

/** Whether a raw specification URL's `file` names this specification's file */
export const isRawSpecificationFile = (pageData: SpecificationPageData, file: string | undefined) =>
  getRawSpecificationFileName(pageData.filename) === file;

/**
 * The URL of a specification's file, as written (JSON, YAML, GraphQL...): its page's URL followed by the
 * file's name, e.g. /docs/services/Orders/1.0.0/asyncapi/orders/orders.yaml
 */
export const getRawSpecificationUrl = ({
  collection,
  id,
  version,
  type,
  filename,
  filenameWithoutExtension,
}: {
  collection: string;
  id: string;
  version: string;
  type: SpecificationType;
  filename: string;
  filenameWithoutExtension: string;
}) =>
  buildUrl(
    `/docs/${collection}/${id}/${version}/${PAGE_SEGMENT_BY_SPECIFICATION_TYPE[type]}/${filenameWithoutExtension}/${getRawSpecificationFileName(filename)}`,
    true
  );

const isRemote = (path: string) => /^https?:\/\//i.test(path);

export const notFound = (error: string) =>
  new Response(JSON.stringify({ error }), { status: 404, headers: { 'Content-Type': 'application/json' } });

/** The specification's file, as written, with the media type of its format */
export const getRawSpecificationResponse = async (
  type: SpecificationType,
  pageData: SpecificationPageData
): Promise<Response> => {
  const specification = processSpecifications((pageData.data as any).specifications).find(
    (spec) => spec.type === type && spec.path === pageData.path
  );

  if (!specification) return notFound('Specification not found');

  const headers = { 'Content-Type': getSpecificationMediaType(specification) };

  if (isRemote(specification.path)) {
    const allowAnyEnvInHeaders = type === 'asyncapi' && (Config?.asyncAPI?.allowAnyEnvInSpecHeaders ?? false);
    const response = await fetch(specification.path, {
      headers: resolveHeaders(specification.headers ?? {}, { allowAnyEnvInHeaders }),
    }).catch(() => null);

    if (!response?.ok) return notFound('Specification file could not be fetched');
    return new Response(await response.text(), { headers });
  }

  const content = readResourceFile(pageData, specification.path);
  if (content === null) return notFound('Specification file could not be read');

  return new Response(content, { headers });
};

/**
 * Each specification page's path, with the specification's file name added as `file`. A local file that
 * doesn't exist gets no path: a static build would otherwise save the 404's JSON under the file's name.
 */
export const toRawSpecificationPaths = (paths: StaticPath[]): StaticPath[] =>
  paths
    .filter(({ props }) => isRemote(props.path) || resourceFileExists(props, props.path))
    .map(({ params, props }) => ({ params: { ...params, file: getRawSpecificationFileName(props.filename) }, props }));

/**
 * The route that serves a specification's file next to its page:
 * /docs/{type}/{id}/{version}/{asyncapi|spec|graphql|generic}/{filename}/{file}
 */
export const createRawSpecificationRoute = (type: SpecificationType, Page: SpecificationPage) => {
  const getStaticPaths = async () => toRawSpecificationPaths(await Page.getStaticPaths());

  const GET: APIRoute = async ({ params, props }: APIContext) => {
    const pageData: SpecificationPageData | undefined = await Page.getData({ params, props });

    if (!pageData || !isRawSpecificationFile(pageData, params.file)) return notFound('Specification not found');

    return getRawSpecificationResponse(type, pageData);
  };

  return { getStaticPaths, GET };
};
