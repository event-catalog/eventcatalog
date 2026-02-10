import { describe, it, expect } from 'vitest';
import { buildResourceIndex, validateReferences } from '../src/validators/reference-validator';
import { ParsedFile } from '../src/parser';
import { CatalogFile } from '../src/scanner';

const createParsedFile = (resourceType: any, resourceId: string, frontmatter: any): ParsedFile => {
  const file: CatalogFile = {
    path: `/test/${resourceType}s/${resourceId}/index.mdx`,
    relativePath: `${resourceType}s/${resourceId}/index.mdx`,
    resourceType,
    resourceId,
  };

  return {
    file,
    frontmatter,
    content: '',
    raw: '',
  };
};

describe('buildResourceIndex', () => {
  it('should build index with resources and versions', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', { id: 'user-service', version: '1.0.0' }),
      createParsedFile('service', 'user-service', { id: 'user-service', version: '2.0.0' }),
      createParsedFile('event', 'user-created', { id: 'user-created', version: '1.0.0' }),
      createParsedFile('user', 'john-doe', {}),
    ];

    const index = buildResourceIndex(parsedFiles);

    expect(index.service['user-service']).toBeDefined();
    expect(index.service['user-service'].has('1.0.0')).toBe(true);
    expect(index.service['user-service'].has('2.0.0')).toBe(true);
    expect(index.event['user-created'].has('1.0.0')).toBe(true);
    expect(index.user['john-doe']).toBeDefined();
  });

  it('should fall back to file.resourceId when frontmatter.id is not defined', () => {
    const parsedFiles: ParsedFile[] = [
      // No frontmatter.id, should use file.resourceId from path
      createParsedFile('service', 'user-service', { version: '1.0.0' }),
      createParsedFile('event', 'order-created', { version: '2.0.0' }),
    ];

    const index = buildResourceIndex(parsedFiles);

    // Should use file.resourceId when frontmatter.id is not present
    expect(index.service['user-service']).toBeDefined();
    expect(index.service['user-service'].has('1.0.0')).toBe(true);
    expect(index.event['order-created']).toBeDefined();
    expect(index.event['order-created'].has('2.0.0')).toBe(true);
  });

  it('should use frontmatter.id for services/events/channels when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      // file.resourceId from path is 'UserService' (SentenceCase), but frontmatter.id is 'user-service' (kebab-case)
      createParsedFile('service', 'UserService', { id: 'user-service', version: '1.0.0' }),
      // file.resourceId from path is 'UserCreated' (SentenceCase), but frontmatter.id is 'user-created' (kebab-case)
      createParsedFile('event', 'UserCreated', { id: 'user-created', version: '1.0.0' }),
      // file.resourceId from path is 'OrderCreatedChannel' (SentenceCase), but frontmatter.id is 'order-created-channel' (kebab-case)
      createParsedFile('channel', 'OrderCreatedChannel', { id: 'order-created-channel', version: '1.0.0' }),
    ];

    const index = buildResourceIndex(parsedFiles);

    // Should use frontmatter.id, not file.resourceId
    expect(index.service['user-service']).toBeDefined();
    expect(index.service['user-service'].has('1.0.0')).toBe(true);
    expect(index.event['user-created']).toBeDefined();
    expect(index.event['user-created'].has('1.0.0')).toBe(true);
    expect(index.channel['order-created-channel']).toBeDefined();
    expect(index.channel['order-created-channel'].has('1.0.0')).toBe(true);

    // Should NOT have entries for the path-based IDs
    expect(index.service['UserService']).toBeUndefined();
    expect(index.event['UserCreated']).toBeUndefined();
    expect(index.channel['OrderCreatedChannel']).toBeUndefined();
  });

  it('should use frontmatter.id for commands/queries when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      // file.resourceId from path is 'CreateUser' (SentenceCase), but frontmatter.id is 'create-user' (kebab-case)
      createParsedFile('command', 'CreateUser', { id: 'create-user', version: '1.0.0' }),
      // file.resourceId from path is 'GetUserProfile' (SentenceCase), but frontmatter.id is 'get-user-profile' (kebab-case)
      createParsedFile('query', 'GetUserProfile', { id: 'get-user-profile', version: '1.0.0' }),
    ];

    const index = buildResourceIndex(parsedFiles);

    // Should use frontmatter.id, not file.resourceId
    expect(index.command['create-user']).toBeDefined();
    expect(index.command['create-user'].has('1.0.0')).toBe(true);
    expect(index.query['get-user-profile']).toBeDefined();
    expect(index.query['get-user-profile'].has('1.0.0')).toBe(true);

    // Should NOT have entries for the path-based IDs
    expect(index.command['CreateUser']).toBeUndefined();
    expect(index.query['GetUserProfile']).toBeUndefined();
  });

  it('should use frontmatter.id for entities when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      // file.resourceId from path is 'UserEntity' (SentenceCase), but frontmatter.id is 'user-entity' (kebab-case)
      createParsedFile('entity', 'UserEntity', { id: 'user-entity', version: '1.0.0' }),
    ];

    const index = buildResourceIndex(parsedFiles);

    // Should use frontmatter.id, not file.resourceId
    expect(index.entity['user-entity']).toBeDefined();
    expect(index.entity['user-entity'].has('1.0.0')).toBe(true);

    // Should NOT have entries for the path-based IDs
    expect(index.entity['UserEntity']).toBeUndefined();
  });

  it('should use frontmatter.id for flows when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      // file.resourceId from path is 'OrderFlow' (SentenceCase), but frontmatter.id is 'order-flow' (kebab-case)
      createParsedFile('flow', 'OrderFlow', { id: 'order-flow', version: '1.0.0' }),
    ];

    const index = buildResourceIndex(parsedFiles);

    // Should use frontmatter.id, not file.resourceId
    expect(index.flow['order-flow']).toBeDefined();
    expect(index.flow['order-flow'].has('1.0.0')).toBe(true);

    // Should NOT have entries for the path-based IDs
    expect(index.flow['OrderFlow']).toBeUndefined();
  });
});

