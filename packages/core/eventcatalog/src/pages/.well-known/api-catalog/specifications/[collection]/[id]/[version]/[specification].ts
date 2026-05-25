import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getSpecificationsForDomain } from '@utils/collections/domains';
import { getSpecificationsForService } from '@utils/collections/services';
import type { ProcessedSpecification } from '@utils/collections/util';
import { readResourceFile } from '@utils/resource-files';

type SupportedCollection = 'domains' | 'services';

const isSupportedCollection = (collection: string | undefined): collection is SupportedCollection => {
  return collection === 'domains' || collection === 'services';
};

const getSpecificationMediaType = (specification: ProcessedSpecification) => {
  const extension = specification.filename.split('.').pop()?.toLowerCase();

  if (specification.type === 'graphql') return 'application/graphql';
  if (extension === 'json') return 'application/json';
  if (extension === 'yaml' || extension === 'yml') return 'application/yaml';

  return 'text/plain';
};

const getSpecificationsForResource = (
  resource:
    | Awaited<ReturnType<typeof getCollection<'services'>>>[number]
    | Awaited<ReturnType<typeof getCollection<'domains'>>>[number]
) => {
  if (resource.collection === 'domains') {
    return getSpecificationsForDomain(resource);
  }

  return getSpecificationsForService(resource);
};

export async function getStaticPaths() {
  const [services, domains] = await Promise.all([getCollection('services'), getCollection('domains')]);
  const resources = [...services, ...domains].filter((resource) => resource.data.hidden !== true);

  return resources.flatMap((resource) =>
    getSpecificationsForResource(resource).map((specification) => ({
      params: {
        collection: resource.collection,
        id: resource.data.id,
        version: resource.data.version,
        specification: specification.type,
      },
      props: {
        rawSpecification: readResourceFile(resource, specification.path),
        contentType: getSpecificationMediaType(specification),
      },
    }))
  );
}

export const GET: APIRoute = async ({ params, props }) => {
  if (props.rawSpecification) {
    return new Response(props.rawSpecification, {
      headers: { 'Content-Type': props.contentType ?? 'text/plain' },
    });
  }

  const { collection, id, version, specification } = params;

  if (!isSupportedCollection(collection) || !id || !version || !specification) {
    return new Response(JSON.stringify({ error: 'Missing or invalid collection, id, version, or specification parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resources = await getCollection(collection);
  const resource = resources.find((item) => item.data.id === id && item.data.version === version && item.data.hidden !== true);

  if (!resource) {
    return new Response(JSON.stringify({ error: 'Resource not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const spec = getSpecificationsForResource(resource).find((item) => item.type === specification);

  if (!spec) {
    return new Response(JSON.stringify({ error: 'Specification not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawSpecification = readResourceFile(resource, spec.path);

  if (!rawSpecification) {
    return new Response(JSON.stringify({ error: 'Specification file could not be read' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(rawSpecification, {
    headers: { 'Content-Type': getSpecificationMediaType(spec) },
  });
};
