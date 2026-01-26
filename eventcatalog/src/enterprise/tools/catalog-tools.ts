/**
 * Shared catalog tools for accessing EventCatalog resources.
 * Used by both the AI Chat feature and MCP Server.
 */
import { getCollection, getEntry } from 'astro:content';
import { z } from 'zod';
import { getSchemasFromResource, getSchemaFormatFromURL } from '@utils/collections/schemas';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import { getUbiquitousLanguageWithSubdomains } from '@utils/collections/domains';
import { getAbsoluteFilePathForAstroFile } from '@utils/files';
import fs from 'node:fs';
import { getNodesAndEdges as getNodesAndEdgesForService } from '@utils/node-graphs/services-node-graph';
import {
  getNodesAndEdgesForCommands,
  getNodesAndEdgesForEvents,
  getNodesAndEdgesForQueries,
} from '@utils/node-graphs/message-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForDomain } from '@utils/node-graphs/domains-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForFlows } from '@utils/node-graphs/flows-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForDataProduct } from '@utils/node-graphs/data-products-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForContainer } from '@utils/node-graphs/container-node-graph';
import { convertToMermaid } from '@utils/node-graphs/export-mermaid';
import config from '@config';

// ============================================
// Pagination utilities
// ============================================

export const DEFAULT_PAGE_SIZE = 50;

/**
 * Encode position to opaque cursor string.
 * Uses base64url for URL-safe encoding.
 */
export function encodeCursor(position: number): string {
  return Buffer.from(String(position)).toString('base64url');
}

/**
 * Decode cursor string to position.
 * Returns null if cursor is invalid.
 */
export function decodeCursor(cursor: string): number | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const position = parseInt(decoded, 10);
    return isNaN(position) || position < 0 ? null : position;
  } catch {
    return null;
  }
}

// Maximum cursor position to prevent abuse
const MAX_CURSOR_POSITION = 100000;

/**
 * Generic pagination helper for any array of items
 */
export function paginate<T>(
  items: T[],
  cursor?: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): { items: T[]; nextCursor?: string; totalCount: number } | { error: string } {
  let startIndex = 0;

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded === null) {
      return { error: 'Invalid or malformed cursor' };
    }
    if (decoded > MAX_CURSOR_POSITION) {
      return { error: 'Cursor position exceeds maximum allowed value' };
    }
    startIndex = decoded;
  }

  const endIndex = startIndex + pageSize;
  const paginatedItems = items.slice(startIndex, endIndex);
  const hasMore = endIndex < items.length;

  const result: { items: T[]; nextCursor?: string; totalCount: number } = {
    items: paginatedItems,
    totalCount: items.length,
  };

  if (hasMore) {
    result.nextCursor = encodeCursor(endIndex);
  }

  return result;
}

// ============================================
// Shared schemas for tool inputs
// ============================================

export const collectionSchema = z.enum([
  'events',
  'services',
  'commands',
  'queries',
  'flows',
  'domains',
  'channels',
  'entities',
  'containers',
  'diagrams',
  'data-products',
]);

export const messageCollectionSchema = z.enum(['events', 'commands', 'queries']);

export const resourceCollectionSchema = z.enum([
  'services',
  'events',
  'commands',
  'queries',
  'flows',
  'domains',
  'channels',
  'entities',
  'data-products',
]);

export const visualiserCollectionSchema = z.enum([
  'events',
  'commands',
  'queries',
  'services',
  'domains',
  'flows',
  'containers',
  'data-products',
]);

// ============================================
// Tool implementations (core logic)
// ============================================

/**
 * Get resources from a collection with optional pagination and search
 */
export async function getResources(params: { collection: string; cursor?: string; search?: string }) {
  const resources = await getCollection(params.collection as any);
  let allResults = resources.map((resource: any) => ({
    id: resource.data.id,
    version: resource.data.version,
    name: resource.data.name,
    summary: resource.data.summary,
  }));

  // Apply search filter if provided
  if (params.search) {
    const searchTerm = params.search.toLowerCase().trim();
    allResults = allResults.filter(
      (resource) =>
        resource.id?.toLowerCase().includes(searchTerm) ||
        resource.name?.toLowerCase().includes(searchTerm) ||
        resource.summary?.toLowerCase().includes(searchTerm)
    );
  }

  const paginatedResult = paginate(allResults, params.cursor);

  if ('error' in paginatedResult) {
    return paginatedResult;
  }

  return {
    resources: paginatedResult.items,
    nextCursor: paginatedResult.nextCursor,
    totalCount: paginatedResult.totalCount,
  };
}

