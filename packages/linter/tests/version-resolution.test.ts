import { describe, it, expect } from 'vitest';
import { toComparableVersion, isValidVersionReference, versionMatches, isSameVersion, sortVersions } from '../src/utils/versions';
import {
  buildResourceIndex,
  resolveReference,
  suggestResourceId,
  validateReferences,
  validateAllSchemas,
} from '../src/validators';
import { ParsedFile } from '../src/parser';
import { CatalogFile } from '../src/scanner';

const createParsedFile = (resourceType: any, resourceId: string, frontmatter: any): ParsedFile => {
  const file: CatalogFile = {
    path: `/test/${resourceType}s/${resourceId}/index.mdx`,
    relativePath: `${resourceType}s/${resourceId}/index.mdx`,
    resourceType,
    resourceId,
  };
  return { file, frontmatter: { id: resourceId, name: resourceId, ...frontmatter }, content: '', raw: '' };
};

describe('version helpers (mirroring core)', () => {
  it('coerces number-like versions the same way core does', () => {
    expect(toComparableVersion('1.2.3')).toBe('1.2.3');
    expect(toComparableVersion('1')).toBe('1.0.0');
    expect(toComparableVersion('1.2')).toBe('1.2.0');
    expect(toComparableVersion('v1')).toBe('1.0.0');
    expect(toComparableVersion('V2.1')).toBe('2.1.0');
    expect(toComparableVersion('latest')).toBeUndefined();
    expect(toComparableVersion('abc')).toBeUndefined();
    expect(toComparableVersion('1.0.0.0')).toBeUndefined();
    expect(toComparableVersion(undefined)).toBeUndefined();
  });

  it('treats equivalent versions as the same', () => {
    expect(isSameVersion('1', '1.0.0')).toBe(true);
    expect(isSameVersion('v1', '1.0.0')).toBe(true);
    expect(isSameVersion('V1', '1.0.0')).toBe(true);
    expect(isSameVersion('1.0.0', '2.0.0')).toBe(false);
    expect(isSameVersion('a', 'a')).toBe(true);
    expect(isSameVersion('a', 'b')).toBe(false);
  });

  it('recognises valid version references', () => {
    for (const valid of ['latest', '1.0.0', '1', 'v1', 'V1', '1.2', '^1.0.0', '~1.2.0', '1.x', '0.0.x', '>=2', '1.0.0-beta']) {
      expect(isValidVersionReference(valid), valid).toBe(true);
    }
    for (const invalid of ['', 'abc', 'version-1', 'latest-1']) {
      expect(isValidVersionReference(invalid), invalid).toBe(false);
    }
  });

  it('matches versions against references like core', () => {
    expect(versionMatches('1.0.0', 'latest')).toBe(true);
    expect(versionMatches('anything', 'latest')).toBe(true);
    expect(versionMatches('1.0.0', '1.0.0')).toBe(true);
    expect(versionMatches('1.0.0', '1')).toBe(true);
    expect(versionMatches('1.0.0', 'v1')).toBe(true);
    expect(versionMatches('1.0.0', 'V1')).toBe(true);
    expect(versionMatches('v1', '1.0.0')).toBe(true);
    expect(versionMatches('V2', 'v2')).toBe(true);
    expect(versionMatches('1.5.0', '^1.0.0')).toBe(true);
    expect(versionMatches('1.5.0', '1.x')).toBe(true);
    expect(versionMatches('0.0.3', '0.0.x')).toBe(true);
    expect(versionMatches('2.0.0', '^1.0.0')).toBe(false);
    expect(versionMatches('1.5.0', '2')).toBe(false);
    expect(versionMatches('1.5.0', 'v2')).toBe(false);
    // A resource with no version ("latest") cannot satisfy a semver range
    expect(versionMatches('latest', '^1.0.0')).toBe(false);
  });

  it('sorts versions newest first, including number-like ones', () => {
    expect(sortVersions(['1.0.0', '2.0.0', '0.0.1', '1.0.0'])).toEqual(['2.0.0', '1.0.0', '0.0.1']);
    expect(sortVersions(['v1', 'V3', '2'])).toEqual(['V3', '2', 'v1']);
    // Falls back to string order when something is not comparable
    expect(sortVersions(['b', 'a', '1.0.0'])).toEqual(['b', 'a', '1.0.0']);
  });
});

