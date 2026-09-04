import { describe, expect, it } from 'vitest';
import { diff } from '../index';
import { loadScenarios } from './fixtures/scenarios';

/**
 * End-to-end scenarios built from real `buildIndex()` output.
 *
 * Each folder under `fixtures/scenarios/` is a story: a baseline catalog (a.json),
 * a candidate catalog (b.json) and the exact ArchitectureDiff we expect (expected.json).
 * Where `diff.test.ts` states each rule in isolation, these check that the rules
 * compose correctly on catalogs shaped exactly like the ones users have.
 */

const scenarios = loadScenarios();

describe('scenarios', () => {
  it('has at least one scenario so the runner never silently passes on an empty folder', () => {
    expect(scenarios.length).toBeGreaterThan(0);
  });

  describe.each(scenarios)('given the catalogs in "$name"', ({ a, b, options, expected }) => {
    it('produces exactly the expected ArchitectureDiff when a is compared against b', () => {
      expect(diff(a, b, options)).toEqual(expected);
    });
  });
});