/**
 * Get a specific resource by id and version
 */
export async function getResource(params: { collection: string; id: string; version: string }) {
  const resource = await getEntry(params.collection as any, `${params.id}-${params.version}`);

  if (!resource) {
    return { error: `Resource not found: ${params.id}-${params.version}` };
  }

  return resource;
}

/**
 * Get messages produced or consumed by a resource
 */
export async function getMessagesProducedOrConsumedByResource(params: {
  resourceId: string;
  resourceVersion: string;
  resourceCollection: string;
}) {
  const resource = await getEntry(params.resourceCollection as any, `${params.resourceId}-${params.resourceVersion}`);

  if (!resource) {
    return {
      error: `Resource not found with id ${params.resourceId} and version ${params.resourceVersion} and collection ${params.resourceCollection}`,
    };
  }

  return resource;
}

/**
 * Get schema or specifications for a resource
 */
export async function getSchemaForResource(params: { resourceId: string; resourceVersion: string; resourceCollection: string }) {
  const resource = await getEntry(params.resourceCollection as any, `${params.resourceId}-${params.resourceVersion}`);

  if (!resource) {
    return {
      error: `Resource not found with id ${params.resourceId} and version ${params.resourceVersion} and collection ${params.resourceCollection}`,
    };
  }

  const schema = await getSchemasFromResource(resource);

  if (schema.length > 0) {
    return schema.map((schemaItem) => ({
      url: schemaItem.url,
      format: schemaItem.format,
      code: fs.readFileSync(schemaItem.url, 'utf-8'),
    }));
  }

  return { message: 'No schemas found for this resource' };
}

/**
 * Find all resources owned by a specific team or user
 */
export async function findResourcesByOwner(params: { ownerId: string }) {
  const collectionsToSearch = [
    'events',
    'commands',
    'queries',
    'services',
    'domains',
    'flows',
    'channels',
    'entities',
    'data-products',
  ] as const;

  const results: Array<{ collection: string; id: string; version?: string; name: string }> = [];

  for (const collectionName of collectionsToSearch) {
    const resources = await getCollection(collectionName);

    for (const resource of resources) {
      const owners = (resource.data as any).owners || [];
      const ownerIds = owners.map((o: any) => (typeof o === 'string' ? o : o.id));

      if (ownerIds.includes(params.ownerId)) {
        results.push({
          collection: collectionName,
          id: (resource.data as any).id,
          version: (resource.data as any).version,
          name: (resource.data as any).name || (resource.data as any).id,
        });
      }
    }
  }

  if (results.length === 0) {
    return { message: `No resources found owned by: ${params.ownerId}`, resources: [] };
  }

  return { ownerId: params.ownerId, totalCount: results.length, resources: results };
}

/**
 * Get services that produce (send) a specific message
 */
export async function getProducersOfMessage(params: { messageId: string; messageVersion: string; messageCollection: string }) {
  const services = await getCollection('services');
  const message = await getEntry(params.messageCollection as any, `${params.messageId}-${params.messageVersion}`);

  if (!message) {
    return {
      error: `Message not found: ${params.messageId}-${params.messageVersion} in ${params.messageCollection}`,
    };
  }

  const producers = services.filter((service) => {
    const sends = (service.data as any).sends || [];
    return sends.some((send: any) => {
      const idMatch = send.id === params.messageId;
      if (!send.version || send.version === 'latest') return idMatch;
      return idMatch && send.version === params.messageVersion;
    });
  });

  return {
    message: {
      id: params.messageId,
      version: params.messageVersion,
      collection: params.messageCollection,
    },
    producers: producers.map((s) => ({
      id: (s.data as any).id,
      version: (s.data as any).version,
      name: (s.data as any).name || (s.data as any).id,
    })),
    count: producers.length,
  };
}

/**
 * Get services that consume (receive) a specific message
 */
