import { describe, it, expect } from 'vitest';
import {
  validateReferences,
  validateOrphanMessages,
  validateDeprecatedReferences,
  validateDuplicateResourceIds,
} from '../src/validators/reference-validator';
import { validateBestPractices } from '../src/validators/best-practices-validator';
import { ParsedFile } from '../src/parser';
import { CatalogFile } from '../src/scanner';

const createParsedFile = (resourceType: any, resourceId: string, frontmatter: any, content: string = ''): ParsedFile => {
  const file: CatalogFile = {
    path: `/test/${resourceType}s/${resourceId}/index.mdx`,
    relativePath: `${resourceType}s/${resourceId}/index.mdx`,
    resourceType,
    resourceId,
  };

  return {
    file,
    frontmatter,
    content,
    raw: '',
  };
};

describe('refs/channel-exists', () => {
  it('should not report errors when channels in sends.to exist', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [
          {
            id: 'OrderPlaced',
            to: [{ id: 'orders-channel' }],
          },
        ],
      }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
      createParsedFile('channel', 'orders-channel', { id: 'orders-channel', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should report error when channel in sends.to does not exist', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [
          {
            id: 'OrderPlaced',
            to: [{ id: 'missing-channel' }],
          },
        ],
      }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    const channelErrors = errors.filter((e) => e.rule === 'refs/channel-exists');
    expect(channelErrors).toHaveLength(1);
    expect(channelErrors[0].message).toContain('missing-channel');
    expect(channelErrors[0].field).toBe('sends[0].to[0]');
  });

  it('should report error when channel in receives.from does not exist', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        receives: [
          {
            id: 'OrderPlaced',
            from: [{ id: 'nonexistent-channel' }],
          },
        ],
      }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    const channelErrors = errors.filter((e) => e.rule === 'refs/channel-exists');
    expect(channelErrors).toHaveLength(1);
    expect(channelErrors[0].message).toContain('nonexistent-channel');
    expect(channelErrors[0].field).toBe('receives[0].from[0]');
  });

  it('should validate channel version references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [
          {
            id: 'OrderPlaced',
            to: [{ id: 'orders-channel', version: '2.0.0' }],
          },
        ],
      }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
      createParsedFile('channel', 'orders-channel', { id: 'orders-channel', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    const channelErrors = errors.filter((e) => e.rule === 'refs/channel-exists');
    expect(channelErrors).toHaveLength(1);
    expect(channelErrors[0].message).toContain('version: 2.0.0');
  });

  it('should validate channel references from domains', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        sends: [
          {
            id: 'OrderPlaced',
            to: [{ id: 'missing-channel' }],
          },
        ],
      }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    const channelErrors = errors.filter((e) => e.rule === 'refs/channel-exists');
    expect(channelErrors).toHaveLength(1);
  });

  it('should handle multiple channels in a single sends entry', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [
          {
            id: 'OrderPlaced',
            to: [{ id: 'channel-a' }, { id: 'channel-b' }],
          },
        ],
      }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
      createParsedFile('channel', 'channel-a', { id: 'channel-a', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    const channelErrors = errors.filter((e) => e.rule === 'refs/channel-exists');
    expect(channelErrors).toHaveLength(1);
    expect(channelErrors[0].message).toContain('channel-b');
  });
});