describe('validateReferences', () => {
  it('should not report errors for valid references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'order-service' }],
        entities: [{ id: 'order', version: '1.0.0' }],
      }),
      createParsedFile('service', 'order-service', { id: 'order-service', version: '1.0.0' }),
      createParsedFile('entity', 'order', { id: 'order', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should use frontmatter.id for service references when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'order-service' }], // References frontmatter.id (kebab-case)
      }),
      // file.resourceId is 'OrderService' (SentenceCase), but frontmatter.id is 'order-service' (kebab-case)
      createParsedFile('service', 'OrderService', { id: 'order-service', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // Should pass because frontmatter.id matches the reference
    expect(errors).toHaveLength(0);
  });

  it('should use frontmatter.id for entity references when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        entities: [{ id: 'order-entity', version: '1.0.0' }], // References frontmatter.id (kebab-case)
      }),
      // file.resourceId is 'OrderEntity' (SentenceCase), but frontmatter.id is 'order-entity' (kebab-case)
      createParsedFile('entity', 'OrderEntity', { id: 'order-entity', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // Should pass because frontmatter.id matches the reference
    expect(errors).toHaveLength(0);
  });

  it('should use frontmatter.id for entity property references when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('entity', 'user-entity', {
        id: 'user-entity',
        version: '1.0.0',
        properties: [
          {
            name: 'address',
            references: 'address-entity', // References frontmatter.id (kebab-case)
          },
        ],
      }),
      // file.resourceId is 'AddressEntity' (SentenceCase), but frontmatter.id is 'address-entity' (kebab-case)
      createParsedFile('entity', 'AddressEntity', { id: 'address-entity', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // Should pass because frontmatter.id matches the reference
    expect(errors).toHaveLength(0);
  });

  it('should report errors for missing references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'missing-service' }],
      }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('reference');
    expect(errors[0].message).toContain('missing-service');
  });

  it('should report errors for wrong version references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        id: 'user-service',
        version: '1.0.0',
        sends: [{ id: 'user-created', version: '2.0.0' }],
      }),
      createParsedFile('event', 'user-created', { id: 'user-created', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('version: 2.0.0');
  });

  it('should check message references in multiple types', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        id: 'user-service',
        version: '1.0.0',
        sends: [{ id: 'user-updated' }],
      }),
      createParsedFile('event', 'user-updated', { id: 'user-updated', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should use frontmatter.id for command references when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        id: 'user-service',
        version: '1.0.0',
        receives: [{ id: 'create-user' }], // References frontmatter.id (kebab-case)
      }),
      // file.resourceId is 'CreateUser' (SentenceCase), but frontmatter.id is 'create-user' (kebab-case)
      createParsedFile('command', 'CreateUser', { id: 'create-user', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // Should pass because frontmatter.id matches the reference
    expect(errors).toHaveLength(0);
  });

  it('should use frontmatter.id for query references when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        id: 'user-service',
        version: '1.0.0',
        receives: [{ id: 'get-user-profile' }], // References frontmatter.id (kebab-case)
      }),
      // file.resourceId is 'GetUserProfile' (SentenceCase), but frontmatter.id is 'get-user-profile' (kebab-case)
      createParsedFile('query', 'GetUserProfile', { id: 'get-user-profile', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // Should pass because frontmatter.id matches the reference
    expect(errors).toHaveLength(0);
  });

  it('should validate flow step references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('flow', 'user-registration', {
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            title: 'Send command',
            message: { id: 'create-user', version: '1.0.0' },
          },
          {
            id: 'step2',
            title: 'Process in service',
            service: { id: 'missing-service', version: '1.0.0' },
          },
        ],
      }),
      createParsedFile('command', 'create-user', { id: 'create-user', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toContain('steps[1].service');
  });

  it('should use frontmatter.id for flow step message references when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('flow', 'order-flow', {
        id: 'order-flow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            title: 'Create order',
            message: { id: 'order-created', version: '1.0.0' }, // References frontmatter.id (kebab-case)
          },
        ],
      }),
      // file.resourceId is 'OrderCreated' (SentenceCase), but frontmatter.id is 'order-created' (kebab-case)
      createParsedFile('event', 'OrderCreated', { id: 'order-created', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // Should pass because frontmatter.id matches the reference
    expect(errors).toHaveLength(0);
  });

  it('should use frontmatter.id for flow step service references when different from file path', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('flow', 'order-flow', {
        id: 'order-flow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            title: 'Process order',
            service: { id: 'order-service', version: '1.0.0' }, // References frontmatter.id (kebab-case)
          },
        ],
      }),
      // file.resourceId is 'OrderService' (SentenceCase), but frontmatter.id is 'order-service' (kebab-case)
      createParsedFile('service', 'OrderService', { id: 'order-service', version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    // Should pass because frontmatter.id matches the reference
    expect(errors).toHaveLength(0);
  });

  it('should validate owner references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        id: 'user-service',
        version: '1.0.0',
        owners: ['john-doe', 'platform-team'],
      }),
      createParsedFile('user', 'john-doe', {}),
      createParsedFile('team', 'platform-team', {}),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should validate team member references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('team', 'platform-team', {
        members: ['john-doe', 'jane-doe'],
      }),
      createParsedFile('user', 'john-doe', {}),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('jane-doe');
  });

  it('should use frontmatter id for user and team references instead of filename', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        version: '1.0.0',
        owners: ['asmith', 'msmith'], // lowercase refs
      }),
      createParsedFile('team', 'platform-team', {
        members: ['asmith'], // lowercase ref
      }),
      // User files with filename mismatch - filename has capital letters, frontmatter has lowercase
      {
        ...createParsedFile('user', 'aSmith', { id: 'asmith' }), // filename: aSmith, frontmatter: asmith
        file: {
          ...createParsedFile('user', 'aSmith', {}).file,
          path: '/test/users/aSmith.mdx',
          relativePath: 'users/aSmith.mdx',
        },
      },
      {
        ...createParsedFile('user', 'mSmith', { id: 'msmith' }), // filename: mSmith, frontmatter: msmith
        file: {
          ...createParsedFile('user', 'mSmith', {}).file,
          path: '/test/users/mSmith.mdx',
          relativePath: 'users/mSmith.mdx',
        },
      },
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0); // Should not report any errors
  });

  describe('semver version matching', () => {
    it('should support "latest" version references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          id: 'inventory-service',
          version: '1.0.0',
          sends: [{ id: 'OutOfStock', version: 'latest' }],
        }),
        createParsedFile('event', 'OutOfStock', { id: 'OutOfStock', version: '2.0.0' }),
        createParsedFile('event', 'OutOfStock', { id: 'OutOfStock', version: '1.5.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should support x-pattern version matching like "0.0.x"', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          id: 'inventory-service',
          version: '1.0.0',
          sends: [{ id: 'GetInventoryList', version: '0.0.x' }],
        }),
        createParsedFile('command', 'GetInventoryList', { id: 'GetInventoryList', version: '0.0.1' }),
        createParsedFile('command', 'GetInventoryList', { id: 'GetInventoryList', version: '0.0.5' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should support semver range patterns like "^1.0.0"', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'user-service', {
          id: 'user-service',
          version: '1.0.0',
          sends: [{ id: 'UserCreated', version: '^1.0.0' }],
        }),
        createParsedFile('event', 'UserCreated', { id: 'UserCreated', version: '1.2.0' }),
        createParsedFile('event', 'UserCreated', { id: 'UserCreated', version: '1.0.5' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should support tilde range patterns like "~1.2.0"', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'user-service', {
          id: 'user-service',
          version: '1.0.0',
          sends: [{ id: 'UserUpdated', version: '~1.2.0' }],
        }),
        createParsedFile('event', 'UserUpdated', { id: 'UserUpdated', version: '1.2.3' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid version patterns', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          id: 'inventory-service',
          version: '1.0.0',
          sends: [{ id: 'GetInventoryList', version: '0.1.x' }], // No 0.1.x available
        }),
        createParsedFile('command', 'GetInventoryList', { id: 'GetInventoryList', version: '0.0.1' }),
        createParsedFile('command', 'GetInventoryList', { id: 'GetInventoryList', version: '0.2.1' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('version: 0.1.x');
    });

    it('should reject semver patterns that do not match any available versions', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'user-service', {
          id: 'user-service',
          version: '1.0.0',
          sends: [{ id: 'UserCreated', version: '^2.0.0' }], // No 2.x versions available
        }),
        createParsedFile('event', 'UserCreated', { id: 'UserCreated', version: '1.2.0' }),
        createParsedFile('event', 'UserCreated', { id: 'UserCreated', version: '1.5.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('version: ^2.0.0');
    });

    it('should handle resources with "latest" version when requested with patterns', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          id: 'inventory-service',
          version: '1.0.0',
          sends: [{ id: 'StockUpdate', version: '^1.0.0' }],
        }),
        createParsedFile('event', 'StockUpdate', { id: 'StockUpdate' }), // No version specified, defaults to 'latest'
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1); // Should fail because 'latest' doesn't match semver pattern
    });

    it('should allow exact version matches even when semver patterns fail', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          id: 'inventory-service',
          version: '1.0.0',
          sends: [{ id: 'OutOfStock', version: '1.0.0' }], // Exact match
        }),
        createParsedFile('event', 'OutOfStock', { id: 'OutOfStock', version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });
  });

  describe('domain-to-domain references', () => {
    it('should not report errors for valid domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [
            { id: 'orders', version: '1.0.0' },
            { id: 'payments' }, // No version specified, should use latest
          ],
          services: [{ id: 'user-service' }],
        }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }),
        createParsedFile('domain', 'payments', { version: '2.0.0' }),
        createParsedFile('service', 'user-service', { id: 'user-service', version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should report errors for missing domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [
            { id: 'orders' },
            { id: 'missing-domain' }, // This domain doesn't exist
          ],
        }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('reference');
      expect(errors[0].field).toBe('domains');
      expect(errors[0].message).toContain('missing-domain');
      expect(errors[0].message).toContain('does not exist');
    });

    it('should report errors for domain references with wrong versions', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [
            { id: 'orders', version: '2.0.0' }, // Version 2.0.0 doesn't exist
          ],
        }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }), // Only 1.0.0 exists
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('reference');
      expect(errors[0].field).toBe('domains');
      expect(errors[0].message).toContain('orders');
      expect(errors[0].message).toContain('version: 2.0.0');
    });

    it('should support semver patterns in domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'parent-domain', {
          version: '1.0.0',
          domains: [
            { id: 'child-domain', version: '^1.0.0' }, // Should match 1.2.0
          ],
        }),
        createParsedFile('domain', 'child-domain', { version: '1.2.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should validate complex domain hierarchies', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'enterprise', {
          version: '1.0.0',
          domains: [{ id: 'e-commerce' }, { id: 'analytics' }],
        }),
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [{ id: 'orders' }, { id: 'payments' }],
          services: [{ id: 'user-service' }],
        }),
        createParsedFile('domain', 'analytics', { version: '1.0.0' }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }),
        createParsedFile('domain', 'payments', { version: '1.0.0' }),
        createParsedFile('service', 'user-service', { id: 'user-service', version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should catch circular domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'domain-a', {
          version: '1.0.0',
          domains: [{ id: 'domain-b' }],
        }),
        createParsedFile('domain', 'domain-b', {
          version: '1.0.0',
          domains: [{ id: 'domain-a' }], // Circular reference
        }),
      ];

      // The validator doesn't prevent circular references, it just validates they exist
      // This should pass because both domains exist
      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should resolve domain references without versions to latest', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          id: 'E-Commerce', // Different case from directory name
          version: '1.0.0',
          domains: [
            { id: 'Orders' }, // No version specified - should resolve to latest
            { id: 'Payments' }, // No version specified - should resolve to latest
          ],
        }),
        createParsedFile('domain', 'orders', {
          id: 'Orders', // Different case from directory name
          version: '2.0.0',
        }),
        createParsedFile('domain', 'payments', {
          id: 'Payments', // Different case from directory name
          version: '1.5.0',
        }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0); // Should pass - latest versions found
    });

    it('should handle case sensitivity between directory names and frontmatter IDs', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          id: 'E-Commerce', // Uppercase ID in lowercase directory
          version: '1.0.0',
          domains: [
            { id: 'Order-Management', version: '1.0.0' }, // Reference with specific version
          ],
        }),
        createParsedFile('domain', 'order-management', {
          id: 'Order-Management', // Different case from directory name
          version: '1.0.0',
        }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0); // Should pass - IDs match frontmatter, not directory names
    });
  });

  describe('eventcatalog.config.js dependencies', () => {
    it('should not report errors for references that exist in dependencies', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'order-service', {
          id: 'order-service',
          version: '1.0.0',
          sends: [{ id: 'OrderPlaced' }],
          receives: [{ id: 'CreateOrder' }],
        }),
      ];

      const dependencies = {
        event: [{ id: 'OrderPlaced', version: '1.0.0' }],
        command: [{ id: 'CreateOrder' }],
      };

      const errors = validateReferences(parsedFiles, dependencies);
      expect(errors).toHaveLength(0);
    });

    it('should still report errors for references not in dependencies or parsed files', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'order-service', {
          id: 'order-service',
          version: '1.0.0',
          sends: [{ id: 'OrderPlaced' }, { id: 'NonExistentEvent' }],
        }),
      ];

      const dependencies = {
        event: [{ id: 'OrderPlaced', version: '1.0.0' }],
      };

      const errors = validateReferences(parsedFiles, dependencies);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('NonExistentEvent');
    });

    it('should resolve version-specific references from dependencies', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'order-service', {
          id: 'order-service',
          version: '1.0.0',
          sends: [{ id: 'OrderPlaced', version: '1.0.0' }],
        }),
      ];

      const dependencies = {
        event: [{ id: 'OrderPlaced', version: '1.0.0' }],
      };

      const errors = validateReferences(parsedFiles, dependencies);
      expect(errors).toHaveLength(0);
    });

    it('should report errors when dependency version does not match reference version', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'order-service', {
          id: 'order-service',
          version: '1.0.0',
          sends: [{ id: 'OrderPlaced', version: '2.0.0' }],
        }),
      ];

      const dependencies = {
        event: [{ id: 'OrderPlaced', version: '1.0.0' }],
      };

      const errors = validateReferences(parsedFiles, dependencies);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('version: 2.0.0');
    });

    it('should handle dependencies without version as latest', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'order-service', {
          id: 'order-service',
          version: '1.0.0',
          sends: [{ id: 'OrderPlaced' }],
        }),
      ];

      const dependencies = {
        event: [{ id: 'OrderPlaced' }],
      };

      const errors = validateReferences(parsedFiles, dependencies);
      expect(errors).toHaveLength(0);
    });

    it('should support all dependency resource types', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          services: [{ id: 'PaymentService' }],
          domains: [{ id: 'Order' }],
          entities: [{ id: 'OrderEntity' }],
        }),
        createParsedFile('service', 'my-service', {
          id: 'my-service',
          version: '1.0.0',
          sends: [{ id: 'OrderPlaced' }],
          receives: [{ id: 'GetOrder' }],
        }),
      ];

      const dependencies = {
        service: [{ id: 'PaymentService', version: '1.0.0' }],
        domain: [{ id: 'Order', version: '1.0.0' }],
        entity: [{ id: 'OrderEntity', version: '1.0.0' }],
        event: [{ id: 'OrderPlaced', version: '1.0.0' }],
        query: [{ id: 'GetOrder' }],
      };

      const errors = validateReferences(parsedFiles, dependencies);
      expect(errors).toHaveLength(0);
    });

    it('should add dependency index entries to buildResourceIndex', () => {
      const parsedFiles: ParsedFile[] = [];
      const dependencies = {
        event: [{ id: 'OrderPlaced', version: '1.0.0' }],
        service: [{ id: 'PaymentService' }],
      };

      const index = buildResourceIndex(parsedFiles, dependencies);

      expect(index.event['OrderPlaced']).toBeDefined();
      expect(index.event['OrderPlaced'].has('1.0.0')).toBe(true);
      expect(index.service['PaymentService']).toBeDefined();
      expect(index.service['PaymentService'].has('latest')).toBe(true);
    });
  });
});