export async function getConsumersOfMessage(params: { messageId: string; messageVersion: string; messageCollection: string }) {
  const services = await getCollection('services');
  const message = await getEntry(params.messageCollection as any, `${params.messageId}-${params.messageVersion}`);

  if (!message) {
    return {
      error: `Message not found: ${params.messageId}-${params.messageVersion} in ${params.messageCollection}`,
    };
  }

  const consumers = services.filter((service) => {
    const receives = (service.data as any).receives || [];
    return receives.some((receive: any) => {
      const idMatch = receive.id === params.messageId;
      if (!receive.version || receive.version === 'latest') return idMatch;
      return idMatch && receive.version === params.messageVersion;
    });
  });

  return {
    message: {
      id: params.messageId,
      version: params.messageVersion,
      collection: params.messageCollection,
    },
    consumers: consumers.map((s) => ({
      id: (s.data as any).id,
      version: (s.data as any).version,
      name: (s.data as any).name || (s.data as any).id,
    })),
    count: consumers.length,
  };
}

/**
 * Analyze the impact of changing a message (event, command, query)
 * Returns all affected services (producers and consumers) and their owners
 */
export async function analyzeChangeImpact(params: { messageId: string; messageVersion: string; messageCollection: string }) {
  const services = await getCollection('services');
  const message = await getEntry(params.messageCollection as any, `${params.messageId}-${params.messageVersion}`);

  if (!message) {
    return {
      error: `Message not found: ${params.messageId}-${params.messageVersion} in ${params.messageCollection}`,
    };
  }

  // Find producers
  const producers = services.filter((service) => {
    const sends = (service.data as any).sends || [];
    return sends.some((send: any) => send.id === params.messageId);
  });

  // Find consumers
  const consumers = services.filter((service) => {
    const receives = (service.data as any).receives || [];
    return receives.some((receive: any) => receive.id === params.messageId);
  });

  // Collect all affected teams/owners
  const affectedOwners = new Set<string>();
  [...producers, ...consumers].forEach((service) => {
    const owners = (service.data as any).owners || [];
    owners.forEach((o: any) => {
      const ownerId = typeof o === 'string' ? o : o.id;
      affectedOwners.add(ownerId);
    });
  });

  // Also check message owners
  const messageOwners = (message.data as any).owners || [];
  messageOwners.forEach((o: any) => {
    const ownerId = typeof o === 'string' ? o : o.id;
    affectedOwners.add(ownerId);
  });

  return {
    message: {
      id: params.messageId,
      version: params.messageVersion,
      collection: params.messageCollection,
      name: (message.data as any).name || params.messageId,
    },
    impact: {
      producerCount: producers.length,
      consumerCount: consumers.length,
      totalServicesAffected: new Set([...producers, ...consumers].map((s) => (s.data as any).id)).size,
      teamsAffected: Array.from(affectedOwners),
    },
    producers: producers.map((s) => ({
      id: (s.data as any).id,
      version: (s.data as any).version,
      name: (s.data as any).name || (s.data as any).id,
      owners: (s.data as any).owners || [],
    })),
    consumers: consumers.map((s) => ({
      id: (s.data as any).id,
      version: (s.data as any).version,
      name: (s.data as any).name || (s.data as any).id,
      owners: (s.data as any).owners || [],
    })),
  };
}

/**
 * Get detailed information about a flow (state machine / business process)
 * Returns the flow with its steps, description, and related services
 */
export async function explainBusinessFlow(params: { flowId: string; flowVersion: string }) {
  const flow = await getEntry('flows', `${params.flowId}-${params.flowVersion}`);

  if (!flow) {
    return { error: `Flow not found: ${params.flowId}-${params.flowVersion}` };
  }

  // Get related services that use this flow
  const services = await getCollection('services');
  const relatedServices = services.filter((service) => {
    const flows = (service.data as any).flows || [];
    return flows.some((f: any) => f.id === params.flowId);
  });

  return {
    flow: {
      id: (flow.data as any).id,
      version: (flow.data as any).version,
      name: (flow.data as any).name || (flow.data as any).id,
      summary: (flow.data as any).summary,
      owners: (flow.data as any).owners || [],
      steps: (flow.data as any).steps || [],
      mermaid: (flow.data as any).mermaid,
    },
    // Include the markdown content which often contains detailed business logic
    content: flow.body,
    relatedServices: relatedServices.map((s) => ({
      id: (s.data as any).id,
      version: (s.data as any).version,
      name: (s.data as any).name || (s.data as any).id,
    })),
  };
}