describe('refs/container-exists', () => {
  it('should not report errors when containers in writesTo exist', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        writesTo: [{ id: 'orders-db' }],
      }),
      createParsedFile('dataStore', 'orders-db', { id: 'orders-db', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should report error when container in writesTo does not exist', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        writesTo: [{ id: 'missing-db' }],
      }),
    ];

    const errors = validateReferences(parsedFiles);
    const containerErrors = errors.filter((e) => e.rule === 'refs/container-exists');
    expect(containerErrors).toHaveLength(1);
    expect(containerErrors[0].message).toContain('missing-db');
    expect(containerErrors[0].field).toBe('writesTo');
  });

  it('should report error when container in readsFrom does not exist', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        readsFrom: [{ id: 'missing-cache' }],
      }),
    ];

    const errors = validateReferences(parsedFiles);
    const containerErrors = errors.filter((e) => e.rule === 'refs/container-exists');
    expect(containerErrors).toHaveLength(1);
    expect(containerErrors[0].message).toContain('missing-cache');
    expect(containerErrors[0].field).toBe('readsFrom');
  });

  it('should validate container version references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        writesTo: [{ id: 'orders-db', version: '2.0.0' }],
      }),
      createParsedFile('dataStore', 'orders-db', { id: 'orders-db', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // This will be refs/container-exists since writesTo field triggers it,
    // but version mismatch may trigger refs/valid-version-range depending on rule mapping
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toContain('orders-db');
  });

  it('should handle both writesTo and readsFrom', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        writesTo: [{ id: 'orders-db' }],
        readsFrom: [{ id: 'products-cache' }],
      }),
      createParsedFile('dataStore', 'orders-db', { id: 'orders-db', version: '1.0.0' }),
      createParsedFile('dataStore', 'products-cache', { id: 'products-cache', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });
});

describe('refs/orphan-messages', () => {
  it('should report orphan messages with no producer and no consumer', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('event', 'OrphanEvent', { id: 'OrphanEvent', version: '1.0.0' }),
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'OrderPlaced' }],
      }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
    ];

    const errors = validateOrphanMessages(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('refs/orphan-messages');
    expect(errors[0].message).toContain('OrphanEvent');
    expect(errors[0].message).toContain('no producer and no consumer');
  });

  it('should not report messages that have a producer (via sends)', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'OrderPlaced' }],
      }),
    ];

    const errors = validateOrphanMessages(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should not report messages that have a consumer (via receives)', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('command', 'CreateOrder', { id: 'CreateOrder', version: '1.0.0' }),
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        receives: [{ id: 'CreateOrder' }],
      }),
    ];

    const errors = validateOrphanMessages(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should not report messages that have producers field set on the message itself', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('event', 'OrderPlaced', {
        id: 'OrderPlaced',
        version: '1.0.0',
        producers: ['order-service'],
      }),
    ];

    const errors = validateOrphanMessages(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should not report messages that have consumers field set on the message itself', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('event', 'OrderPlaced', {
        id: 'OrderPlaced',
        version: '1.0.0',
        consumers: ['notification-service'],
      }),
    ];

    const errors = validateOrphanMessages(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should detect orphan commands and queries too', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('command', 'OrphanCommand', { id: 'OrphanCommand', version: '1.0.0' }),
      createParsedFile('query', 'OrphanQuery', { id: 'OrphanQuery', version: '1.0.0' }),
    ];

    const errors = validateOrphanMessages(parsedFiles);
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toContain('OrphanCommand');
    expect(errors[1].message).toContain('OrphanQuery');
  });

  it('should not report orphans for messages that exist in dependencies', () => {
    const parsedFiles: ParsedFile[] = [createParsedFile('event', 'ExternalEvent', { id: 'ExternalEvent', version: '1.0.0' })];

    const dependencies = {
      event: [{ id: 'ExternalEvent', version: '1.0.0' }],
    };

    const errors = validateOrphanMessages(parsedFiles, dependencies);
    expect(errors).toHaveLength(0);
  });

  it('should not report when domain sends the message', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('event', 'DomainEvent', { id: 'DomainEvent', version: '1.0.0' }),
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        sends: [{ id: 'DomainEvent' }],
      }),
    ];

    const errors = validateOrphanMessages(parsedFiles);
    expect(errors).toHaveLength(0);
  });
});

