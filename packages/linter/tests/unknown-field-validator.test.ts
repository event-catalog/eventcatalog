import { describe, it, expect } from 'vitest';
import {
  validateUnknownFields,
  validateUnknownFieldsForFile,
  collectUnknownKeys,
  suggestKey,
  editDistance,
  UNKNOWN_FIELD_RULE,
  UNKNOWN_NESTED_FIELD_RULE,
} from '../src/validators/unknown-field-validator';
import { validateCatalog } from '../src/validators';
import { schemas } from '../src/schemas';
import { ParsedFile } from '../src/parser';
import { CatalogFile } from '../src/scanner';
import { DEFAULT_RULES, LinterConfig, applyRuleSeverity, getEffectiveRules } from '../src/config';

const createParsedFile = (resourceType: any, frontmatter: any, resourceId = 'test-resource'): ParsedFile => {
  const file: CatalogFile = {
    path: `/test/${resourceType}s/${resourceId}/index.mdx`,
    relativePath: `${resourceType}s/${resourceId}/index.mdx`,
    resourceType,
    resourceId,
  };

  return { file, frontmatter, content: '', raw: '' };
};

const validService = {
  id: 'order-service',
  name: 'Order Service',
  version: '1.0.0',
  summary: 'Handles orders',
  owners: ['platform-team'],
};

describe('editDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(editDistance('owners', 'owners')).toBe(0);
  });

  it('counts insertions, deletions and substitutions', () => {
    expect(editDistance('owner', 'owners')).toBe(1);
    expect(editDistance('summery', 'summary')).toBe(1);
    expect(editDistance('abc', 'xyz')).toBe(3);
  });

  it('counts adjacent transpositions as a single edit', () => {
    expect(editDistance('recieves', 'receives')).toBe(1);
  });
});

describe('suggestKey', () => {
  const known = ['id', 'name', 'version', 'summary', 'owners', 'sends', 'receives', 'schemaPath'];

  it('suggests a close match', () => {
    expect(suggestKey('owner', known)).toBe('owners');
    expect(suggestKey('summery', known)).toBe('summary');
    expect(suggestKey('recieves', known)).toBe('receives');
  });

  it('prefers a case-only match', () => {
    expect(suggestKey('schemapath', known)).toBe('schemaPath');
    expect(suggestKey('Owners', known)).toBe('owners');
  });

  it('uses a tighter threshold for short keys', () => {
    // "id" -> "ix" is distance 1, allowed
    expect(suggestKey('ix', known)).toBe('id');
    // "ab" is distance 2 from "id", too far for a 2-char key
    expect(suggestKey('ab', known)).toBeUndefined();
  });

  it('returns undefined when nothing is close', () => {
    expect(suggestKey('completelyDifferent', known)).toBeUndefined();
  });
});

