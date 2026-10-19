import type { FitnessFunction } from './types';

const SEVERITIES = ['error', 'warning'];

/** Returns what is wrong with a fitness function definition (empty when it is valid). */
export const getFitnessFunctionProblems = (value: unknown): string[] => {
  if (!value || typeof value !== 'object') return ['A fitness function must be an object, created with defineFitnessFunction()'];

  const definition = value as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof definition.id !== 'string' || definition.id.trim() === '') problems.push('`id` must be a non-empty string');
  if (typeof definition.name !== 'string' || definition.name.trim() === '') problems.push('`name` must be a non-empty string');
  if (definition.description !== undefined && typeof definition.description !== 'string') {
    problems.push('`description` must be a string');
  }
  if (definition.severity !== undefined && !SEVERITIES.includes(definition.severity as string)) {
    problems.push("`severity` must be 'error' or 'warning'");
  }
  if (typeof definition.run !== 'function') problems.push('`run` must be a function');
  return problems;
};

/**
 * Defines an architecture fitness function. Export it as the default export of a `*.fitness.ts` file
 * in the catalog's `fitness/` folder, or in a `fitness/` folder alongside a resource.
 *
 * @example
 * ```ts
 * import { defineFitnessFunction } from '@eventcatalog/fitness';
 *
 * export default defineFitnessFunction({
 *   id: 'event-ownership',
 *   name: 'Every event must have an owner',
 *   async run({ catalog }) {
 *     const events = (await catalog.getEvents({ latestOnly: true })) ?? [];
 *     return events
 *       .filter((event) => !event.owners?.length)
 *       .map((event) => ({
 *         message: `${event.id} has no owners`,
 *         resources: [{ type: 'event', id: event.id, version: event.version }],
 *       }));
 *   },
 * });
 * ```
 */
export const defineFitnessFunction = <T extends FitnessFunction>(definition: T): T => {
  const problems = getFitnessFunctionProblems(definition);
  if (problems.length > 0) throw new Error(`Invalid fitness function: ${problems.join(', ')}`);
  return definition;
};