// ============================================
// Team and User tools (no versions)
// ============================================

/**
 * Get all teams with optional pagination
 */
export async function getTeams(params: { cursor?: string }) {
  const teams = await getCollection('teams');
  const allResults = teams.map((team: any) => ({
    id: team.data.id,
    name: team.data.name,
    email: team.data.email,
    slackDirectMessageUrl: team.data.slackDirectMessageUrl,
    members: team.data.members || [],
  }));

  const paginatedResult = paginate(allResults, params.cursor);

  if ('error' in paginatedResult) {
    return paginatedResult;
  }

  return {
    teams: paginatedResult.items,
    nextCursor: paginatedResult.nextCursor,
    totalCount: paginatedResult.totalCount,
  };
}

/**
 * Get a specific team by id
 */
export async function getTeam(params: { id: string }) {
  const teams = await getCollection('teams');
  const team = teams.find((t: any) => t.data.id === params.id);

  if (!team) {
    return { error: `Team not found: ${params.id}` };
  }

  return {
    id: team.data.id,
    name: team.data.name,
    email: team.data.email,
    slackDirectMessageUrl: team.data.slackDirectMessageUrl,
    members: team.data.members || [],
    summary: team.data.summary,
    content: team.body,
  };
}

/**
 * Get all users with optional pagination
 */
export async function getUsers(params: { cursor?: string }) {
  const users = await getCollection('users');
  const allResults = users.map((user: any) => ({
    id: user.data.id,
    name: user.data.name,
    email: user.data.email,
    role: user.data.role,
    slackDirectMessageUrl: user.data.slackDirectMessageUrl,
  }));

  const paginatedResult = paginate(allResults, params.cursor);

  if ('error' in paginatedResult) {
    return paginatedResult;
  }

  return {
    users: paginatedResult.items,
    nextCursor: paginatedResult.nextCursor,
    totalCount: paginatedResult.totalCount,
  };
}

/**
 * Get a specific user by id
 */
export async function getUser(params: { id: string }) {
  const users = await getCollection('users');
  const user = users.find((u: any) => u.data.id === params.id);

  if (!user) {
    return { error: `User not found: ${params.id}` };
  }

  return {
    id: user.data.id,
    name: user.data.name,
    email: user.data.email,
    role: user.data.role,
    slackDirectMessageUrl: user.data.slackDirectMessageUrl,
    summary: (user.data as any).summary,
    content: user.body,
  };
}

// ============================================
// Schema-based resource lookup
// ============================================

/**
 * Find a message resource and its producers/consumers by id and version
 * Designed to be used with schema files that contain x-eventcatalog-id extensions
 * If no version is provided, returns the latest version
 */
export async function findMessageBySchemaId(params: {
  messageId: string;
  messageVersion?: string;
  collection?: 'events' | 'commands' | 'queries';
}) {
  const collectionsToSearch = params.collection ? [params.collection] : (['events', 'commands', 'queries'] as const);

  for (const collectionName of collectionsToSearch) {
    const collection = await getCollection(collectionName);
    const matches = getItemsFromCollectionByIdAndSemverOrLatest(collection, params.messageId, params.messageVersion);
    const resource = matches[0];
    if (resource) {
      // Get producers and consumers
      const services = await getCollection('services');

      const producers = services.filter((service) => {
        const sends = (service.data as any).sends || [];
        return sends.some((send: any) => send.id === params.messageId);
      });

      const consumers = services.filter((service) => {
        const receives = (service.data as any).receives || [];
        return receives.some((receive: any) => receive.id === params.messageId);
      });

      return {
        resource: {
          id: (resource.data as any).id,
          version: (resource.data as any).version,
          name: (resource.data as any).name,
          collection: collectionName,
          summary: (resource.data as any).summary,
          owners: (resource.data as any).owners || [],
        },
        producers: producers.map((s) => ({
          id: (s.data as any).id,
          version: (s.data as any).version,
          name: (s.data as any).name || (s.data as any).id,
        })),
        consumers: consumers.map((s) => ({
          id: (s.data as any).id,
          version: (s.data as any).version,
          name: (s.data as any).name || (s.data as any).id,
        })),
      };
    }
  }

  return {
    error: `Message not found: ${params.messageId}${params.messageVersion ? ` (version ${params.messageVersion})` : ''}`,
  };
}

