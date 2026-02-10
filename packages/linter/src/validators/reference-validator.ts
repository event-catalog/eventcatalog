import { ParsedFile } from '../parser';
import { ValidationError, ResourceReference } from '../types';
import { ResourceType } from '../schemas';
import { CatalogDependencies } from '../config';
import semver from 'semver';

interface ResourceIndex {
  [resourceType: string]: {
    [resourceId: string]: Set<string>;
  };
}

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

const checkResourceExists = (ref: ResourceReference, resourceType: ResourceType, index: ResourceIndex): boolean => {
  const resourceVersions = index[resourceType]?.[ref.id];

  if (!resourceVersions || resourceVersions.size === 0) {
    return false;
  }

  if (!ref.version) {
    return true;
  }

  const refVersion = ref.version === 'latest' ? ref.version : ref.version;
  const availableVersions = Array.from(resourceVersions);

  // Handle 'latest' specifically
  if (refVersion === 'latest') {
    return availableVersions.includes('latest') || availableVersions.length > 0;
  }

  // Check for exact match first
  if (availableVersions.includes(refVersion)) {
    return true;
  }

  // Handle semver patterns like '0.0.x', '^1.0.0', '~1.2.0', etc.
  try {
    // Filter out 'latest' from available versions for semver matching
    const semverVersions = availableVersions.filter((v) => v !== 'latest' && semver.valid(v));

    // Check if any available version satisfies the requested version pattern
    for (const availableVersion of semverVersions) {
      if (semver.satisfies(availableVersion, refVersion)) {
        return true;
      }
    }

    // Special handling for patterns like '0.0.x' which aren't standard semver ranges
    if (refVersion.includes('.x')) {
      const pattern = refVersion.replace(/\.x/g, '');
      for (const availableVersion of semverVersions) {
        if (availableVersion.startsWith(pattern)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    // If semver parsing fails, fall back to exact string match
    return availableVersions.includes(refVersion);
  }
};

interface ReferenceInfo {
  ref: ResourceReference;
  possibleTypes: ResourceType[];
  field: string;
}

const extractReferences = (parsedFile: ParsedFile): ReferenceInfo[] => {
  const { file, frontmatter } = parsedFile;
  const references: ReferenceInfo[] = [];

  if (file.resourceType === 'domain') {
    if (frontmatter.services && Array.isArray(frontmatter.services)) {
      frontmatter.services.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['service'], field: 'services' });
      });
    }
    if (frontmatter.domains && Array.isArray(frontmatter.domains)) {
      frontmatter.domains.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['domain'], field: 'domains' });
      });
    }
    if (frontmatter.entities && Array.isArray(frontmatter.entities)) {
      frontmatter.entities.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['entity'], field: 'entities' });
      });
    }
  }

  if (file.resourceType === 'service') {
    if (frontmatter.sends && Array.isArray(frontmatter.sends)) {
      frontmatter.sends.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['event', 'command', 'query'], field: 'sends' });
      });
    }
    if (frontmatter.receives && Array.isArray(frontmatter.receives)) {
      frontmatter.receives.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['event', 'command', 'query'], field: 'receives' });
      });
    }
    if (frontmatter.entities && Array.isArray(frontmatter.entities)) {
      frontmatter.entities.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['entity'], field: 'entities' });
      });
    }
    if (frontmatter.writesTo && Array.isArray(frontmatter.writesTo)) {
      frontmatter.writesTo.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['dataStore'], field: 'writesTo' });
      });
    }
    if (frontmatter.readsFrom && Array.isArray(frontmatter.readsFrom)) {
      frontmatter.readsFrom.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['dataStore'], field: 'readsFrom' });
      });
    }
  }

  if (file.resourceType === 'flow' && frontmatter.steps && Array.isArray(frontmatter.steps)) {
    frontmatter.steps.forEach((step: Record<string, unknown>, index: number) => {
      if (step.message) {
        references.push({
          ref: step.message as ResourceReference,
          possibleTypes: ['event', 'command', 'query'],
          field: `steps[${index}].message`,
        });
      }
      if (step.service) {
        references.push({ ref: step.service as ResourceReference, possibleTypes: ['service'], field: `steps[${index}].service` });
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
  }

  if (frontmatter.owners && Array.isArray(frontmatter.owners)) {
    frontmatter.owners.forEach((owner: string) => {
      references.push({ ref: { id: owner }, possibleTypes: ['user', 'team'], field: 'owners' });
    });
  }

  if (file.resourceType === 'team' && frontmatter.members && Array.isArray(frontmatter.members)) {
    frontmatter.members.forEach((member: string) => {
      references.push({ ref: { id: member }, possibleTypes: ['user'], field: 'members' });
    });
  }

  return references;
};

// Extract channel references from sends/receives to/from arrays
const extractChannelReferences = (parsedFile: ParsedFile): ReferenceInfo[] => {
  const { file, frontmatter } = parsedFile;
  const references: ReferenceInfo[] = [];

  if (file.resourceType !== 'service' && file.resourceType !== 'domain') {
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
      const found = possibleTypes.some((type) => checkResourceExists(ref, type, index));

      if (!found) {
        const versionStr = ref.version ? ` (version: ${ref.version})` : '';
        const typeStr = possibleTypes.length === 1 ? possibleTypes[0] : possibleTypes.join('/');

        let rule = 'refs/resource-exists';
        if (field === 'owners') {
          rule = 'refs/owner-exists';
        } else if (field === 'writesTo' || field === 'readsFrom') {
          rule = 'refs/container-exists';
        } else if (ref.version) {
          rule = 'refs/valid-version-range';
        }

        errors.push({
          type: 'reference',
          resource: `${parsedFile.file.resourceType}/${parsedFile.file.resourceId}`,
          field,
          message: `Referenced ${typeStr} "${ref.id}"${versionStr} does not exist`,
          file: parsedFile.file.relativePath,
          rule,
        });
      }
    }

    // Validate channel references from sends/receives to/from
    const channelRefs = extractChannelReferences(parsedFile);
    for (const { ref, possibleTypes, field } of channelRefs) {
      const found = possibleTypes.some((type) => checkResourceExists(ref, type, index));

      if (!found) {
        const versionStr = ref.version ? ` (version: ${ref.version})` : '';
        errors.push({
          type: 'reference',
          resource: `${parsedFile.file.resourceType}/${parsedFile.file.resourceId}`,
          field,
          message: `Referenced channel "${ref.id}"${versionStr} does not exist`,
          file: parsedFile.file.relativePath,
          rule: 'refs/channel-exists',
        });
      }
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

    if (file.resourceType === 'service' || file.resourceType === 'domain') {
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
      if (field === 'owners' || field === 'members') continue;

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
