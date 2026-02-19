import { isSSR, isResourceDocsEnabled } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
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

export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR() || !isResourceDocsEnabled()) {
      return [];
    }

    const docs = await getResourceDocs();

    return docs.map((doc) => ({
      params: {
        type: doc.data.resourceCollection,
        id: doc.data.resourceId,
        version: doc.data.resourceVersion,
        docType: doc.data.type,
        docId: doc.data.id,
        docVersion: doc.data.version,
      },
      props: {},
    }));
  }

  protected static async fetchData(params: any) {
    if (!isResourceDocsEnabled()) {
      return null;
    }

    const decodeParam = (value: string) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    const type = decodeParam(params.type);
    const id = decodeParam(params.id);
    const version = decodeParam(params.version);
    const docType = decodeParam(params.docType);
    const docId = decodeParam(params.docId);
    const docVersion = decodeParam(params.docVersion);
    if (!type || !id || !version || !docType || !docId || !docVersion) {
      return null;
    }

    if (!supportedResourceCollections.has(type as ResourceCollection)) {
      return null;
    }

    const docsForResource = await getResourceDocsForResource(type as ResourceCollection, id, version);
    const doc = docsForResource.find(
      (resourceDoc) =>
        resourceDoc.data.type === docType && resourceDoc.data.id === docId && resourceDoc.data.version === docVersion
    );

    if (!doc) {
      return null;
    }

    return doc;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Resource documentation not found',
    });
  }
}