describe('best-practices/description-required', () => {
  it('should report when resource has no markdown body content', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'service',
        'order-service',
        {
          id: 'order-service',
          version: '1.0.0',
          summary: 'A service',
          owners: ['team-a'],
        },
        ''
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const descErrors = errors.filter((e) => e.rule === 'best-practices/description-required');
    expect(descErrors).toHaveLength(1);
    expect(descErrors[0].field).toBe('description');
  });

  it('should report when resource has only whitespace body content', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'service',
        'order-service',
        {
          id: 'order-service',
          version: '1.0.0',
          summary: 'A service',
          owners: ['team-a'],
        },
        '   \n  \n  '
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const descErrors = errors.filter((e) => e.rule === 'best-practices/description-required');
    expect(descErrors).toHaveLength(1);
  });

  it('should not report when resource has markdown body content', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'service',
        'order-service',
        {
          id: 'order-service',
          version: '1.0.0',
          summary: 'A service',
          owners: ['team-a'],
        },
        '\n## Overview\n\nThis service handles orders.'
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const descErrors = errors.filter((e) => e.rule === 'best-practices/description-required');
    expect(descErrors).toHaveLength(0);
  });
});

describe('best-practices/schema-required', () => {
  it('should report when event has no schemaPath', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'event',
        'OrderPlaced',
        {
          id: 'OrderPlaced',
          version: '1.0.0',
          summary: 'An event',
          owners: ['team-a'],
        },
        'Some content'
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const schemaErrors = errors.filter((e) => e.rule === 'best-practices/schema-required');
    expect(schemaErrors).toHaveLength(1);
    expect(schemaErrors[0].field).toBe('schemaPath');
    expect(schemaErrors[0].message).toContain('schemaPath');
  });

  it('should report when command has no schemaPath', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'command',
        'CreateOrder',
        {
          id: 'CreateOrder',
          version: '1.0.0',
          summary: 'A command',
          owners: ['team-a'],
        },
        'Some content'
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const schemaErrors = errors.filter((e) => e.rule === 'best-practices/schema-required');
    expect(schemaErrors).toHaveLength(1);
  });

  it('should report when query has no schemaPath', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'query',
        'GetOrder',
        {
          id: 'GetOrder',
          version: '1.0.0',
          summary: 'A query',
          owners: ['team-a'],
        },
        'Some content'
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const schemaErrors = errors.filter((e) => e.rule === 'best-practices/schema-required');
    expect(schemaErrors).toHaveLength(1);
  });

  it('should not report when event has schemaPath', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'event',
        'OrderPlaced',
        {
          id: 'OrderPlaced',
          version: '1.0.0',
          summary: 'An event',
          owners: ['team-a'],
          schemaPath: 'schema.json',
        },
        'Some content'
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const schemaErrors = errors.filter((e) => e.rule === 'best-practices/schema-required');
    expect(schemaErrors).toHaveLength(0);
  });

  it('should not report for services (non-message types)', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile(
        'service',
        'order-service',
        {
          id: 'order-service',
          version: '1.0.0',
          summary: 'A service',
          owners: ['team-a'],
        },
        'Some content'
      ),
    ];

    const errors = validateBestPractices(parsedFiles);
    const schemaErrors = errors.filter((e) => e.rule === 'best-practices/schema-required');
    expect(schemaErrors).toHaveLength(0);
  });
});