describe('schema validation accepts core version formats', () => {
  it('accepts number-like resource versions', () => {
    for (const version of ['1', '1.2', 'v1', 'V1', 'V2.1', '1.0.0']) {
      const errors = validateAllSchemas([createParsedFile('service', 'svc', { version })]);
      expect(
        errors.filter((e) => e.field === 'version'),
        version
      ).toHaveLength(0);
    }
  });

  it('still rejects garbage versions', () => {
    const errors = validateAllSchemas([createParsedFile('service', 'svc', { version: 'not-a-version' })]);
    expect(errors.some((e) => e.field === 'version' && e.rule === 'schema/valid-semver')).toBe(true);
  });
});

describe('suggestResourceId', () => {
  const ids = ['OrderCreated', 'OrderUpdated', 'order-service', 'payment-service', 'ab'];

  it('suggests case-only and near-miss ids', () => {
    expect(suggestResourceId('ordercreated', ids)).toBe('OrderCreated');
    expect(suggestResourceId('OrderCreatd', ids)).toBe('OrderCreated');
    expect(suggestResourceId('order-servce', ids)).toBe('order-service');
    expect(suggestResourceId('paymentservice', ids)).toBe('payment-service');
  });

  it('does not guess when nothing is close', () => {
    expect(suggestResourceId('InventoryReserved', ids)).toBeUndefined();
    expect(suggestResourceId('xy', ids)).toBeUndefined();
  });
});

describe('resolveReference', () => {
  const index = buildResourceIndex([
    createParsedFile('event', 'OrderCreated', { version: '1.0.0' }),
    createParsedFile('event', 'OrderCreated', { version: '2.0.0' }),
    createParsedFile('event', 'OrderCreated', { version: '2.1.0' }),
    createParsedFile('event', 'LegacyEvent', { version: 'v1' }),
    createParsedFile('event', 'LegacyEvent', { version: 'V2' }),
    createParsedFile('service', 'order-service', { version: '1.0.0' }),
    createParsedFile('container', 'orders-db', { version: '1.0.0' }),
  ]);

  it('resolves references without a version or with latest', () => {
    expect(resolveReference({ id: 'OrderCreated' }, ['event'], index)).toEqual({ status: 'ok' });
    expect(resolveReference({ id: 'OrderCreated', version: 'latest' }, ['event'], index)).toEqual({ status: 'ok' });
  });

  it('resolves exact, number-like and range references', () => {
    for (const version of ['2.1.0', '2', 'v2', 'V2', '^2.0.0', '2.x', '~2.0.0', '>=1']) {
      expect(resolveReference({ id: 'OrderCreated', version }, ['event'], index), version).toEqual({ status: 'ok' });
    }
  });

  it('resolves references to resources whose own versions are number-like', () => {
    for (const version of ['v1', '1', '1.0.0', 'V2', '2.0.0', '^2.0.0']) {
      expect(resolveReference({ id: 'LegacyEvent', version }, ['event'], index), version).toEqual({ status: 'ok' });
    }
    expect(resolveReference({ id: 'LegacyEvent', version: '3' }, ['event'], index)).toMatchObject({
      status: 'missing-version',
      availableVersions: ['V2', 'v1'],
    });
  });

  it('reports a missing version with the available versions, newest first', () => {
    expect(resolveReference({ id: 'OrderCreated', version: '3.0.0' }, ['event'], index)).toEqual({
      status: 'missing-version',
      availableVersions: ['2.1.0', '2.0.0', '1.0.0'],
      invalidReference: false,
      foundAsTypes: ['event'],
    });
  });

  it('flags an invalid version reference', () => {
    expect(resolveReference({ id: 'OrderCreated', version: 'two' }, ['event'], index)).toMatchObject({
      status: 'missing-version',
      invalidReference: true,
    });
  });

  it('reports a missing resource with a suggestion', () => {
    expect(resolveReference({ id: 'OrderCreatd', version: '1.0.0' }, ['event', 'command', 'query'], index)).toEqual({
      status: 'missing-resource',
      existsAsTypes: [],
      suggestion: 'OrderCreated',
    });
  });

  it('reports when the id exists as a different resource type', () => {
    expect(resolveReference({ id: 'order-service' }, ['event', 'command', 'query'], index)).toEqual({
      status: 'missing-resource',
      existsAsTypes: ['service'],
      suggestion: undefined,
    });
  });

  it('treats container and dataStore as aliases', () => {
    expect(resolveReference({ id: 'orders-db', version: '1.0.0' }, ['dataStore'], index)).toEqual({ status: 'ok' });
  });
});

