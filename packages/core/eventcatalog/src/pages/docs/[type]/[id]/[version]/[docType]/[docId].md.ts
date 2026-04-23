// Exposes the raw markdown for a resource doc.
// Example: /docs/services/OrdersService/1.0.0/adrs/01-some-decision.md
// Used by llms.txt so LLMs can fetch the markdown directly.

import type { APIRoute } from 'astro';
import fs from 'fs';
import { isLLMSTxtEnabled, isResourceDocsEnabled, isSSR } from '@utils/feature';
import { getResourceDocs, getResourceDocsForResource, type ResourceCollection } from '@utils/collections/resource-docs';

const supportedResourceCollections = new Set<ResourceCollection>([
  'domains',
  'services',
  'events',
  'commands',
  'queries',
  'flows',
  'containers',
  'channels',
  'entities',
  'data-products',
]);

export async function getStaticPaths() {
  if (isSSR() || !isLLMSTxtEnabled() || !isResourceDocsEnabled()) {
    return [];
  }

  const docs = await getResourceDocs();
  const latestDocs = docs.filter((doc) => doc.data.version === doc.data.latestVersion);

  return latestDocs.map((doc) => ({
    params: {
      type: doc.data.resourceCollection,
      id: doc.data.resourceId,
      version: doc.data.resourceVersion,
      docType: doc.data.type,
      docId: doc.data.id,
    },
    props: { filePath: doc.filePath },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  if (!isLLMSTxtEnabled()) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  if (!isResourceDocsEnabled()) {
    return new Response('Resource docs are not enabled for this Catalog.', { status: 404 });
  }

  let filePath = (props as { filePath?: string } | undefined)?.filePath;

  if (!filePath && isSSR()) {
    const type = params.type as ResourceCollection | undefined;
    if (!type || !supportedResourceCollections.has(type)) {
      return new Response('Not found', { status: 404 });
    }
    const docsForResource = await getResourceDocsForResource(type, params.id ?? '', params.version ?? '');
    const doc = docsForResource.find(
      (resourceDoc) =>
        resourceDoc.data.type === params.docType &&
        resourceDoc.data.id === params.docId &&
        resourceDoc.data.version === resourceDoc.data.latestVersion
    );
    filePath = doc?.filePath;
  }

  if (!filePath) {
    return new Response('Not found', { status: 404 });
  }

  const file = fs.readFileSync(filePath, 'utf8');
  return new Response(file, { status: 200, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