describe('collectUnknownKeys', () => {
  it('finds unknown top-level keys on a service', () => {
    const unknown = collectUnknownKeys(schemas.service, { ...validService, owner: ['x'] });
    expect(unknown).toEqual([expect.objectContaining({ path: 'owner', key: 'owner', topLevel: true })]);
    expect(unknown[0].knownKeys).toContain('owners');
  });

  it('finds unknown keys inside array items', () => {
    const unknown = collectUnknownKeys(schemas.service, {
      ...validService,
      sends: [{ id: 'order-created', too: [{ id: 'orders' }] }],
    });
    expect(unknown).toEqual([expect.objectContaining({ path: 'sends[0].too', key: 'too', topLevel: false })]);
    expect(unknown[0].knownKeys).toContain('to');
  });

  it('finds unknown keys inside deeply nested objects', () => {
    const unknown = collectUnknownKeys(schemas.service, {
      ...validService,
      sends: [{ id: 'order-created', to: [{ id: 'orders', delivery_mod: 'push' }] }],
    });
    expect(unknown.map((u) => u.path)).toEqual(['sends[0].to[0].delivery_mod']);
  });

  it('finds unknown keys inside nested objects like detailsPanel', () => {
    const unknown = collectUnknownKeys(schemas.service, {
      ...validService,
      detailsPanel: { ownerz: { visible: false } },
    });
    expect(unknown.map((u) => u.path)).toEqual(['detailsPanel.ownerz']);
  });

  it('accepts every message details panel field supported by core', () => {
    for (const resourceType of ['event', 'command', 'query'] as const) {
      const unknown = collectUnknownKeys(schemas[resourceType], {
        id: 'order-message',
        name: 'Order Message',
        version: '1.0.0',
        detailsPanel: {
          producers: { visible: true },
          consumers: { visible: true },
          triggers: { visible: true },
          triggeredBy: { visible: true },
        },
      });

      expect(unknown, resourceType).toEqual([]);
    }
  });

  it('resolves the matching branch of a union (object form of specifications)', () => {
    const unknown = collectUnknownKeys(schemas.service, {
      ...validService,
      specifications: { openapiPath: 'openapi.yml', asyncApiPath: 'asyncapi.yml' },
    });
    expect(unknown.map((u) => u.path)).toEqual(['specifications.asyncApiPath']);
  });

  it('resolves the matching branch of a union (array form of specifications)', () => {
    const unknown = collectUnknownKeys(schemas.service, {
      ...validService,
      specifications: [{ type: 'openapi', path: 'openapi.yml', nam: 'API' }],
    });
    expect(unknown.map((u) => u.path)).toEqual(['specifications[0].nam']);
  });

  it('walks through refined schemas (flow steps use .refine)', () => {
    const unknown = collectUnknownKeys(schemas.flow, {
      id: 'checkout',
      name: 'Checkout',
      version: '1.0.0',
      steps: [{ id: 1, title: 'Start', nextstep: 2 }],
    });
    expect(unknown.map((u) => u.path)).toEqual(['steps[0].nextstep']);
    expect(unknown[0].knownKeys).toContain('next_step');
  });

  it('does not recurse into record / any schemas where arbitrary keys are allowed', () => {
    const unknown = collectUnknownKeys(schemas.flow, {
      id: 'checkout',
      name: 'Checkout',
      version: '1.0.0',
      steps: [{ id: 1, title: 'Start', custom: { title: 'Custom', properties: { anything: 'goes', foo: 'bar' } } }],
    });
    expect(unknown).toHaveLength(0);

    const messageUnknown = collectUnknownKeys(schemas.event, {
      id: 'order-created',
      name: 'Order Created',
      version: '1.0.0',
      producers: [{ id: 'order-service', whatever: true }],
    });
    expect(messageUnknown).toHaveLength(0);
  });

  it('ignores non-object values gracefully', () => {
    expect(collectUnknownKeys(schemas.service, null)).toEqual([]);
    expect(collectUnknownKeys(schemas.service, 'string')).toEqual([]);
    expect(collectUnknownKeys(schemas.service, { ...validService, sends: 'not-an-array' })).toEqual([]);
  });

  it('returns nothing for a fully valid, richly populated service', () => {
    const unknown = collectUnknownKeys(schemas.service, {
      ...validService,
      sends: [{ id: 'order-created', version: '1.0.0', to: [{ id: 'orders', delivery_mode: 'push' }] }],
      receives: [
        {
          id: 'create-order',
          from: [{ id: 'commands', parameters: { env: 'prod' } }],
          triggers: [{ id: 'order-created', version: '1.0.0', condition: 'when valid' }],
        },
      ],
      entities: [{ id: 'order' }],
      writesTo: [{ id: 'orders-db' }],
      repository: { language: 'TypeScript', url: 'https://example.com' },
      specifications: [{ type: 'openapi', path: 'openapi.yml' }],
      badges: [{ content: 'Core', backgroundColor: 'blue', textColor: 'white' }],
      detailsPanel: { owners: { visible: true } },
      styles: { icon: 'Server', node: { color: 'blue' } },
      deprecated: { date: '2025-01-01', message: 'Use v2' },
      draft: { message: 'WIP' },
    });
    expect(unknown).toEqual([]);
  });

  it('accepts every documented container field', () => {
    const unknown = collectUnknownKeys(schemas.container, {
      id: 'orders-db',
      name: 'Orders DB',
      version: '1.0.0',
      container_type: 'database',
      technology: 'postgres@16',
      purpose: 'System of record for orders',
      authoritative: true,
      access_mode: 'readWrite',
      classification: 'internal',
      residency: 'eu-west-1',
      retention: '7y',
    });
    expect(unknown).toEqual([]);
  });
});

