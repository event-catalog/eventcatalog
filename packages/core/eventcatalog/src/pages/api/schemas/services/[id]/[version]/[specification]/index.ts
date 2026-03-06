import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import path from 'node:path';
import fs from 'node:fs';
import { getSpecificationsForService } from '@utils/collections/services';
import { isEventCatalogScaleEnabled } from '@utils/feature';
import { resourceFileExists, readResourceFile } from '@utils/resource-files';

export async function getStaticPaths() {
  const services = await getCollection('services');
  const servicesWithSpecifications = services.filter((service) => getSpecificationsForService(service).length > 0);
  return servicesWithSpecifications.reduce<
    { params: { collection: string; id: string; version: string; specification: string }; props: { schema: string } }[]
  >(
    (acc, service) => {
      const specifications = getSpecificationsForService(service);
      return [
        ...acc,
        ...specifications.map((specification) => ({
          params: {
            collection: service.collection,
            id: service.data.id,
            version: service.data.version,
            specification: specification.type,
          },
          props: {
            schema: fs.readFileSync(path.join(path.dirname(service.filePath ?? ''), specification.path ?? ''), 'utf8'),
          },
        })),
      ];
    },
    [] as { params: { collection: string; id: string; version: string; specification: string }; props: { schema: string } }[]
  );
}

export const GET: APIRoute = async ({ props, params }) => {
  if (!isEventCatalogScaleEnabled()) {
    return new Response(
      JSON.stringify({
        error: 'feature_not_available_on_server',
        message: 'Schema API is not enabled for this deployment and supported in EventCatalog Scale.',
      }),
      {
        status: 501,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }
    );
  }

  // In static mode, props are pre-computed by getStaticPaths
  if (props.schema) {
    return new Response(props.schema, {
      headers: { 'Content-Type': 'text/plain' },
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
    headers: { 'Content-Type': 'text/plain' },
  });
};