// ============================================
// Ubiquitous Language (DDD)
// ============================================

/**
 * Get ubiquitous language terms for a domain (including subdomains)
 * Returns the domain's language/glossary if defined
 */
export async function explainUbiquitousLanguageTerms(params: { domainId: string; domainVersion?: string }) {
  const domains = await getCollection('domains');

  // Use the existing utility to find the domain by id and version (or latest)
  const matches = getItemsFromCollectionByIdAndSemverOrLatest(domains, params.domainId, params.domainVersion);
  const domain = matches[0];

  if (!domain) {
    return {
      error: `Domain not found: ${params.domainId}${params.domainVersion ? ` (version ${params.domainVersion})` : ''}`,
    };
  }

  // Get ubiquitous language including subdomains
  const ubiquitousLanguageData = await getUbiquitousLanguageWithSubdomains(domain as any);
  const { domain: domainUL, subdomains, duplicateTerms } = ubiquitousLanguageData;

  // Extract terms from domain's ubiquitous language
  const domainTerms =
    domainUL?.data?.dictionary?.map((term: any) => ({
      term: term.name,
      description: term.summary,
      icon: term.icon,
      domainId: params.domainId,
      domainName: (domain.data as any).name || params.domainId,
      isDuplicate: duplicateTerms.has(term.name.toLowerCase()),
    })) || [];

  // Extract terms from subdomains
  const subdomainTerms = subdomains.flatMap(({ subdomain, ubiquitousLanguage }) => {
    if (!ubiquitousLanguage?.data?.dictionary) return [];
    return ubiquitousLanguage.data.dictionary.map((term: any) => ({
      term: term.name,
      description: term.summary,
      icon: term.icon,
      domainId: (subdomain.data as any).id,
      domainName: (subdomain.data as any).name || (subdomain.data as any).id,
      isSubdomain: true,
      isDuplicate: duplicateTerms.has(term.name.toLowerCase()),
    }));
  });

  const allTerms = [...domainTerms, ...subdomainTerms];

  if (allTerms.length === 0) {
    return {
      domainId: params.domainId,
      domainVersion: (domain.data as any).version,
      domainName: (domain.data as any).name || params.domainId,
      message: 'No ubiquitous language terms defined for this domain or its subdomains',
      terms: [],
      subdomainCount: subdomains.length,
    };
  }

  return {
    domainId: params.domainId,
    domainVersion: (domain.data as any).version,
    domainName: (domain.data as any).name || params.domainId,
    terms: allTerms,
    totalCount: allTerms.length,
    domainTermCount: domainTerms.length,
    subdomainTermCount: subdomainTerms.length,
    subdomainCount: subdomains.length,
    duplicateTerms: Array.from(duplicateTerms),
  };
}

// ============================================
// Data Product tools
// ============================================

/**
 * Get the inputs (resources consumed) for a data product
 * Returns fully hydrated input resources
 */
export async function getDataProductInputs(params: { dataProductId: string; dataProductVersion: string }) {
  const dataProduct = await getEntry('data-products', `${params.dataProductId}-${params.dataProductVersion}`);

  if (!dataProduct) {
    return {
      error: `Data product not found: ${params.dataProductId}-${params.dataProductVersion}`,
    };
  }

  const inputPointers = (dataProduct.data as any).inputs || [];

  if (inputPointers.length === 0) {
    return {
      dataProductId: params.dataProductId,
      dataProductVersion: params.dataProductVersion,
      message: 'No inputs found for this data product',
      inputs: [],
    };
  }

  // Fetch all collections that can be inputs (messages, channels, containers, services)
  const [allEvents, allCommands, allQueries, allChannels, allContainers, allServices] = await Promise.all([
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('channels'),
    getCollection('containers'),
    getCollection('services'),
  ]);

  const allResources = [...allEvents, ...allCommands, ...allQueries, ...allChannels, ...allContainers, ...allServices];

  // Hydrate inputs by finding matching resources
  const hydratedInputs = inputPointers
    .map((pointer: { id: string; version?: string }) => {
      const matches = getItemsFromCollectionByIdAndSemverOrLatest(allResources, pointer.id, pointer.version);
      const resource = matches[0];
      if (!resource) return null;

      return {
        id: (resource.data as any).id,
        version: (resource.data as any).version,
        name: (resource.data as any).name || (resource.data as any).id,
        summary: (resource.data as any).summary,
        collection: resource.collection,
      };
    })
    .filter(Boolean);

  return {
    dataProductId: params.dataProductId,
    dataProductVersion: params.dataProductVersion,
    dataProductName: (dataProduct.data as any).name || params.dataProductId,
    inputs: hydratedInputs,
    totalCount: hydratedInputs.length,
  };
}