describe('validateUnknownFieldsForFile', () => {
  it('reports unknown top-level keys as errors under schema/unknown-field', () => {
    const errors = validateUnknownFieldsForFile(createParsedFile('service', { ...validService, owner: ['x'] }));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      type: 'schema',
      field: 'owner',
      severity: 'error',
      rule: UNKNOWN_FIELD_RULE,
      file: 'services/test-resource/index.mdx',
    });
    expect(errors[0].message).toBe('Unknown property "owner". Did you mean "owners"?');
  });

  it('reports unknown nested keys as warnings under schema/unknown-nested-field', () => {
    const errors = validateUnknownFieldsForFile(
      createParsedFile('service', { ...validService, sends: [{ id: 'order-created', too: [{ id: 'orders' }] }] })
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      field: 'sends[0].too',
      severity: 'warning',
      rule: UNKNOWN_NESTED_FIELD_RULE,
    });
    expect(errors[0].message).toBe('Unknown property "sends[0].too". Did you mean "to"?');
  });

  it('allows x- extension properties at any level', () => {
    const errors = validateUnknownFieldsForFile(
      createParsedFile('service', {
        ...validService,
        'x-team-cost-center': '1234',
        sends: [{ id: 'order-created', 'x-internal': true }],
      })
    );
    expect(errors).toHaveLength(0);
  });

  it('does not treat a bare "x-" as an extension property', () => {
    const errors = validateUnknownFieldsForFile(createParsedFile('service', { ...validService, 'x-': 'oops' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('x-');
  });

  it('allows keys injected by the SDK/core into generated frontmatter', () => {
    const errors = validateUnknownFieldsForFile(
      createParsedFile('service', {
        ...validService,
        versions: ['1.0.0'],
        latestVersion: '1.0.0',
        catalog: { path: '', filePath: '', astroContentFilePath: '', publicPath: '', type: 'service' },
      })
    );
    expect(errors).toHaveLength(0);
  });

  it('hints when a key belongs to a different resource type', () => {
    const errors = validateUnknownFieldsForFile(
      createParsedFile('event', {
        id: 'order-created',
        name: 'Order Created',
        version: '1.0.0',
        sends: [{ id: 'something' }],
      })
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Unknown property "sends"');
    expect(errors[0].message).toContain('but not on event resources');
    expect(errors[0].message).toContain('service');
  });

  it('caps the list of other resource types in the hint', () => {
    const errors = validateUnknownFieldsForFile(createParsedFile('user', { id: 'jane', name: 'Jane', summary: 'Engineer' }));

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(
      /is valid on [a-zA-Z]+, [a-zA-Z]+, [a-zA-Z]+ and \d+ more resources, but not on user resources/
    );
  });

  it('explains the x- convention when there is no suggestion', () => {
    const errors = validateUnknownFieldsForFile(createParsedFile('service', { ...validService, costCenter: '1234' }));

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Unknown property "costCenter". Custom properties must start with "x-".');
  });

  it('respects the allow option (exact key and prefix pattern)', () => {
    const parsedFile = createParsedFile('service', {
      ...validService,
      costCenter: '1234',
      legacyFlag: true,
      internalOwner: 'bob',
      sends: [{ id: 'order-created', legacyChannel: 'x' }],
    });

    const errors = validateUnknownFieldsForFile(parsedFile, { allow: ['costCenter', 'legacy*'] });

    expect(errors.map((e) => e.field)).toEqual(['internalOwner']);
  });

  it('respects the allow option for nested paths', () => {
    const parsedFile = createParsedFile('service', {
      ...validService,
      sends: [{ id: 'order-created', note: 'x' }],
    });

    expect(validateUnknownFieldsForFile(parsedFile, { allow: ['sends[0].note'] })).toHaveLength(0);
    expect(validateUnknownFieldsForFile(parsedFile, { allow: ['note'] })).toHaveLength(0);
  });

  it('can disable suggestions', () => {
    const errors = validateUnknownFieldsForFile(createParsedFile('service', { ...validService, owner: ['x'] }), {
      suggestions: false,
    });

    expect(errors[0].message).toBe('Unknown property "owner". Custom properties must start with "x-".');
  });

  it('reports each unknown key separately', () => {
    const errors = validateUnknownFieldsForFile(
      createParsedFile('service', { ...validService, owner: ['x'], summery: 'y', recieves: [] })
    );

    expect(errors.map((e) => e.field).sort()).toEqual(['owner', 'recieves', 'summery']);
  });

  it('works for every supported resource type', () => {
    for (const resourceType of Object.keys(schemas)) {
      const errors = validateUnknownFieldsForFile(
        createParsedFile(resourceType, { id: 'x', name: 'X', version: '1.0.0', definitelyNotAField: 1 })
      );
      expect(
        errors.some((e) => e.field === 'definitelyNotAField'),
        `expected unknown field on ${resourceType}`
      ).toBe(true);
    }
  });
});

describe('validateUnknownFields with config', () => {
  it('reads allow / suggestions options from the rule config', () => {
    const config: LinterConfig = {
      rules: {
        ...DEFAULT_RULES,
        'schema/unknown-field': ['error', { allow: ['costCenter'], suggestions: false }],
      },
      ignorePatterns: [],
      overrides: [],
    };

    const errors = validateUnknownFields(
      [createParsedFile('service', { ...validService, costCenter: '1', owner: ['x'] })],
      config
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('owner');
    expect(errors[0].message).not.toContain('Did you mean');
  });

  it('applies options from overrides for matching files only', () => {
    const config: LinterConfig = {
      rules: DEFAULT_RULES,
      ignorePatterns: [],
      overrides: [
        {
          files: ['services/legacy/**'],
          rules: { 'schema/unknown-field': ['warn', { allow: ['costCenter'] }] },
        },
      ],
    };

    const legacy = createParsedFile('service', { ...validService, costCenter: '1' }, 'legacy');
    const modern = createParsedFile('service', { ...validService, costCenter: '1' }, 'modern');

    const errors = validateUnknownFields([legacy, modern], config);

    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe('services/modern/index.mdx');
  });

  it('can be turned off via rule severity in the standard pipeline', () => {
    const config: LinterConfig = {
      rules: { ...DEFAULT_RULES, 'schema/unknown-field': 'off', 'schema/unknown-nested-field': 'off' },
      ignorePatterns: [],
      overrides: [],
    };

    const parsedFile = createParsedFile('service', {
      ...validService,
      owner: ['x'],
      sends: [{ id: 'order-created', too: [] }],
    });

    const raw = validateCatalog([parsedFile], undefined, config);
    const effective = applyRuleSeverity(raw, getEffectiveRules(parsedFile.file.relativePath, config));

    expect(effective.filter((e) => e.rule?.startsWith('schema/unknown')).length).toBe(0);
  });

  it('is included in validateCatalog output', () => {
    const parsedFile = createParsedFile('service', { ...validService, owner: ['x'] });
    const errors = validateCatalog([parsedFile]);

    expect(errors.some((e) => e.rule === UNKNOWN_FIELD_RULE && e.field === 'owner')).toBe(true);
  });
});
