import { afterEach, describe, expect, it } from 'vitest';
import { evaluateFitness, getFitnessExitCode } from '../run';
import { BASE_CATALOG, createCatalog, fitnessFunction, resource } from './fixtures';

describe('evaluateFitness', () => {
  let cleanup = () => {};
  afterEach(() => cleanup());

  const evaluate = (files: Record<string, string>) => {
    const catalog = createCatalog({ ...BASE_CATALOG, ...files });
    cleanup = catalog.cleanup;
    return evaluateFitness({ dir: catalog.dir, catalogRevision: 'abc1234', evaluatedAt: new Date('2026-10-18T13:30:00Z') });
  };

  describe('results', () => {
    it('passes a function that returns no violations', async () => {
      const report = await evaluate({
        'fitness/ok.fitness.ts': fitnessFunction({ id: 'ok', name: 'Always fine' }, 'return [];'),
      });

      expect(report).toEqual({
        schemaVersion: 1,
        evaluatedAt: '2026-10-18T13:30:00.000Z',
        catalogRevision: 'abc1234',
        summary: { total: 1, passed: 1, warnings: 0, failed: 0, errors: 0 },
        functions: [
          {
            id: 'ok',
            name: 'Always fine',
            severity: 'error',
            status: 'passed',
            source: 'fitness/ok.fitness.ts',
            scope: null,
            violations: [],
          },
        ],
        diagnostics: [],
      });
      expect(getFitnessExitCode(report)).toBe(0);
    });

    it('fails an error-severity function that returns violations, keeping every violation', async () => {
      const report = await evaluate({
        'fitness/bad.fitness.ts': fitnessFunction(
          { id: 'bad' },
          `return [
            { message: 'First problem', details: 'More detail', suggestion: 'Fix it' },
            { message: 'Second problem' },
          ];`
        ),
      });

      expect(report.functions[0]).toMatchObject({
        status: 'failed',
        violations: [
          { message: 'First problem', resources: [], details: 'More detail', suggestion: 'Fix it' },
          { message: 'Second problem', resources: [] },
        ],
      });
      expect(report.summary.failed).toBe(1);
      expect(getFitnessExitCode(report)).toBe(1);
    });

    it('reports violations of a warning-severity function as warnings, which do not fail the check', async () => {
      const report = await evaluate({
        'fitness/warn.fitness.ts': fitnessFunction({ id: 'warn', severity: 'warning' }, `return [{ message: 'Heads up' }];`),
      });

      expect(report.functions[0]).toMatchObject({ severity: 'warning', status: 'warning' });
      expect(report.summary.warnings).toBe(1);
      expect(getFitnessExitCode(report)).toBe(0);
    });

    it('runs synchronous run functions', async () => {
      const report = await evaluate({
        'fitness/sync.fitness.ts': `export default { id: 'sync', name: 'Sync', run: () => [{ message: 'Sync violation' }] };`,
      });

      expect(report.functions[0]).toMatchObject({ status: 'failed', violations: [{ message: 'Sync violation' }] });
    });

    it('reports an exception as an execution error, not a violation, and keeps running the other functions', async () => {
      const report = await evaluate({
        'fitness/a-throws.fitness.ts': fitnessFunction({ id: 'throws' }, `throw new Error('Something broke');`),
        'fitness/b-ok.fitness.ts': fitnessFunction({ id: 'ok' }, 'return [];'),
      });

      expect(report.functions[0]).toMatchObject({
        id: 'throws',
        status: 'error',
        violations: [],
        error: { message: 'Something broke', stack: expect.stringContaining('Something broke') },
      });
      expect(report.functions[1]).toMatchObject({ id: 'ok', status: 'passed' });
      expect(report.summary).toEqual({ total: 2, passed: 1, warnings: 0, failed: 0, errors: 1 });
      expect(getFitnessExitCode(report)).toBe(1);
    });

    it.each([
      ['a non-array', 'return { message: "not a list" };', 'must return an array of violations'],
      ['nothing', 'return;', 'but returned undefined'],
      [
        'a violation without a message',
        'return [{ details: "no message" }];',
        'Violation 0: `message` must be a non-empty string',
      ],
      [
        'a resource without an id',
        'return [{ message: "x", resources: [{ type: "service" }] }];',
        'resource 0: `id` must be a non-empty string',
      ],
      ['a non-string suggestion', 'return [{ message: "x", suggestion: 42 }];', '`suggestion` must be a string'],
    ])('rejects a function that returns %s', async (_, body, problem) => {
      const report = await evaluate({ 'fitness/invalid.fitness.ts': fitnessFunction({ id: 'invalid' }, body) });

      expect(report.functions[0].status).toBe('error');
      expect(report.functions[0].error?.message).toContain(problem);
    });

    it('reports a file without a default export as an error', async () => {
      const report = await evaluate({ 'fitness/no-default.fitness.ts': `export const rule = { id: 'x' };` });

      expect(report.functions[0]).toMatchObject({
        id: 'fitness/no-default.fitness.ts',
        name: 'no-default',
        status: 'error',
        error: { message: expect.stringContaining('no default export') },
      });
    });

    it('reports a file that fails to load as an error', async () => {
      const report = await evaluate({ 'fitness/broken.fitness.ts': `import './does-not-exist';\nexport default {};` });

      expect(report.functions[0]).toMatchObject({
        status: 'error',
        error: { message: expect.stringContaining('does-not-exist') },
      });
    });

    it('reports an invalid definition as an error', async () => {
      const report = await evaluate({ 'fitness/invalid.fitness.ts': `export default { id: 'invalid', severity: 'fatal' };` });

      expect(report.functions[0]).toMatchObject({ id: 'invalid', status: 'error' });
      expect(report.functions[0].error?.message).toContain('`name` must be a non-empty string');
      expect(report.functions[0].error?.message).toContain("`severity` must be 'error' or 'warning'");
    });

    it('runs the first function with an id and reports later ones with the same id as errors', async () => {
      const report = await evaluate({
        'fitness/a.fitness.ts': fitnessFunction({ id: 'same' }, 'return [];'),
        'fitness/b.fitness.ts': fitnessFunction({ id: 'same' }, 'return [];'),
      });

      expect(report.functions.map(({ source, status }) => ({ source, status }))).toEqual([
        { source: 'fitness/a.fitness.ts', status: 'passed' },
        { source: 'fitness/b.fitness.ts', status: 'error' },
      ]);
      expect(report.functions[1].error?.message).toContain("already has the id 'same' (fitness/a.fitness.ts)");
    });

    it('reports a function whose resource cannot be found as an error without running it', async () => {
      const report = await evaluate({
        'domains/Missing/fitness/rule.fitness.ts': fitnessFunction({ id: 'rule' }, 'throw new Error("should not run");'),
      });

      expect(report.functions[0]).toMatchObject({
        status: 'error',
        scope: null,
        error: { message: expect.stringContaining('has no index.mdx') },
      });
    });

    it('lists functions in path order', async () => {
      const report = await evaluate({
        'systems/Checkout/fitness/c.fitness.ts': fitnessFunction({ id: 'c' }, 'return [];'),
        'fitness/b.fitness.ts': fitnessFunction({ id: 'b' }, 'return [];'),
        'domains/Orders/fitness/a.fitness.ts': fitnessFunction({ id: 'a' }, 'return [];'),
      });

      expect(report.functions.map((result) => result.id)).toEqual(['a', 'b', 'c']);
    });

    it('includes misplaced fitness files in the diagnostics', async () => {
      const report = await evaluate({ 'domains/Orders/rule.fitness.ts': fitnessFunction({ id: 'misplaced' }, 'return [];') });

      expect(report.functions).toEqual([]);
      expect(report.diagnostics).toEqual([{ source: 'domains/Orders/rule.fitness.ts', message: expect.any(String) }]);
    });
  });

  describe('context', () => {
    it('gives functions in the root fitness folder no resource', async () => {
      const report = await evaluate({
        'fitness/global.fitness.ts': fitnessFunction(
          { id: 'global' },
          `return resource === undefined ? [] : [{ message: 'has a resource' }];`
        ),
      });

      expect(report.functions[0].status).toBe('passed');
    });

    it('gives colocated functions the resource they sit alongside, with its type, and records it as the scope', async () => {
      const report = await evaluate({
        'domains/Orders/fitness/domain.fitness.ts': fitnessFunction(
          { id: 'domain' },
          `return [{ message: [resource.type, resource.id, resource.version, resource.name].join('|') }];`
        ),
      });

      expect(report.functions[0]).toMatchObject({
        scope: { type: 'domain', id: 'Orders', version: '1.0.0' },
        violations: [{ message: 'domain|Orders|1.0.0|Orders' }],
      });
    });

    it('gives functions in a versioned folder that version of the resource', async () => {
      const report = await evaluate({
        'domains/Orders/services/OrderService/versioned/0.0.1/fitness/old.fitness.ts': fitnessFunction(
          { id: 'old' },
          `return [{ message: resource.type + '@' + resource.version }];`
        ),
      });

      expect(report.functions[0].violations[0].message).toBe('service@0.0.1');
    });

    it('lets functions query the whole catalog through the SDK', async () => {
      const report = await evaluate({
        'domains/Payments/fitness/query.fitness.ts': fitnessFunction(
          { id: 'query' },
          `
          const services = await catalog.getServices({ latestOnly: true });
          const orders = await catalog.getDomain('Orders');
          const owners = await catalog.getOwnersForResource('OrderService');
          return [{ message: [services.map((s) => s.id).join(','), orders.id, owners.map((o) => o.id).join(',')].join('|') }];
          `
        ),
      });

      expect(report.functions[0].violations[0].message).toBe('OrderService|Orders|orders-team');
    });

    it('does not let functions add methods to the catalog', async () => {
      const report = await evaluate({
        'fitness/write.fitness.ts': fitnessFunction({ id: 'write' }, `catalog.writeEvent = () => {};\nreturn [];`),
      });

      // The catalog is frozen, and assigning to it throws in a module (strict mode)
      expect(report.functions[0]).toMatchObject({ status: 'error', error: { message: expect.stringContaining('writeEvent') } });
    });

    it('does not expose write methods on the catalog', async () => {
      const report = await evaluate({
        'fitness/write.fitness.ts': fitnessFunction(
          { id: 'write' },
          `return Object.keys(catalog).filter((method) => /^(write|rm|version|add)/.test(method)).map((method) => ({ message: method }));`
        ),
      });

      expect(report.functions[0].status).toBe('passed');
    });

    it('does not let changes a function makes to a resource leak into what other calls or functions read', async () => {
      const report = await evaluate({
        'fitness/a-mutate.fitness.ts': fitnessFunction(
          { id: 'mutate' },
          `
          const service = await catalog.getService('OrderService');
          service.name = 'Changed';
          service.sends.push({ id: 'Injected' });
          const again = await catalog.getService('OrderService');
          return again.name === 'Changed' || again.sends.length !== 1 ? [{ message: 'changed within the function' }] : [];
          `
        ),
        'fitness/b-read.fitness.ts': fitnessFunction(
          { id: 'read' },
          `
          const service = await catalog.getService('OrderService');
          return service.name === 'Changed' || service.sends.length !== 1 ? [{ message: 'changed for the next function' }] : [];
          `
        ),
        'domains/Orders/services/OrderService/fitness/c-resource.fitness.ts': fitnessFunction(
          { id: 'resource' },
          `
          resource.sends.push({ id: 'Injected' });
          const service = await catalog.getService('OrderService');
          return service.sends.length !== 1 ? [{ message: 'resource shares the catalog object' }] : [];
          `
        ),
      });

      expect(report.functions.map((result) => [result.id, result.status])).toEqual([
        ['resource', 'passed'],
        ['mutate', 'passed'],
        ['read', 'passed'],
      ]);
    });

    it('loads fitness functions that import @eventcatalog/fitness without the catalog installing it', async () => {
      // The fixture catalog has no node_modules, and fitnessFunction() imports defineFitnessFunction
      const report = await evaluate({ 'fitness/import.fitness.ts': fitnessFunction({ id: 'import' }, 'return [];') });

      expect(report.functions[0].status).toBe('passed');
    });

    it('lets fitness functions import anything @eventcatalog/fitness exports, not only defineFitnessFunction', async () => {
      const report = await evaluate({
        'fitness/imports.fitness.ts': `
          import { defineFitnessFunction, READ_ONLY_METHODS, formatFitnessReport } from '@eventcatalog/fitness';
          export default defineFitnessFunction({
            id: 'imports',
            name: 'Imports',
            run: () => [{ message: [Array.isArray(READ_ONLY_METHODS), typeof formatFitnessReport].join(',') }],
          });
        `,
      });

      expect(report.functions[0].violations[0].message).toBe('true,function');
    });

    it('lets functions read a catalog config that contains functions', async () => {
      const report = await evaluate({
        'package.json': JSON.stringify({ type: 'module' }),
        'eventcatalog.config.js': `export default { title: 'Fitness catalog', generators: [], transform: (value) => value };`,
        'fitness/config.fitness.ts': fitnessFunction(
          { id: 'config' },
          `const config = await catalog.getEventCatalogConfigurationFile();\nreturn [{ message: config.title + ',' + typeof config.transform }];`
        ),
      });

      expect(report.functions[0]).toMatchObject({ status: 'failed', violations: [{ message: 'Fitness catalog,function' }] });
    });

    it('loads helpers the fitness function imports from the catalog', async () => {
      const report = await evaluate({
        'fitness/helpers/messages.ts': `export const message = (id: string): string => id + ' has a problem';`,
        'fitness/helper.fitness.ts': `
          import { defineFitnessFunction } from '@eventcatalog/fitness';
          import { message } from './helpers/messages';
          export default defineFitnessFunction({ id: 'helper', name: 'Helper', run: () => [{ message: message('OrderService') }] });
        `,
      });

      expect(report.functions[0].violations[0].message).toBe('OrderService has a problem');
    });
  });

  describe('resource references', () => {
    const referencing = (resources: string) =>
      evaluate({
        'fitness/refs.fitness.ts': fitnessFunction({ id: 'refs' }, `return [{ message: 'x', resources: ${resources} }];`),
      });

    it('resolves references to catalog resources, recording the version that was evaluated', async () => {
      const report = await referencing(`[
        { type: 'service', id: 'OrderService' },
        { type: 'service', id: 'OrderService', version: '0.0.1' },
        { type: 'event', id: 'OrderCreated' },
        { type: 'team', id: 'orders-team' },
      ]`);

      expect(report.functions[0].violations[0].resources).toEqual([
        { type: 'service', id: 'OrderService', version: '1.0.0', resolved: true },
        { type: 'service', id: 'OrderService', version: '0.0.1', resolved: true },
        { type: 'event', id: 'OrderCreated', version: '1.0.0', resolved: true },
        { type: 'team', id: 'orders-team', resolved: true },
      ]);
    });

    it('accepts numeric versions and ids, as frontmatter like `version: 1` gives them, and records them as strings', async () => {
      const report = await evaluate({
        'events/Numeric/index.mdx': resource({ id: 'Numeric', name: 'Numeric', version: 1 }),
        'events/Number/index.mdx': resource({ id: 42, name: 'Number', version: '1.0.0' }),
        'fitness/numeric.fitness.ts': fitnessFunction(
          { id: 'numeric' },
          `
          const numeric = await catalog.getEvent('Numeric');
          const number = await catalog.getEvent('42');
          return [{ message: 'x', resources: [
            { type: 'event', id: numeric.id, version: numeric.version },
            { type: 'event', id: number.id, version: number.version },
          ] }];
          `
        ),
      });

      expect(report.functions[0].status).toBe('failed');
      expect(report.functions[0].violations[0].resources).toEqual([
        { type: 'event', id: 'Numeric', version: '1', resolved: true },
        { type: 'event', id: '42', version: '1.0.0', resolved: true },
      ]);
    });

    it('accepts other names for resource types, such as dataStore', async () => {
      const report = await referencing(`[{ type: 'dataStore', id: 'PaymentDatabase' }, { type: 'Domain', id: 'Payments' }]`);

      expect(report.functions[0].violations[0].resources).toEqual([
        { type: 'container', id: 'PaymentDatabase', version: '1.0.0', resolved: true },
        { type: 'domain', id: 'Payments', version: '1.0.0', resolved: true },
      ]);
    });

    it('keeps references that do not match a resource, marked as unresolved', async () => {
      const report = await referencing(`[
        { type: 'service', id: 'NoSuchService' },
        { type: 'dataStore', id: 'NoSuchDatabase' },
        { type: 'service', id: 'OrderService', version: '9.9.9' },
        { type: 'spaceship', id: 'OrderService' },
      ]`);

      expect(report.functions[0].violations[0].resources).toEqual([
        { type: 'service', id: 'NoSuchService', resolved: false },
        { type: 'container', id: 'NoSuchDatabase', resolved: false },
        { type: 'service', id: 'OrderService', version: '9.9.9', resolved: false },
        { type: 'spaceship', id: 'OrderService', resolved: false },
      ]);
      // Unresolved references don't change the outcome
      expect(report.functions[0].status).toBe('failed');
    });
  });
});
