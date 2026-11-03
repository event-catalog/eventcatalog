import type { APIContext, APIRoute } from 'astro';
import type { SpecificationType } from '@utils/collections/util';
import {
  getRawSpecificationResponse,
  notFound,
  toRawSpecificationPaths,
  type SpecificationPage,
  type SpecificationPageData,
  type StaticPath,
} from '@utils/raw-specification';
import { getLatestServicePaths, getLatestServiceVersion } from './_latest-version-route';

/**
 * The route that serves the file of a service's latest version, for links that don't change with each
 * release: /docs/services/{id}/{asyncapi|spec|graphql}/{filename}/{file}
 */
export const createLatestServiceRawSpecificationRoute = (type: SpecificationType, Page: SpecificationPage) => {
  const getStaticPaths = async () =>
    (await getLatestServicePaths(toRawSpecificationPaths(await Page.getStaticPaths()))) as StaticPath[];

  const GET: APIRoute = async ({ params, props }: APIContext) => {
    const version = props.redirectVersion ?? (params.id ? await getLatestServiceVersion(params.id) : undefined);
    if (!version) return notFound('Specification not found');

    const pageData: SpecificationPageData | undefined = await Page.getData({
      params: { type: 'services', id: params.id, version, filename: params.filename },
      props,
    });

    if (!pageData || pageData.filename !== params.file) return notFound('Specification not found');

    return getRawSpecificationResponse(type, pageData);
  };

  return { getStaticPaths, GET };
};
