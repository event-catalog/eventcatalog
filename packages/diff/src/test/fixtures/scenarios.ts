import fs from 'node:fs';
import path from 'node:path';
import type { Index } from '@eventcatalog/sdk';
import { parseIndex } from '@eventcatalog/sdk';
import type { ArchitectureDiff, CompatibilityStrategy } from '../../types';

/**
 * Scenario fixtures live in `src/test/fixtures/scenarios/<name>/` and contain:
 *
 *   a.json         baseline SDK Index (as returned by `buildIndex()`)
 *   b.json         candidate SDK Index
 *   expected.json  the ArchitectureDiff `diff(a, b)` must produce
 *   options.json   optional DiffOptions (e.g. `{ "strategy": "full" }`)
 *
 * `scenarios.test.ts` loads every folder and asserts the diff matches exactly,
 * so adding a scenario is just adding a folder. Indexes are validated with the
 * SDK's `parseIndex` so a fixture can never drift from what `buildIndex` emits.
 */

export type Scenario = {
  name: string;
  a: Index;
  b: Index;
  expected: ArchitectureDiff;
  options?: { strategy?: CompatibilityStrategy };
};

const SCENARIOS_DIR = path.join(__dirname, 'scenarios');

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf-8')) as T;

export const loadScenarios = (): Scenario[] =>
  fs
    .readdirSync(SCENARIOS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const dir = path.join(SCENARIOS_DIR, name);
      const optionsFile = path.join(dir, 'options.json');
      return {
        name,
        a: parseIndex(readJson(path.join(dir, 'a.json'))),
        b: parseIndex(readJson(path.join(dir, 'b.json'))),
        expected: readJson<ArchitectureDiff>(path.join(dir, 'expected.json')),
        options: fs.existsSync(optionsFile) ? readJson<Scenario['options']>(optionsFile) : undefined,
      };
    });
