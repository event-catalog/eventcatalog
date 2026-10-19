import { afterEach, describe, expect, it } from 'vitest';
import { discoverFitnessFiles } from '../discover';
import { BASE_CATALOG, createCatalog } from './fixtures';

const RULE = 'export default {};';

describe('discoverFitnessFiles', () => {
  let cleanup = () => {};
  afterEach(() => cleanup());

  const discover = (files: Record<string, string>) => {
    const catalog = createCatalog({ ...BASE_CATALOG, ...files });
    cleanup = catalog.cleanup;
    return discoverFitnessFiles(catalog.dir);
  };

  it('finds fitness functions in the root fitness folder, including nested folders, without a resource', () => {
    const { files } = discover({ 'fitness/ownership.fitness.ts': RULE, 'fitness/messages/naming.fitness.ts': RULE });

    expect(files.map(({ source, scope, scopeError }) => ({ source, scope, scopeError }))).toEqual([
      { source: 'fitness/messages/naming.fitness.ts', scope: undefined, scopeError: undefined },
      { source: 'fitness/ownership.fitness.ts', scope: undefined, scopeError: undefined },
    ]);
  });

  it('scopes fitness functions in a resource folder to that resource', () => {
    const { files } = discover({
      'domains/Orders/fitness/boundaries.fitness.ts': RULE,
      'systems/Checkout/fitness/dependencies.fitness.ts': RULE,
      'containers/PaymentDatabase/fitness/access.fitness.ts': RULE,
    });

    expect(files.map(({ source, scope }) => ({ source, type: scope?.type, id: scope?.id, version: scope?.version }))).toEqual([
      {
        source: 'containers/PaymentDatabase/fitness/access.fitness.ts',
        type: 'container',
        id: 'PaymentDatabase',
        version: '1.0.0',
      },
      { source: 'domains/Orders/fitness/boundaries.fitness.ts', type: 'domain', id: 'Orders', version: '1.0.0' },
      { source: 'systems/Checkout/fitness/dependencies.fitness.ts', type: 'system', id: 'Checkout', version: '1.0.0' },
    ]);
  });

  it('scopes fitness functions in nested resources to the nested resource, not its parent', () => {
    const { files } = discover({
      'domains/Orders/services/OrderService/fitness/sends.fitness.ts': RULE,
      'domains/Orders/services/OrderService/events/OrderCreated/fitness/schema.fitness.ts': RULE,
    });

    expect(files.map(({ scope }) => ({ type: scope?.type, id: scope?.id }))).toEqual([
      { type: 'event', id: 'OrderCreated' },
      { type: 'service', id: 'OrderService' },
    ]);
  });

  it('scopes fitness functions in a versioned folder to that version of the resource, not the latest', () => {
    const { files } = discover({ 'domains/Orders/services/OrderService/versioned/0.0.1/fitness/old.fitness.ts': RULE });

    expect(files[0].scope).toMatchObject({ type: 'service', id: 'OrderService', version: '0.0.1' });
  });

  it('only discovers files ending in .fitness.ts', () => {
    const { files, diagnostics } = discover({
      'fitness/helpers.ts': RULE,
      'fitness/rule.fitness.js': RULE,
      'fitness/notes.md': '# Notes',
      'fitness/rule.fitness.ts': RULE,
    });

    expect(files.map((file) => file.source)).toEqual(['fitness/rule.fitness.ts']);
    expect(diagnostics).toEqual([]);
  });

  it('reports .fitness.ts files outside a fitness folder as diagnostics instead of running them', () => {
    const { files, diagnostics } = discover({ 'domains/Orders/rule.fitness.ts': RULE });

    expect(files).toEqual([]);
    expect(diagnostics).toEqual([
      { source: 'domains/Orders/rule.fitness.ts', message: expect.stringContaining('must be in a fitness/ folder') },
    ]);
  });

  it('scopes fitness functions to a resource whose folder is itself named fitness', () => {
    const { files } = discover({
      'domains/fitness/index.mdx': '---\nid: FitnessDomain\nversion: 1.0.0\n---\n',
      'domains/fitness/fitness/rule.fitness.ts': RULE,
    });

    expect(files[0].scopeError).toBeUndefined();
    expect(files[0].scope).toMatchObject({ type: 'domain', id: 'FitnessDomain' });
  });

  it('allows a folder named fitness inside a fitness folder, keeping the scope of the outer one', () => {
    const { files } = discover({
      'domains/Orders/fitness/fitness/rule.fitness.ts': RULE,
      'fitness/fitness/rule.fitness.ts': RULE,
    });

    expect(files.map(({ source, scope, scopeError }) => ({ source, id: scope?.id, scopeError }))).toEqual([
      { source: 'domains/Orders/fitness/fitness/rule.fitness.ts', id: 'Orders', scopeError: undefined },
      { source: 'fitness/fitness/rule.fitness.ts', id: undefined, scopeError: undefined },
    ]);
  });

  it('gives a scope error when the folder holding fitness/ has no resource', () => {
    const { files } = discover({ 'domains/Missing/fitness/rule.fitness.ts': RULE });

    expect(files[0].scope).toBeUndefined();
    expect(files[0].scopeError).toContain("'domains/Missing' has no index.mdx or index.md");
  });

  it('gives a scope error when the folder holding fitness/ is not in a resource folder', () => {
    const { files } = discover({
      'random/Thing/index.mdx': '---\nid: Thing\n---\n',
      'random/Thing/fitness/rule.fitness.ts': RULE,
    });

    expect(files[0].scopeError).toContain("'random/Thing' is not in a resource folder");
  });

  it('gives a scope error when the resource has no id', () => {
    const { files } = discover({
      'services/NoId/index.mdx': '---\nname: No id\n---\n',
      'services/NoId/fitness/rule.fitness.ts': RULE,
    });

    expect(files[0].scopeError).toContain("'services/NoId/index.mdx' has no id");
  });

  it('leaves out the version of a resource that has none', () => {
    const { files } = discover({
      'services/Unversioned/index.mdx': '---\nid: Unversioned\n---\n',
      'services/Unversioned/fitness/rule.fitness.ts': RULE,
    });

    expect(files[0].scope).toEqual({ type: 'service', id: 'Unversioned', file: expect.stringContaining('index.mdx') });
  });

  it('ignores node_modules, dist and dot folders', () => {
    const { files } = discover({
      'node_modules/some-package/fitness/rule.fitness.ts': RULE,
      'dist/fitness/rule.fitness.ts': RULE,
      '.eventcatalog/fitness/rule.fitness.ts': RULE,
    });

    expect(files).toEqual([]);
  });
});
