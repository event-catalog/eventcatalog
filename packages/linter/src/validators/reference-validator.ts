import { ParsedFile } from '../parser';
import { ValidationError, ResourceReference } from '../types';
import { ResourceType } from '../schemas';
import { CatalogDependencies } from '../config';
import { versionMatches, isValidVersionReference, sortVersions, LATEST } from '../utils/versions';
import { editDistance } from './unknown-field-validator';

interface ResourceIndex {
  [resourceType: string]: {
    [resourceId: string]: Set<string>;
  };
}

const MESSAGE_TYPES: ResourceType[] = ['event', 'command', 'query'];

const RESOURCE_TYPE_ALIASES: Partial<Record<ResourceType, ResourceType[]>> = {
  container: ['container', 'dataStore'],
  dataStore: ['container', 'dataStore'],
};

const normalizeResourceType = (type: unknown): ResourceType | undefined => {
  if (typeof type !== 'string') return undefined;

  const normalizedTypes: Record<string, ResourceType> = {
    agent: 'agent',
    agents: 'agent',
    adr: 'adr',
    adrs: 'adr',
    service: 'service',
    services: 'service',
    event: 'event',
    events: 'event',
    command: 'command',
    commands: 'command',
    query: 'query',
    queries: 'query',
    flow: 'flow',
    flows: 'flow',
    channel: 'channel',
    channels: 'channel',
    domain: 'domain',
    domains: 'domain',
    system: 'system',
    systems: 'system',
    user: 'user',
    users: 'user',
    team: 'team',
    teams: 'team',
    container: 'container',
    containers: 'container',
    dataStore: 'container',
    dataStores: 'container',
    'data-product': 'dataProduct',
    'data-products': 'dataProduct',
    dataProduct: 'dataProduct',
    dataProducts: 'dataProduct',
    entity: 'entity',
    entities: 'entity',
    diagram: 'diagram',
    diagrams: 'diagram',
  };

  return normalizedTypes[type];
};

