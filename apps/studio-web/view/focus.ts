/**
 * Finding a resource on the diagram: the resource a node stands for, and the nodes a resource may be drawn as.
 */
import { type Model, type Resource } from '@eventcatalog/visualiser/model';
import { nodeIdFor } from '../src/model/to-graph';

/** The resource a diagram node stands for, on any level (groups, system cards and domain cards included) */
export function resourceForNode(nodeId: string, model: Model): Resource | undefined {
  const byId = new Map(model.resources.map((r) => [r.id, r]));
  const prefixed = nodeId.match(/^(?:domain-group|system-group|system|domain)-(.+)$/)?.[1];
  return byId.get(nodeId) ?? (prefixed ? byId.get(prefixed) : undefined);
}

/** The nodes a resource may be drawn as, most specific first: itself on any level, then what contains it */
export function candidateNodeIds(resourceId: string, model: Model) {
  const byId = new Map(model.resources.map((r) => [r.id, r]));
  const ids: string[] = [];
  for (let r = byId.get(resourceId); r; r = r.parent ? byId.get(r.parent) : undefined) {
    // On the canvas each resource's node has its id; the diagrams' levels name domains and systems their own way
    ids.push(r.id, nodeIdFor(r), `system-${r.id}`, `domain-${r.id}`);
  }
  return ids;
}
