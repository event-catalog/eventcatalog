// Global rule: services must not depend on each other in a cycle (A needs B's messages, B needs C's, C needs A's).
// Cycles mean none of the services can change or be deployed on its own.
import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getServiceDependencies } from '../helpers/catalog';

/** Every cycle in the graph, each starting from its alphabetically first service so it is only reported once. */
const findCycles = (graph: Map<string, Set<string>>): string[][] => {
  const cycles: string[][] = [];
  const seen = new Set<string>();

  const visit = (start: string, current: string, path: string[]) => {
    for (const next of graph.get(current) ?? []) {
      if (next === start) {
        const key = [...path].sort().join(',');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push([...path, start]);
        }
      } else if (next > start && !path.includes(next)) {
        visit(start, next, [...path, next]);
      }
    }
  };

  for (const service of [...graph.keys()].sort()) visit(service, service, [service]);
  return cycles;
};

export default defineFitnessFunction({
  id: 'no-circular-service-dependencies',
  name: 'No circular dependencies between services',

  async run({ catalog }) {
    const dependencies = await getServiceDependencies(catalog);

    return findCycles(dependencies).map((cycle) => ({
      message: `Circular dependency: ${cycle.join(' → ')}`,
      resources: cycle.slice(0, -1).map((id) => ({ type: 'service', id })),
      suggestion: 'Break the cycle, for example by having one side react to events instead of the other calling it.',
    }));
  },
});