/**
 * Get the outputs (resources produced) for a data product
 * Returns fully hydrated output resources with their contracts
 */
export async function getDataProductOutputs(params: { dataProductId: string; dataProductVersion: string }) {
  const dataProduct = await getEntry('data-products', `${params.dataProductId}-${params.dataProductVersion}`);

  if (!dataProduct) {
    return {
      error: `Data product not found: ${params.dataProductId}-${params.dataProductVersion}`,
    };
  }

  const outputPointers = (dataProduct.data as any).outputs || [];

  if (outputPointers.length === 0) {
    return {
      dataProductId: params.dataProductId,
      dataProductVersion: params.dataProductVersion,
      message: 'No outputs found for this data product',
      outputs: [],
    };
  }

  // Fetch all collections that can be outputs (messages, channels, containers, services)
  const [allEvents, allCommands, allQueries, allChannels, allContainers, allServices] = await Promise.all([
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('channels'),
    getCollection('containers'),
    getCollection('services'),
  ]);

  const allResources = [...allEvents, ...allCommands, ...allQueries, ...allChannels, ...allContainers, ...allServices];

  // Hydrate outputs by finding matching resources and including contract info
  const hydratedOutputs = outputPointers
    .map((pointer: { id: string; version?: string; contract?: { path: string; name: string; type?: string } }) => {
      const matches = getItemsFromCollectionByIdAndSemverOrLatest(allResources, pointer.id, pointer.version);
      const resource = matches[0];
      if (!resource) return null;

      const result: any = {
        id: (resource.data as any).id,
        version: (resource.data as any).version,
        name: (resource.data as any).name || (resource.data as any).id,
        summary: (resource.data as any).summary,
        collection: resource.collection,
      };

      // Include contract information if present
      if (pointer.contract) {
        const absoluteContractPath = getAbsoluteFilePathForAstroFile(dataProduct.filePath ?? '', pointer.contract.path);
        let contractContent: string | null = null;

        try {
          contractContent = fs.readFileSync(absoluteContractPath, 'utf-8');
        } catch {
          // File may not be accessible
        }

        result.contract = {
          name: pointer.contract.name,
          path: pointer.contract.path,
          format: getSchemaFormatFromURL(pointer.contract.path),
          type: pointer.contract.type,
          content: contractContent,
        };
      }

      return result;
    })
    .filter(Boolean);

  return {
    dataProductId: params.dataProductId,
    dataProductVersion: params.dataProductVersion,
    dataProductName: (dataProduct.data as any).name || params.dataProductId,
    outputs: hydratedOutputs,
    totalCount: hydratedOutputs.length,
  };
}

// ============================================
// Architecture Diagram (Mermaid) tools
// ============================================

const getNodesAndEdgesFunctions = {
  services: getNodesAndEdgesForService,
  events: getNodesAndEdgesForEvents,
  commands: getNodesAndEdgesForCommands,
  queries: getNodesAndEdgesForQueries,
  domains: getNodesAndEdgesForDomain,
  flows: getNodesAndEdgesForFlows,
  containers: getNodesAndEdgesForContainer,
  'data-products': getNodesAndEdgesForDataProduct,
};

/**
 * Get the architecture diagram for a resource as Mermaid code
 * Returns flowchart syntax that can be rendered or used for understanding architecture
 */
