import { describe, it, expect } from 'vitest';
import { validateReferences } from '../src/validators/reference-validator';
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

describe('validateReferences - latest version handling', () => {
  it('should allow references without version (latest)', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'InventoryService' }, { id: 'OrdersService' }, { id: 'NotificationService' }, { id: 'ShippingService' }],
      }),
      createParsedFile('service', 'InventoryService', { version: '2.1.0' }),
      createParsedFile('service', 'OrdersService', { version: '1.5.0' }),
      createParsedFile('service', 'NotificationService', { version: '3.0.0' }),
      createParsedFile('service', 'ShippingService', { version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should allow mixed version references (some with version, some without)', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        version: '1.0.0',
        sends: [
          { id: 'user-created' }, // no version - should use latest
          { id: 'user-updated', version: '2.0.0' }, // specific version
        ],
      }),
      createParsedFile('event', 'user-created', { version: '1.5.0' }),
      createParsedFile('event', 'user-updated', { version: '2.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should handle services without versions in frontmatter', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'InventoryService' }],
      }),
      // Service without version in frontmatter - should be treated as 'latest'
      createParsedFile('service', 'InventoryService', {}),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });
});
