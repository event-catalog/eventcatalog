import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import path from 'node:path';
import fs from 'node:fs';
import { getSpecificationsForService } from '@utils/collections/services';
import { isEventCatalogScaleEnabled } from '@utils/feature';

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

export const GET: APIRoute = async ({ props }) => {
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
  return new Response(props.schema, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