export async function getArchitectureDiagramAsMermaid(params: {
  resourceId: string;
  resourceVersion: string;
  resourceCollection: string;
}) {
  const { resourceId, resourceVersion, resourceCollection } = params;

  // Validate the collection is supported for visualisation
  if (!(resourceCollection in getNodesAndEdgesFunctions)) {
    return {
      error: `Collection '${resourceCollection}' does not support architecture diagrams. Supported collections: ${Object.keys(getNodesAndEdgesFunctions).join(', ')}`,
    };
  }

  try {
    // Get nodes and edges for this resource
    const { nodes, edges } = await getNodesAndEdgesFunctions[resourceCollection as keyof typeof getNodesAndEdgesFunctions]({
      id: resourceId,
      version: resourceVersion,
      mode: 'full',
      channelRenderMode: config.visualiser?.channels?.renderMode === 'single' ? 'single' : 'flat',
    });

    if (!nodes || nodes.length === 0) {
      return {
        error: `No diagram data available for ${resourceCollection}/${resourceId} (v${resourceVersion})`,
      };
    }

    // Convert to mermaid
    const mermaidCode = convertToMermaid(nodes, edges, {
      includeStyles: true,
      direction: 'LR',
    });

    return {
      resourceId,
      resourceVersion,
      resourceCollection,
      mermaidCode,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      visualiserUrl: `/visualiser/${resourceCollection}/${resourceId}/${resourceVersion}`,
    };
  } catch (error) {
    console.error('Error generating mermaid diagram:', error);
    return {
      error: `Failed to generate diagram for ${resourceCollection}/${resourceId} (v${resourceVersion})`,
    };
  }
}

// ============================================
// Tool metadata (descriptions)
// ============================================

export const toolDescriptions = {
  getResources:
    'Use this tool to get events, services, commands, queries, flows, domains, channels, entities from EventCatalog. Supports pagination via cursor and filtering by search term (searches name, id, and summary).',
  getResource: 'Use this tool to get a specific resource from EventCatalog by its id and version',
  getMessagesProducedOrConsumedByResource:
    'Use this tool to get the messages produced or consumed by a resource by its id and version. Look at the `sends` and `receives` properties to get the messages produced or consumed by the resource',
  getSchemaForResource:
    'Use this tool to get the schema or specifications (openapi or asyncapi or graphql) for a resource by its id and version',
  findResourcesByOwner: 'Use this tool to find all resources (services, events, commands, etc.) owned by a specific team or user',
  getProducersOfMessage: 'Use this tool to find which services produce (send) a specific message (event, command, or query)',
  getConsumersOfMessage: 'Use this tool to find which services consume (receive) a specific message (event, command, or query)',
  analyzeChangeImpact:
    'Use this tool to analyze the impact of changing a message. Returns all affected services (producers and consumers), the teams that own them, and the blast radius of the change',
  explainBusinessFlow:
    'Use this tool to get detailed information about a business flow (state machine). Returns the flow definition, steps, mermaid diagram if available, and related services',
  getTeams:
    'Use this tool to get all teams in EventCatalog. Teams are groups of users that own resources. Supports pagination via cursor.',
  getTeam: 'Use this tool to get a specific team by its id. Returns team details including members.',
  getUsers:
    'Use this tool to get all users in EventCatalog. Users are individuals who can own resources or be members of teams. Supports pagination via cursor.',
  getUser: 'Use this tool to get a specific user by their id. Returns user details including role and contact info.',
  findMessageBySchemaId:
    'Use this tool when a user shares a schema file (Avro, JSON Schema, Protobuf) and wants to find it in EventCatalog. Look for "x-eventcatalog-id" and "x-eventcatalog-version" in the schema - these may be properties in the schema OR in comments (e.g. // x-eventcatalog-id: OrderCreated). Pass the id as messageId. If version exists, pass it as messageVersion, otherwise omit it to get the latest version. Returns the message resource along with its producers and consumers.',
  explainUbiquitousLanguageTerms:
    'Use this tool to explain ubiquitous language terms from Domain-Driven Design for a specific domain. Returns the glossary of terms defined for the domain and its subdomains, including duplicate term detection.',
  getDataProductInputs:
    'Use this tool to get the inputs (resources consumed) for a data product. Returns fully hydrated input resources with their id, version, name, summary, and collection type.',
  getDataProductOutputs:
    'Use this tool to get the outputs (resources produced) for a data product. Returns fully hydrated output resources with their id, version, name, summary, collection type, and data contracts (if defined). Data contracts include the contract name, path, format, type, and content.',
  getArchitectureDiagramAsMermaid:
    'Use this tool to get the architecture diagram for a resource as Mermaid flowchart code. This shows how the resource connects to other resources (services, events, channels, etc.) in the architecture. The mermaid code can be rendered to visualize the architecture or used to understand relationships. Supported collections: events, commands, queries, services, domains, flows, containers, data-products.',
};