describe('validateReferences messages and rules', () => {
  it('uses refs/resource-exists (not valid-version-range) when the resource is missing, even with a version', () => {
    const errors = validateReferences([
      createParsedFile('service', 'order-service', {
        version: '1.0.0',
        sends: [{ id: 'OrderCreatd', version: '1.0.0' }],
      }),
      createParsedFile('event', 'OrderCreated', { version: '1.0.0' }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('refs/resource-exists');
    expect(errors[0].message).toBe('Referenced event/command/query "OrderCreatd" does not exist. Did you mean "OrderCreated"?');
  });

  it('uses refs/valid-version-range when the resource exists but the version does not', () => {
    const errors = validateReferences([
      createParsedFile('service', 'order-service', {
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '3.0.0' }],
      }),
      createParsedFile('event', 'OrderCreated', { version: '1.0.0' }),
      createParsedFile('event', 'OrderCreated', { version: '2.0.0' }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('refs/valid-version-range');
    expect(errors[0].message).toBe(
      'Referenced event "OrderCreated" does not have a version matching "3.0.0". Available versions: 2.0.0, 1.0.0'
    );
  });

  it('explains invalid version references', () => {
    const errors = validateReferences([
      createParsedFile('service', 'order-service', {
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: 'two' }],
      }),
      createParsedFile('event', 'OrderCreated', { version: '1.0.0' }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('refs/valid-version-range');
    expect(errors[0].message).toContain('has an invalid version reference "two"');
    expect(errors[0].message).toContain('Available versions: 1.0.0');
  });

  it('hints when the id belongs to another resource type', () => {
    const errors = validateReferences([
      createParsedFile('service', 'order-service', {
        version: '1.0.0',
        sends: [{ id: 'payment-service' }],
      }),
      createParsedFile('service', 'payment-service', { version: '1.0.0' }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe(
      'Referenced event/command/query "payment-service" does not exist. "payment-service" exists as a service, not a event/command/query.'
    );
  });

  it('accepts V1-style references to V1-style resources', () => {
    const errors = validateReferences([
      createParsedFile('service', 'order-service', {
        version: 'V1',
        sends: [{ id: 'OrderCreated', version: 'v1' }],
        receives: [{ id: 'CreateOrder', version: '1' }],
      }),
      createParsedFile('event', 'OrderCreated', { version: '1.0.0' }),
      createParsedFile('command', 'CreateOrder', { version: 'V1' }),
    ]);

    expect(errors).toEqual([]);
  });

  it('keeps owner, channel and container rules but with the richer messages', () => {
    const errors = validateReferences([
      createParsedFile('service', 'order-service', {
        version: '1.0.0',
        owners: ['platfrom-team'],
        writesTo: [{ id: 'orders-db', version: '9.0.0' }],
        sends: [{ id: 'OrderCreated', to: [{ id: 'orders', version: '2.0.0' }] }],
      }),
      createParsedFile('team', 'platform-team', {}),
      createParsedFile('container', 'orders-db', { version: '1.0.0' }),
      createParsedFile('event', 'OrderCreated', { version: '1.0.0' }),
      createParsedFile('channel', 'orders', { version: '1.0.0' }),
    ]);

    const byRule = Object.fromEntries(errors.map((e) => [e.rule, e.message]));
    expect(byRule['refs/owner-exists']).toBe(
      'Referenced user/team "platfrom-team" does not exist. Did you mean "platform-team"?'
    );
    expect(byRule['refs/container-exists']).toBe(
      'Referenced container "orders-db" does not have a version matching "9.0.0". Available versions: 1.0.0'
    );
    expect(byRule['refs/channel-exists']).toBe(
      'Referenced channel "orders" does not have a version matching "2.0.0". Available versions: 1.0.0'
    );
    expect(errors).toHaveLength(3);
  });
});
