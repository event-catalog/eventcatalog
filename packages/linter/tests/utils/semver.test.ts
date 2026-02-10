import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { semverSchema } from '../../src/schemas/common';

describe('semverSchema', () => {
  it('should accept valid semantic versions and patterns', () => {
    const validVersions = [
      // Standard semver
      '0.0.0',
      '1.0.0',
      '1.2.3',
      '10.20.30',
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-0.3.7',
      '1.0.0-x.7.z.92',
      '1.0.0+20130313144700',
      '1.0.0-beta+exp.sha.5114f85',
      '1.0.0+21AF26D3-117B474E93B',
      // EventCatalog patterns
      'latest',
      '0.0.x',
      '1.x',
      '2.1.x',
      '^1.0.0',
      '~1.2.0',
      '^2.0.0-alpha',
    ];

    for (const version of validVersions) {
      expect(() => semverSchema.parse(version)).not.toThrow();
    }
  });

  it('should reject invalid semantic versions', () => {
    const invalidVersions = [
      '1',
      '1.2',
      'v1.0.0',
      '1.0',
      '1.0.0.0',
      'not-a-version',
      '1.0.0 beta',
      '', // empty string
      'x.x.x', // invalid x pattern
      'latest-alpha', // invalid latest variant
    ];

    for (const version of invalidVersions) {
      expect(() => semverSchema.parse(version), `Expected "${version}" to throw`).toThrow();
    }
  });
});
