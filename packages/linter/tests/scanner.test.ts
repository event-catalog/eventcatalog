import { describe, it, expect } from 'vitest';
import { extractResourceInfo } from '../src/scanner';

describe('extractResourceInfo', () => {
  it('should extract simple resource id', () => {
    const result = extractResourceInfo('services/user-service/index.mdx', 'service');
    expect(result).toEqual({ id: 'user-service' });
  });

  it('should extract resource id with versioned structure', () => {
    const result = extractResourceInfo('services/user-service/versioned/1.0.0/index.mdx', 'service');
    expect(result).toEqual({ id: 'user-service', version: '1.0.0' });
  });

  it('should extract subdomain service id', () => {
    const result = extractResourceInfo('domains/sales/subdomains/orders/services/inventory-service/index.mdx', 'service');
    expect(result).toEqual({ id: 'inventory-service' });
  });

  it('should extract subdomain service with version', () => {
    const result = extractResourceInfo(
      'domains/sales/subdomains/orders/services/inventory-service/versioned/2.1.0/index.mdx',
      'service'
    );
    expect(result).toEqual({ id: 'inventory-service', version: '2.1.0' });
  });

  it('should extract domain with subdomain', () => {
    const result = extractResourceInfo('domains/sales/subdomains/orders/index.mdx', 'domain');
    expect(result).toEqual({ id: 'sales/subdomains/orders' });
  });

  it('should extract domain with versioned structure', () => {
    const result = extractResourceInfo('domains/sales/versioned/2.1.0/index.mdx', 'domain');
    expect(result).toEqual({ id: 'sales', version: '2.1.0' });
  });

  it('should extract user id from filename', () => {
    const result = extractResourceInfo('users/john-doe.mdx', 'user');
    expect(result).toEqual({ id: 'john-doe' });
  });

  it('should extract team id from filename', () => {
    const result = extractResourceInfo('teams/platform-team.mdx', 'team');
    expect(result).toEqual({ id: 'platform-team' });
  });
});
