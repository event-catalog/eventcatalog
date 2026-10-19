import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runFitnessCheck } from '../check';
import { formatFitnessReport } from '../format';
import type { FitnessReport } from '../types';
import { BASE_CATALOG, createCatalog, fitnessFunction } from './fixtures';

describe('runFitnessCheck', () => {
  let cleanup = () => {};
  afterEach(() => cleanup());

  const check = async (files: Record<string, string>, options: { output?: string; format?: 'text' | 'json' } = {}) => {
    const catalog = createCatalog({ ...BASE_CATALOG, ...files });
    cleanup = catalog.cleanup;
    const logs: string[] = [];
    const errors: string[] = [];
    const exitCode = await runFitnessCheck({
      dir: catalog.dir,
      ...options,
      log: (message) => logs.push(message),
      error: (message) => errors.push(message),
    });
    return { exitCode, dir: catalog.dir, output: logs.join('\n'), errors: errors.join('\n') };
  };

  const readReport = (file: string): FitnessReport => JSON.parse(fs.readFileSync(file, 'utf8'));

  it('writes the report to .eventcatalog/fitness/results.json in the catalog', async () => {
    const { dir, exitCode } = await check({ 'fitness/ok.fitness.ts': fitnessFunction({ id: 'ok' }, 'return [];') });

    expect(exitCode).toBe(0);
    const report = readReport(path.join(dir, '.eventcatalog/fitness/results.json'));
    expect(report.summary.passed).toBe(1);
    expect(report.functions[0].id).toBe('ok');
  });

  it('writes the report to a custom path, relative to the catalog', async () => {
    const { dir } = await check(
      { 'fitness/ok.fitness.ts': fitnessFunction({ id: 'ok' }, 'return [];') },
      { output: 'reports/fitness.json' }
    );

    expect(fs.existsSync(path.join(dir, 'reports/fitness.json'))).toBe(true);
  });

  it('writes a report when the catalog has no fitness functions, so it is not mistaken for a missing report', async () => {
    const { dir, exitCode, output } = await check({});

    expect(exitCode).toBe(0);
    expect(output).toContain('No fitness functions found');
    expect(readReport(path.join(dir, '.eventcatalog/fitness/results.json')).summary.total).toBe(0);
  });

  it('exits with 0 when functions only warn', async () => {
    const { exitCode } = await check({
      'fitness/warn.fitness.ts': fitnessFunction({ id: 'warn', severity: 'warning' }, `return [{ message: 'Heads up' }];`),
    });

    expect(exitCode).toBe(0);
  });

  it('exits with 1 when an error-severity function finds violations', async () => {
    const { exitCode } = await check({
      'fitness/bad.fitness.ts': fitnessFunction({ id: 'bad' }, `return [{ message: 'Broken' }];`),
    });

    expect(exitCode).toBe(1);
  });

  it('exits with 1 when a function cannot be evaluated', async () => {
    const { exitCode } = await check({
      'fitness/throws.fitness.ts': fitnessFunction({ id: 'throws' }, `throw new Error('boom');`),
    });

    expect(exitCode).toBe(1);
  });

  it('exits with 2 when the check cannot run', async () => {
    const errors: string[] = [];
    const exitCode = await runFitnessCheck({ dir: '/no/such/catalog', log: () => {}, error: (message) => errors.push(message) });

    expect(exitCode).toBe(2);
    expect(errors.join('\n')).toContain('EventCatalog directory not found');
  });

  it('prints the report as JSON with --format json', async () => {
    const { output } = await check({ 'fitness/ok.fitness.ts': fitnessFunction({ id: 'ok' }, 'return [];') }, { format: 'json' });

    expect(JSON.parse(output).functions[0].id).toBe('ok');
  });
});

describe('formatFitnessReport', () => {
  const report: FitnessReport = {
    schemaVersion: 1,
    evaluatedAt: '2026-10-18T13:30:00.000Z',
    catalogRevision: 'abc1234',
    summary: { total: 4, passed: 1, warnings: 1, failed: 1, errors: 1 },
    functions: [
      {
        id: 'event-ownership',
        name: 'Event ownership',
        severity: 'error',
        status: 'passed',
        source: 'fitness/event-ownership.fitness.ts',
        scope: null,
        violations: [],
      },
      {
        id: 'orders-boundaries',
        name: 'Domain boundaries',
        severity: 'error',
        status: 'failed',
        source: 'domains/Orders/fitness/domain-boundaries.fitness.ts',
        scope: { type: 'domain', id: 'Orders', version: '1.0.0' },
        violations: [
          {
            message: 'OrderService depends directly on PaymentDatabase',
            resources: [
              { type: 'service', id: 'OrderService', version: '1.0.0', resolved: true },
              { type: 'database', id: 'Ledger', resolved: false },
            ],
            suggestion: 'Access payment data through an approved interface.',
          },
          { message: 'Second violation', resources: [] },
        ],
      },
      {
        id: 'checkout-dependencies',
        name: 'Service dependencies',
        severity: 'warning',
        status: 'warning',
        source: 'systems/Checkout/fitness/service-dependencies.fitness.ts',
        scope: { type: 'system', id: 'Checkout', version: '1.0.0' },
        violations: [{ message: 'Checkout calls three services', resources: [] }],
      },
      {
        id: 'broken',
        name: 'Broken rule',
        severity: 'error',
        status: 'error',
        source: 'fitness/broken.fitness.ts',
        scope: null,
        violations: [],
        error: { message: 'Something broke\nwhile loading a helper' },
      },
    ],
    diagnostics: [{ source: 'domains/Orders/rule.fitness.ts', message: 'Not run: must be in a fitness/ folder' }],
  };

  it('lists each function with its outcome, violations and errors, then the totals', () => {
    expect(formatFitnessReport(report)).toBe(
      [
        'EventCatalog Fitness',
        '',
        '✓ Event ownership                  Passed',
        '✗ Orders / Domain boundaries       2 violations',
        '    • OrderService depends directly on PaymentDatabase',
        '      Resources: OrderService (service), Ledger (database, not found in the catalog)',
        '      Suggestion: Access payment data through an approved interface.',
        '    • Second violation',
        '! Checkout / Service dependencies  1 warning',
        '    • Checkout calls three services',
        '✗ Broken rule                      Error',
        '    Something broke',
        '    while loading a helper',
        '    in fitness/broken.fitness.ts',
        '',
        '4 fitness functions evaluated',
        '',
        '1 passed',
        '1 warning',
        '1 failed',
        '1 error',
        '',
        '! domains/Orders/rule.fitness.ts: Not run: must be in a fitness/ folder',
      ].join('\n')
    );
  });
});
