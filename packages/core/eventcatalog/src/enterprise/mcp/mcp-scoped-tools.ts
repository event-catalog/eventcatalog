/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import {
  analyzeChangeImpact,
  explainBusinessFlow,
  explainUbiquitousLanguageTerms,
  findMessageBySchemaId,
  getConsumersOfMessage,
  getMessagesProducedOrConsumedByResource,
  getProducersOfMessage,
  getResource,
  getSchemaForResource,
  paginate,
} from '@enterprise/tools/catalog-tools';
import type { McpScope } from './mcp-scope';

const notFound = (collection: string, id: string, version?: string) => ({
  error: `Resource not found: ${collection}/${id}${version ? ` (${version})` : ''}`,
});

const isScopedReference = (scope: McpScope, resource: any, defaultCollection?: string) => {
  const collection = resource?.collection || defaultCollection;
  return Boolean(collection && resource?.id && scope.has(collection, resource.id, resource.version));
};

const filterScopedReferences = (scope: McpScope, resources: any[] | undefined, defaultCollection?: string) =>
  (resources || []).filter((resource) => isScopedReference(scope, resource, defaultCollection));

export function createScopedCatalogTools(scope: McpScope) {
  return {
    async getResources(params: { collection: string; cursor?: string; search?: string }) {
      let resources = scope.list(params.collection).map((resource) => ({
        id: resource.data.id,
        version: resource.data.version,
        name: resource.data.name,
        summary: resource.data.summary,
      }));

      if (params.search) {
        const searchTerm = params.search.toLowerCase().trim();
        resources = resources.filter(
          (resource) =>
            resource.id?.toLowerCase().includes(searchTerm) ||
            resource.name?.toLowerCase().includes(searchTerm) ||
            resource.summary?.toLowerCase().includes(searchTerm)
        );
      }

      const result = paginate(resources, params.cursor);
      if ('error' in result) return result;

      return {
        resources: result.items,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
        scope: scope.ref,
      };
    },

    async getResource(params: { collection: string; id: string; version: string }) {
      if (!scope.has(params.collection, params.id, params.version)) return notFound(params.collection, params.id, params.version);
      return getResource(params);
    },

    async getMessagesProducedOrConsumedByResource(params: {
      resourceId: string;
      resourceVersion: string;
      resourceCollection: string;
    }) {
      if (!scope.has(params.resourceCollection, params.resourceId, params.resourceVersion)) {
        return notFound(params.resourceCollection, params.resourceId, params.resourceVersion);
      }
      return getMessagesProducedOrConsumedByResource(params);
    },

    async getSchemaForResource(params: { resourceId: string; resourceVersion: string; resourceCollection: string }) {
      if (!scope.has(params.resourceCollection, params.resourceId, params.resourceVersion)) {
        return notFound(params.resourceCollection, params.resourceId, params.resourceVersion);
      }
      return getSchemaForResource(params);
    },

    async findResourcesByOwner(params: { ownerId: string }) {
      const resources = scope
        .listAll()
        .filter((resource) =>
          (resource.data.owners || []).some((owner: string | { id: string }) =>
            typeof owner === 'string' ? owner === params.ownerId : owner.id === params.ownerId
          )
        )
        .map((resource) => ({
          collection: resource.collection,
          id: resource.data.id,
          version: resource.data.version,
          name: resource.data.name || resource.data.id,
        }));

      return { ownerId: params.ownerId, totalCount: resources.length, resources, scope: scope.ref };
    },

    async getProducersOfMessage(params: { messageId: string; messageVersion: string; messageCollection: string }) {
      if (!scope.has(params.messageCollection, params.messageId, params.messageVersion)) {
        return notFound(params.messageCollection, params.messageId, params.messageVersion);
      }
      const result = await getProducersOfMessage(params);
      if ('error' in result) return result;
      const producers = filterScopedReferences(scope, result.producers);
      return { ...result, producers, count: producers.length, scope: scope.ref };
    },

    async getConsumersOfMessage(params: { messageId: string; messageVersion: string; messageCollection: string }) {
      if (!scope.has(params.messageCollection, params.messageId, params.messageVersion)) {
        return notFound(params.messageCollection, params.messageId, params.messageVersion);
      }
      const result = await getConsumersOfMessage(params);
      if ('error' in result) return result;
      const consumers = filterScopedReferences(scope, result.consumers);
      return { ...result, consumers, count: consumers.length, scope: scope.ref };
    },

    async analyzeChangeImpact(params: { messageId: string; messageVersion: string; messageCollection: string }) {
      if (!scope.has(params.messageCollection, params.messageId, params.messageVersion)) {
        return notFound(params.messageCollection, params.messageId, params.messageVersion);
      }
      const result = await analyzeChangeImpact(params);
      if ('error' in result) return result;

      const producers = filterScopedReferences(scope, result.producers);
      const consumers = filterScopedReferences(scope, result.consumers);
      const affected = [...producers, ...consumers];
      const affectedOwners = new Set<string>();
      affected.forEach((resource) =>
        (resource.owners || []).forEach((owner: string | { id: string }) =>
          affectedOwners.add(typeof owner === 'string' ? owner : owner.id)
        )
      );

      return {
        ...result,
        scope: scope.ref,
        impact: {
          producerCount: producers.length,
          consumerCount: consumers.length,
          totalResourcesAffected: new Set(affected.map((resource) => `${resource.collection}:${resource.id}`)).size,
          totalServicesAffected: new Set(
            affected.filter((resource) => resource.collection === 'services').map((resource) => resource.id)
          ).size,
          totalAgentsAffected: new Set(
            affected.filter((resource) => resource.collection === 'agents').map((resource) => resource.id)
          ).size,
          teamsAffected: Array.from(affectedOwners),
        },
        producers,
        consumers,
      };
    },

    async explainBusinessFlow(params: { flowId: string; flowVersion: string }) {
      if (!scope.has('flows', params.flowId, params.flowVersion)) return notFound('flows', params.flowId, params.flowVersion);
      const result = await explainBusinessFlow(params);
      if ('error' in result) return result;
      return {
        ...result,
        relatedServices: filterScopedReferences(scope, result.relatedServices, 'services'),
        relatedAgents: filterScopedReferences(scope, result.relatedAgents, 'agents'),
        scope: scope.ref,
      };
    },

    async findMessageBySchemaId(params: {
      messageId: string;
      messageVersion?: string;
      collection?: 'events' | 'commands' | 'queries';
    }) {
      const result = await findMessageBySchemaId(params);
      if ('error' in result) return result;
      if (!scope.has(result.resource.collection, result.resource.id, result.resource.version)) {
        return notFound(result.resource.collection, params.messageId, params.messageVersion);
      }
      return {
        ...result,
        producers: filterScopedReferences(scope, result.producers),
        consumers: filterScopedReferences(scope, result.consumers),
        scope: scope.ref,
      };
    },

    async explainUbiquitousLanguageTerms(params: { domainId: string; domainVersion?: string }) {
      if (!scope.has('domains', params.domainId, params.domainVersion))
        return notFound('domains', params.domainId, params.domainVersion);
      return explainUbiquitousLanguageTerms(params);
    },
  };
}