const getReference = (value: unknown): ResourceReference | undefined => {
  if (typeof value === 'string') {
    return { id: value };
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const ref = value as Record<string, unknown>;
  if (typeof ref.id !== 'string') {
    return undefined;
  }

  return {
    id: ref.id,
    version: typeof ref.version === 'string' ? ref.version : undefined,
  };
};

const addReference = (references: ReferenceInfo[], value: unknown, possibleTypes: ResourceType[], field: string): void => {
  const ref = getReference(value);
  if (ref) {
    references.push({ ref, possibleTypes, field });
  }
};

const addReferences = (references: ReferenceInfo[], values: unknown, possibleTypes: ResourceType[], field: string): void => {
  if (!Array.isArray(values)) return;
  values.forEach((value, index) => {
    addReference(references, value, possibleTypes, `${field}[${index}]`);
  });
};

const addTriggerReferences = (references: ReferenceInfo[], receives: unknown): void => {
  if (!Array.isArray(receives)) return;
  receives.forEach((receive, receiveIndex) => {
    if (!receive || typeof receive !== 'object') return;
    addReferences(references, (receive as Record<string, unknown>).triggers, MESSAGE_TYPES, `receives[${receiveIndex}].triggers`);
  });
};

const addTypedReference = (references: ReferenceInfo[], value: unknown, field: string): void => {
  if (!value || typeof value !== 'object') return;
  const resourceType = normalizeResourceType((value as Record<string, unknown>).type);
  if (!resourceType) return;
  addReference(references, value, [resourceType], field);
};

export const buildResourceIndex = (parsedFiles: ParsedFile[], dependencies?: CatalogDependencies): ResourceIndex => {
  const index: ResourceIndex = {};

  for (const parsedFile of parsedFiles) {
    const { file, frontmatter } = parsedFile;
    const { resourceType } = file;

    // Use the frontmatter id field if present, otherwise fall back to filename/directory
    // This handles cases where:
    // - Filename is "aSmith.mdx" but frontmatter has id: "asmith"
    // - Directory is "e-commerce" but frontmatter has id: "E-Commerce"
    // - Directory is "UserService" but frontmatter has id: "user-service" (SentenceCase vs kebab-case)
    let resourceId = file.resourceId;
    if (frontmatter.id && typeof frontmatter.id === 'string') {
      resourceId = frontmatter.id;
    }

    if (!index[resourceType]) {
      index[resourceType] = {};
    }

    if (!index[resourceType][resourceId]) {
      index[resourceType][resourceId] = new Set();
    }

    if (frontmatter.version && typeof frontmatter.version === 'string') {
      index[resourceType][resourceId].add(frontmatter.version);
    } else {
      index[resourceType][resourceId].add('latest');
    }
  }

  // Add dependency entries to the index
  if (dependencies) {
    for (const [resourceType, entries] of Object.entries(dependencies)) {
      if (!index[resourceType]) {
        index[resourceType] = {};
      }
      for (const entry of entries) {
        if (!index[resourceType][entry.id]) {
          index[resourceType][entry.id] = new Set();
        }
        index[resourceType][entry.id].add(entry.version || 'latest');
      }
    }
  }

  return index;
};

/** Every resource type that shares an index bucket with the requested type (containers/dataStores). */
const expandTypes = (types: ResourceType[]): ResourceType[] => {
  const expanded = new Set<ResourceType>();
  for (const type of types) {
    for (const alias of RESOURCE_TYPE_ALIASES[type] || [type]) expanded.add(alias);
  }
  return Array.from(expanded);
};

const getAvailableVersions = (index: ResourceIndex, types: ResourceType[], id: string): string[] => {
  const versions = new Set<string>();
  for (const type of expandTypes(types)) {
    index[type]?.[id]?.forEach((version) => versions.add(version));
  }
  return Array.from(versions);
};

export type ReferenceResolution =
  | { status: 'ok' }
  | { status: 'missing-resource'; existsAsTypes: ResourceType[]; suggestion?: string }
  | { status: 'missing-version'; availableVersions: string[]; invalidReference: boolean; foundAsTypes: ResourceType[] };

/** Suggests a known id for a near-miss (`OrderCreatd` -> `OrderCreated`, `order-service` -> `Order-Service`). */
export const suggestResourceId = (id: string, candidates: Iterable<string>): string | undefined => {
  const lower = id.toLowerCase();
  const ids = Array.from(new Set(candidates));

  const caseMatch = ids.find((candidate) => candidate.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  const maxDistance = id.length < 5 ? 1 : 2;
  let best: { id: string; distance: number } | undefined;
  for (const candidate of ids) {
    const distance = editDistance(lower, candidate.toLowerCase());
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { id: candidate, distance };
    }
  }
  return best?.id;
};

/**
 * Resolves a reference against the index, distinguishing "no such resource" from
 * "resource exists but not at that version". Version matching mirrors core: `latest`,
 * exact, number-like (`1`, `v1`, `V1`), semver ranges and `1.x` prefixes.
 */
export const resolveReference = (
  ref: ResourceReference,
  possibleTypes: ResourceType[],
  index: ResourceIndex
): ReferenceResolution => {
  const types = expandTypes(possibleTypes);
  const foundAsTypes = types.filter((type) => index[type]?.[ref.id]);

  if (foundAsTypes.length === 0) {
    const existsAsTypes = (Object.keys(index) as ResourceType[]).filter(
      (type) => !types.includes(type) && type !== 'dataStore' && index[type]?.[ref.id]
    );
    const candidates = types.flatMap((type) => Object.keys(index[type] || {}));
    return { status: 'missing-resource', existsAsTypes, suggestion: suggestResourceId(ref.id, candidates) };
  }

  if (!ref.version || ref.version === LATEST) {
    return { status: 'ok' };
  }

  const availableVersions = getAvailableVersions(index, possibleTypes, ref.id);
  const invalidReference = !isValidVersionReference(ref.version);

  if (!invalidReference && availableVersions.some((version) => versionMatches(version, ref.version!))) {
    return { status: 'ok' };
  }

  return { status: 'missing-version', availableVersions: sortVersions(availableVersions), invalidReference, foundAsTypes };
};

const describeTypes = (types: ResourceType[]): string => types.join('/');

/** Builds the user-facing message for a reference that could not be resolved. */
export const describeUnresolvedReference = (
  ref: ResourceReference,
  possibleTypes: ResourceType[],
  resolution: Exclude<ReferenceResolution, { status: 'ok' }>
): string => {
  if (resolution.status === 'missing-resource') {
    const base = `Referenced ${describeTypes(possibleTypes)} "${ref.id}" does not exist`;
    if (resolution.suggestion) {
      return `${base}. Did you mean "${resolution.suggestion}"?`;
    }
    if (resolution.existsAsTypes.length > 0) {
      return `${base}. "${ref.id}" exists as a ${describeTypes(resolution.existsAsTypes)}, not a ${describeTypes(possibleTypes)}.`;
    }
    return base;
  }

  const typeLabel = describeTypes(resolution.foundAsTypes.length > 0 ? resolution.foundAsTypes : possibleTypes);
  const available =
    resolution.availableVersions.length > 0 ? ` Available versions: ${resolution.availableVersions.join(', ')}` : '';

  if (resolution.invalidReference) {
    return `Referenced ${typeLabel} "${ref.id}" has an invalid version reference "${ref.version}". Use a version (1.0.0, v1), a range (^1.0.0, 1.x) or "latest".${available}`;
  }

  return `Referenced ${typeLabel} "${ref.id}" does not have a version matching "${ref.version}".${available}`;
};

interface ReferenceInfo {
  ref: ResourceReference;
  possibleTypes: ResourceType[];
  field: string;
}

const extractReferences = (parsedFile: ParsedFile): ReferenceInfo[] => {
  const { file, frontmatter } = parsedFile;
  const references: ReferenceInfo[] = [];

  if (frontmatter.owners && Array.isArray(frontmatter.owners)) {
    frontmatter.owners.forEach((owner: unknown, index: number) => {
      if (owner && typeof owner === 'object' && 'collection' in owner) {
        const ownerType = normalizeResourceType((owner as Record<string, unknown>).collection);
        if (ownerType) {
          addReference(references, owner, [ownerType], `owners[${index}]`);
          return;
        }
      }
      addReference(references, owner, ['user', 'team'], `owners[${index}]`);
    });
  }

  addReferences(references, frontmatter.diagrams, ['diagram'], 'diagrams');

  if (frontmatter.resourceGroups && Array.isArray(frontmatter.resourceGroups)) {
    frontmatter.resourceGroups.forEach((group: unknown, groupIndex: number) => {
      if (!group || typeof group !== 'object') return;
      const items = (group as Record<string, unknown>).items;
      if (!Array.isArray(items)) return;
      items.forEach((item, itemIndex) =>
        addTypedReference(references, item, `resourceGroups[${groupIndex}].items[${itemIndex}]`)
      );
    });
  }

  if (file.resourceType === 'domain') {
    addReferences(references, frontmatter.services, ['service'], 'services');
    addReferences(references, frontmatter.agents, ['agent'], 'agents');
    addReferences(references, frontmatter.domains, ['domain'], 'domains');
    addReferences(references, frontmatter.systems, ['system'], 'systems');
    addReferences(references, frontmatter.entities, ['entity'], 'entities');
    addReferences(references, frontmatter['data-products'], ['dataProduct'], 'data-products');
    addReferences(references, frontmatter.dataProducts, ['dataProduct'], 'dataProducts');
    addReferences(references, frontmatter.flows, ['flow'], 'flows');
    addReferences(references, frontmatter.sends, MESSAGE_TYPES, 'sends');
    addReferences(references, frontmatter.receives, MESSAGE_TYPES, 'receives');
    addTriggerReferences(references, frontmatter.receives);
  }

  if (file.resourceType === 'service' || file.resourceType === 'agent') {
    addReferences(references, frontmatter.sends, MESSAGE_TYPES, 'sends');
    addReferences(references, frontmatter.receives, MESSAGE_TYPES, 'receives');
    addTriggerReferences(references, frontmatter.receives);
    addReferences(references, frontmatter.writesTo, ['container'], 'writesTo');
    addReferences(references, frontmatter.readsFrom, ['container'], 'readsFrom');
    addReferences(references, frontmatter.flows, ['flow'], 'flows');
  }

  if (file.resourceType === 'service') {
    addReferences(references, frontmatter.entities, ['entity'], 'entities');
  }

  if (file.resourceType === 'system') {
    addReferences(references, frontmatter.services, ['service'], 'services');
    addReferences(references, frontmatter.flows, ['flow'], 'flows');
    addReferences(references, frontmatter.entities, ['entity'], 'entities');
    addReferences(references, frontmatter.containers, ['container'], 'containers');
    addReferences(references, frontmatter.relationships, ['system'], 'relationships');
  }

  if (file.resourceType === 'flow' && frontmatter.steps && Array.isArray(frontmatter.steps)) {
    frontmatter.steps.forEach((step: Record<string, unknown>, index: number) => {
      if (step.message) {
        addReference(references, step.message, MESSAGE_TYPES, `steps[${index}].message`);
      }
      if (step.service) {
        addReference(references, step.service, ['service'], `steps[${index}].service`);
      }
      if (step.agent) {
        addReference(references, step.agent, ['agent'], `steps[${index}].agent`);
      }
      if (step.flow) {
        addReference(references, step.flow, ['flow'], `steps[${index}].flow`);
      }
      if (step.container) {
        addReference(references, step.container, ['container'], `steps[${index}].container`);
      }
      if (step.dataProduct) {
        addReference(references, step.dataProduct, ['dataProduct'], `steps[${index}].dataProduct`);
      }
    });
  }

  if (file.resourceType === 'entity' && frontmatter.properties && Array.isArray(frontmatter.properties)) {
    frontmatter.properties.forEach((prop: Record<string, unknown>, index: number) => {
      if (prop.references) {
        references.push({
          ref: { id: prop.references as string },
          possibleTypes: ['entity'],
          field: `properties[${index}].references`,
        });
      }
    });
    addReferences(references, frontmatter.services, ['service'], 'services');
    addReferences(references, frontmatter.domains, ['domain'], 'domains');
  }

  if (MESSAGE_TYPES.includes(file.resourceType)) {
    addReferences(references, frontmatter.producers, ['service'], 'producers');
    addReferences(references, frontmatter.consumers, ['service'], 'consumers');
    addReferences(references, frontmatter.channels, ['channel'], 'channels');
    addReferences(references, frontmatter.messageChannels, ['channel'], 'messageChannels');
  }

  if (file.resourceType === 'channel') {
    addReferences(references, frontmatter.channels, ['channel'], 'channels');
    addReferences(references, frontmatter.routes, ['channel'], 'routes');
    if (frontmatter.messages && Array.isArray(frontmatter.messages)) {
      frontmatter.messages.forEach((message: unknown, index: number) => {
        if (!message || typeof message !== 'object') return;
        const messageType = normalizeResourceType((message as Record<string, unknown>).collection);
        if (messageType && MESSAGE_TYPES.includes(messageType)) {
          addReference(references, message, [messageType], `messages[${index}]`);
        }
      });
    }
  }

  if (file.resourceType === 'container' || file.resourceType === 'dataStore') {
    addReferences(references, frontmatter.services, ['service'], 'services');
    addReferences(references, frontmatter.servicesThatWriteToContainer, ['service'], 'servicesThatWriteToContainer');
    addReferences(references, frontmatter.servicesThatReadFromContainer, ['service'], 'servicesThatReadFromContainer');
    addReferences(references, frontmatter.dataProductsThatWriteToContainer, ['dataProduct'], 'dataProductsThatWriteToContainer');
    addReferences(
      references,
      frontmatter.dataProductsThatReadFromContainer,
      ['dataProduct'],
      'dataProductsThatReadFromContainer'
    );
  }

  if (file.resourceType === 'dataProduct') {
    const dataProductLinkTypes: ResourceType[] = [
      'event',
      'command',
      'query',
      'service',
      'agent',
      'system',
      'container',
      'channel',
      'dataProduct',
    ];
    addReferences(references, frontmatter.inputs, dataProductLinkTypes, 'inputs');
    addReferences(references, frontmatter.outputs, dataProductLinkTypes, 'outputs');
  }

  if (file.resourceType === 'adr') {
    if (frontmatter.decisionMakers && Array.isArray(frontmatter.decisionMakers)) {
      frontmatter.decisionMakers.forEach((owner: unknown, index: number) => {
        addReference(references, owner, ['user', 'team'], `decisionMakers[${index}]`);
      });
    }
    if (frontmatter.appliesTo && Array.isArray(frontmatter.appliesTo)) {
      frontmatter.appliesTo.forEach((target: unknown, index: number) => {
        addTypedReference(references, target, `appliesTo[${index}]`);
      });
    }
    addReferences(references, frontmatter.supersedes, ['adr'], 'supersedes');
    addReferences(references, frontmatter.supersededBy, ['adr'], 'supersededBy');
    addReferences(references, frontmatter.amends, ['adr'], 'amends');
    addReferences(references, frontmatter.amendedBy, ['adr'], 'amendedBy');
    addReferences(references, frontmatter.related, ['adr'], 'related');
  }

  if (file.resourceType === 'team' && frontmatter.members && Array.isArray(frontmatter.members)) {
    frontmatter.members.forEach((member: unknown, index: number) => {
      addReference(references, member, ['user'], `members[${index}]`);
    });
  }

  if (file.resourceType === 'user' || file.resourceType === 'team') {
    addReferences(references, frontmatter.ownedAgents, ['agent'], 'ownedAgents');
    addReferences(references, frontmatter.ownedDomains, ['domain'], 'ownedDomains');
    addReferences(references, frontmatter.ownedSystems, ['system'], 'ownedSystems');
    addReferences(references, frontmatter.ownedServices, ['service'], 'ownedServices');
    addReferences(references, frontmatter.ownedEvents, ['event'], 'ownedEvents');
    addReferences(references, frontmatter.ownedCommands, ['command'], 'ownedCommands');
    addReferences(references, frontmatter.ownedQueries, ['query'], 'ownedQueries');
  }

  if (file.resourceType === 'user') {
    addReferences(references, frontmatter.associatedTeams, ['team'], 'associatedTeams');
  }

  return references;
};

// Extract channel references from sends/receives to/from arrays
const extractChannelReferences = (parsedFile: ParsedFile): ReferenceInfo[] => {
  const { file, frontmatter } = parsedFile;
  const references: ReferenceInfo[] = [];

  if (file.resourceType !== 'service' && file.resourceType !== 'domain' && file.resourceType !== 'agent') {
    return references;
  }

  const extractFromPointers = (pointers: any[], parentField: string) => {
    if (!Array.isArray(pointers)) return;
    pointers.forEach((pointer: any, idx: number) => {
      if (pointer.to && Array.isArray(pointer.to)) {
        pointer.to.forEach((channelRef: any, cIdx: number) => {
          if (channelRef && channelRef.id) {
            references.push({
              ref: { id: channelRef.id, version: channelRef.version },
              possibleTypes: ['channel'],
              field: `${parentField}[${idx}].to[${cIdx}]`,
            });
          }
        });
      }
      if (pointer.from && Array.isArray(pointer.from)) {
        pointer.from.forEach((channelRef: any, cIdx: number) => {
          if (channelRef && channelRef.id) {
            references.push({
              ref: { id: channelRef.id, version: channelRef.version },
              possibleTypes: ['channel'],
              field: `${parentField}[${idx}].from[${cIdx}]`,
            });
          }
        });
      }
    });
  };

  if (frontmatter.sends && Array.isArray(frontmatter.sends)) {
    extractFromPointers(frontmatter.sends, 'sends');
  }
  if (frontmatter.receives && Array.isArray(frontmatter.receives)) {
    extractFromPointers(frontmatter.receives, 'receives');
  }

  return references;
};

export const validateReferences = (parsedFiles: ParsedFile[], dependencies?: CatalogDependencies): ValidationError[] => {
  const index = buildResourceIndex(parsedFiles, dependencies);
  const errors: ValidationError[] = [];

  for (const parsedFile of parsedFiles) {
    const references = extractReferences(parsedFile);

    for (const { ref, possibleTypes, field } of references) {
      const resolution = resolveReference(ref, possibleTypes, index);
      if (resolution.status === 'ok') continue;

      let rule = resolution.status === 'missing-version' ? 'refs/valid-version-range' : 'refs/resource-exists';
      if (field === 'owners' || field.startsWith('owners[') || field.startsWith('decisionMakers[')) {
        rule = 'refs/owner-exists';
      } else if (
        field.startsWith('writesTo') ||
        field.startsWith('readsFrom') ||
        field.includes('container') ||
        field.includes('Container')
      ) {
        rule = 'refs/container-exists';
      } else if (
        field.includes('channel') ||
        field.includes('Channel') ||
        field.includes('.to[') ||
        field.includes('.from[') ||
        field.startsWith('routes')
      ) {
        rule = 'refs/channel-exists';
      }

      errors.push({
        type: 'reference',
        resource: `${parsedFile.file.resourceType}/${parsedFile.file.resourceId}`,
        field,
        message: describeUnresolvedReference(ref, possibleTypes, resolution),
        file: parsedFile.file.relativePath,
        rule,
      });
    }

    // Validate channel references from sends/receives to/from
    const channelRefs = extractChannelReferences(parsedFile);
    for (const { ref, possibleTypes, field } of channelRefs) {
      const resolution = resolveReference(ref, possibleTypes, index);
      if (resolution.status === 'ok') continue;

      errors.push({
        type: 'reference',
        resource: `${parsedFile.file.resourceType}/${parsedFile.file.resourceId}`,
        field,
        message: describeUnresolvedReference(ref, possibleTypes, resolution),
        file: parsedFile.file.relativePath,
        rule: 'refs/channel-exists',
      });
    }
  }

  return errors;
};

// Detect messages (events/commands/queries) with no producer and no consumer
export const validateOrphanMessages = (parsedFiles: ParsedFile[], dependencies?: CatalogDependencies): ValidationError[] => {
  const errors: ValidationError[] = [];
  const messageTypes: ResourceType[] = ['event', 'command', 'query'];

  // Collect all message IDs
  const messageFiles = parsedFiles.filter((pf) => messageTypes.includes(pf.file.resourceType));

  if (messageFiles.length === 0) return errors;

  // Build sets of produced and consumed message IDs
  const producedMessages = new Set<string>();
  const consumedMessages = new Set<string>();

  for (const parsedFile of parsedFiles) {
    const { file, frontmatter } = parsedFile;

    if (file.resourceType === 'service' || file.resourceType === 'domain' || file.resourceType === 'agent') {
      if (frontmatter.sends && Array.isArray(frontmatter.sends)) {
        frontmatter.sends.forEach((ref: any) => {
          if (ref && ref.id) producedMessages.add(ref.id);
        });
      }
      if (frontmatter.receives && Array.isArray(frontmatter.receives)) {
        frontmatter.receives.forEach((ref: any) => {
          if (ref && ref.id) consumedMessages.add(ref.id);
        });
      }
    }

    // Also check producers/consumers fields on messages themselves
    if (messageTypes.includes(file.resourceType)) {
      if (frontmatter.producers && Array.isArray(frontmatter.producers) && frontmatter.producers.length > 0) {
        const msgId = (frontmatter.id as string) || file.resourceId;
        producedMessages.add(msgId);
      }
      if (frontmatter.consumers && Array.isArray(frontmatter.consumers) && frontmatter.consumers.length > 0) {
        const msgId = (frontmatter.id as string) || file.resourceId;
        consumedMessages.add(msgId);
      }
    }
  }

  // Also consider dependency messages as having producers/consumers
  if (dependencies) {
    for (const [type, entries] of Object.entries(dependencies)) {
      if (messageTypes.includes(type as ResourceType)) {
        entries.forEach((entry) => {
          // Dependencies are external, treat them as having both producers and consumers
          producedMessages.add(entry.id);
          consumedMessages.add(entry.id);
        });
      }
    }
  }

  // Check each message for orphan status
  for (const parsedFile of messageFiles) {
    const msgId = (parsedFile.frontmatter.id as string) || parsedFile.file.resourceId;
    const isProduced = producedMessages.has(msgId);
    const isConsumed = consumedMessages.has(msgId);

    if (!isProduced && !isConsumed) {
      errors.push({
        type: 'reference',
        resource: `${parsedFile.file.resourceType}/${parsedFile.file.resourceId}`,
        field: 'id',
        message: `${parsedFile.file.resourceType} "${msgId}" has no producer and no consumer`,
        file: parsedFile.file.relativePath,
        rule: 'refs/orphan-messages',
      });
    }
  }

  return errors;
};

// Detect references to deprecated resources
export const validateDeprecatedReferences = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Build an index of deprecated resources
  const deprecatedIndex: Record<string, Set<string>> = {};
  for (const parsedFile of parsedFiles) {
    const { file, frontmatter } = parsedFile;
    if (frontmatter.deprecated && frontmatter.deprecated !== false) {
      const resourceId = (frontmatter.id as string) || file.resourceId;
      const key = `${file.resourceType}:${resourceId}`;
      if (!deprecatedIndex[key]) {
        deprecatedIndex[key] = new Set();
      }
      if (frontmatter.version && typeof frontmatter.version === 'string') {
        deprecatedIndex[key].add(frontmatter.version);
      } else {
        deprecatedIndex[key].add('*'); // All versions deprecated
      }
    }
  }

  if (Object.keys(deprecatedIndex).length === 0) return errors;

  const isDeprecated = (type: string, id: string, version?: string): boolean => {
    const key = `${type}:${id}`;
    const versions = deprecatedIndex[key];
    if (!versions) return false;
    if (versions.has('*')) return true;
    if (version && versions.has(version)) return true;
    // For 'latest' or no version, check if any version is deprecated
    if (!version || version === 'latest') return versions.size > 0;
    return false;
  };

  for (const parsedFile of parsedFiles) {
    const references = extractReferences(parsedFile);

    for (const { ref, possibleTypes, field } of references) {
      // Skip owner references for this check
      if (field === 'owners' || field.startsWith('owners[') || field === 'members' || field.startsWith('members[')) continue;

      for (const type of possibleTypes) {
        if (isDeprecated(type, ref.id, ref.version)) {
          const versionStr = ref.version ? ` (version: ${ref.version})` : '';
          errors.push({
            type: 'reference',
            resource: `${parsedFile.file.resourceType}/${parsedFile.file.resourceId}`,
            field,
            message: `Referenced ${type} "${ref.id}"${versionStr} is deprecated`,
            file: parsedFile.file.relativePath,
            rule: 'versions/no-deprecated-references',
          });
          break; // Only report once per reference
        }
      }
    }
  }

  return errors;
};

// Detect duplicate resource IDs (same type, same id, same version)
export const validateDuplicateResourceIds = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Track seen resources: key = "type:id:version", value = file path
  const seen: Record<string, string> = {};

  for (const parsedFile of parsedFiles) {
    const { file, frontmatter } = parsedFile;
    const resourceId = (frontmatter.id as string) || file.resourceId;
    const version = (frontmatter.version as string) || 'latest';
    const key = `${file.resourceType}:${resourceId}:${version}`;

    if (seen[key]) {
      errors.push({
        type: 'reference',
        resource: `${file.resourceType}/${file.resourceId}`,
        field: 'id',
        message: `Duplicate ${file.resourceType} "${resourceId}" (version: ${version}) — also defined in ${seen[key]}`,
        file: file.relativePath,
        rule: 'structure/duplicate-resource-ids',
      });
    } else {
      seen[key] = file.relativePath;
    }
  }

  return errors;
};
