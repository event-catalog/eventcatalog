import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { getSpecificationsForService } from '@utils/collections/services';
import { getSpecificationMediaType } from '@utils/collections/util';
import { resourceFileExists, readResourceFile } from '@utils/resource-files';

// The Schema API: kept for the API consumers that already use it. It finds a specification by its type, so it
// serves the first of each type. The file of every specification is also served next to its page:
// /docs/{type}/{id}/{version}/{asyncapi|spec|graphql|generic}/{filename}/{file}
const getFirstSpecificationOfEachType = (service: CollectionEntry<'services'>) =>
  getSpecificationsForService(service).filter(
    (specification, index, specifications) => specifications.findIndex((spec) => spec.type === specification.type) === index
  );

export async function getStaticPaths() {
  const services = await getCollection('services');
  return services.flatMap((service) =>
    getFirstSpecificationOfEachType(service).map((specification) => ({
      params: {
        collection: service.collection,
        id: service.data.id,
        version: service.data.version,
        specification: specification.type,
      },
      props: {
        schema: readResourceFile(service, specification.path),
        contentType: getSpecificationMediaType(specification),
      },
    }))
  );
}

export const GET: APIRoute = async ({ props, params }) => {
  // In static mode, props are pre-computed by getStaticPaths
  if (props.schema) {
    return new Response(props.schema, {
      headers: { 'Content-Type': props.contentType },
    });
  }

  // In SSR mode, dynamically resolve the schema from params
  const { id, version, specification } = params;

  if (!id || !version || !specification) {
    return new Response(JSON.stringify({ error: 'Missing id, version, or specification parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const services = await getCollection('services');
  const service = services.find((s) => s.data.id === id && s.data.version === version);

  if (!service) {
    return new Response(JSON.stringify({ error: 'Service not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const specifications = getSpecificationsForService(service);
  const spec = specifications.find((s) => s.type === specification);

  if (!spec || !resourceFileExists(service, spec.path)) {
    return new Response(JSON.stringify({ error: 'Specification not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const schema = readResourceFile(service, spec.path);

  if (!schema) {
    return new Response(JSON.stringify({ error: 'Specification file could not be read' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(schema, {
    headers: { 'Content-Type': getSpecificationMediaType(spec) },
  });
};