describe('versions/no-deprecated-references', () => {
  it('should warn when referencing a deprecated resource', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'OldEvent' }],
      }),
      createParsedFile('event', 'OldEvent', {
        id: 'OldEvent',
        version: '1.0.0',
        deprecated: true,
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('versions/no-deprecated-references');
    expect(errors[0].message).toContain('OldEvent');
    expect(errors[0].message).toContain('deprecated');
  });

  it('should not warn when referencing a non-deprecated resource', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'ActiveEvent' }],
      }),
      createParsedFile('event', 'ActiveEvent', {
        id: 'ActiveEvent',
        version: '1.0.0',
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should handle deprecated: false as not deprecated', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'ActiveEvent' }],
      }),
      createParsedFile('event', 'ActiveEvent', {
        id: 'ActiveEvent',
        version: '1.0.0',
        deprecated: false,
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should handle deprecated object format', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'OldEvent' }],
      }),
      createParsedFile('event', 'OldEvent', {
        id: 'OldEvent',
        version: '1.0.0',
        deprecated: { message: 'Use NewEvent instead', date: '2024-01-01' },
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('versions/no-deprecated-references');
  });

  it('should warn for deprecated service references from domains', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'old-service' }],
      }),
      createParsedFile('service', 'old-service', {
        id: 'old-service',
        version: '1.0.0',
        deprecated: true,
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('old-service');
  });

  it('should not warn for owner references to deprecated users/teams', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        owners: ['old-user'],
      }),
      createParsedFile('user', 'old-user', {
        id: 'old-user',
        deprecated: true,
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should return empty when no deprecated resources exist', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'OrderPlaced' }],
      }),
      createParsedFile('event', 'OrderPlaced', {
        id: 'OrderPlaced',
        version: '1.0.0',
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should match version-specific deprecated references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', {
        id: 'order-service',
        version: '1.0.0',
        sends: [{ id: 'OrderPlaced', version: '1.0.0' }],
      }),
      createParsedFile('event', 'OrderPlaced', {
        id: 'OrderPlaced',
        version: '1.0.0',
        deprecated: true,
      }),
      createParsedFile('event', 'OrderPlaced', {
        id: 'OrderPlaced',
        version: '2.0.0',
      }),
    ];

    const errors = validateDeprecatedReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('version: 1.0.0');
  });
});

describe('structure/duplicate-resource-ids', () => {
  it('should report duplicate resources with same type, id, and version', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', { id: 'order-service', version: '1.0.0' }),
      {
        ...createParsedFile('service', 'order-service', { id: 'order-service', version: '1.0.0' }),
        file: {
          path: '/test/domains/sales/services/order-service/index.mdx',
          relativePath: 'domains/sales/services/order-service/index.mdx',
          resourceType: 'service' as any,
          resourceId: 'order-service',
        },
      },
    ];

    const errors = validateDuplicateResourceIds(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('structure/duplicate-resource-ids');
    expect(errors[0].message).toContain('order-service');
    expect(errors[0].message).toContain('version: 1.0.0');
    expect(errors[0].message).toContain('also defined in');
  });

  it('should not report resources with same id but different versions', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', { id: 'order-service', version: '1.0.0' }),
      createParsedFile('service', 'order-service', { id: 'order-service', version: '2.0.0' }),
    ];

    const errors = validateDuplicateResourceIds(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should not report resources with same id but different types', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order', { id: 'order', version: '1.0.0' }),
      createParsedFile('entity', 'order', { id: 'order', version: '1.0.0' }),
    ];

    const errors = validateDuplicateResourceIds(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should detect duplicates using frontmatter.id over file resourceId', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('event', 'OrderPlaced', { id: 'order-placed', version: '1.0.0' }),
      {
        ...createParsedFile('event', 'order-placed', { id: 'order-placed', version: '1.0.0' }),
        file: {
          path: '/test/events/order-placed/index.mdx',
          relativePath: 'events/order-placed/index.mdx',
          resourceType: 'event' as any,
          resourceId: 'order-placed',
        },
      },
    ];

    const errors = validateDuplicateResourceIds(parsedFiles);
    expect(errors).toHaveLength(1);
  });

  it('should handle resources without version as "latest"', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('user', 'john-doe', { id: 'john-doe' }),
      {
        ...createParsedFile('user', 'john', { id: 'john-doe' }),
        file: {
          path: '/test/users/john.mdx',
          relativePath: 'users/john.mdx',
          resourceType: 'user' as any,
          resourceId: 'john',
        },
      },
    ];

    const errors = validateDuplicateResourceIds(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('version: latest');
  });

  it('should not report when all resources are unique', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'order-service', { id: 'order-service', version: '1.0.0' }),
      createParsedFile('service', 'user-service', { id: 'user-service', version: '1.0.0' }),
      createParsedFile('event', 'OrderPlaced', { id: 'OrderPlaced', version: '1.0.0' }),
    ];

    const errors = validateDuplicateResourceIds(parsedFiles);
    expect(errors).toHaveLength(0);
  });
});
