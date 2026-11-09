import type { Edge, Node } from '@xyflow/react';

/**
 * What the catalog's entity map shows, from the whole map and the viewer's filters. Pure, so it runs in
 * the browser (the page's filters) and in tests.
 */

export type Lane = { id: string; name: string };

/** Where entities nothing lists are counted, in the list of domains */
export const NO_DOMAIN: Lane = { id: '__none', name: 'No domain' };

export const domainOf = (node: Node): Lane =>
  (node.data as { lanes?: { domain?: Lane } } | undefined)?.lanes?.domain ?? NO_DOMAIN;

/**
 * References between entities in different domains. A shared entity (more than one domain has it) is
 * across domains whatever it references. An entity with no domain isn't across anything: it has no
 * domain to cross from.
 */
export const getCrossDomainEdges = (nodes: Node[], edges: Edge[], sharedLaneId: string): Edge[] => {
  const domains = new Map(nodes.map((node) => [node.id, domainOf(node)]));
  return edges.filter((edge) => {
    const source = domains.get(edge.source);
    const target = domains.get(edge.target);
    if (!source || !target || source.id === NO_DOMAIN.id || target.id === NO_DOMAIN.id) return false;
    return source.id !== target.id || source.id === sharedLaneId;
  });
};

export type DomainSummary = { lane: Lane; count: number; crossDomain: number };

/**
 * Each domain with how many entities it has and how many references across domains they're at either
 * end of. Sorted by name, with the shared entities and those with no domain last.
 */
export const getDomainSummaries = (nodes: Node[], crossDomainEdges: Edge[], sharedLaneId: string): DomainSummary[] => {
  const domains = new Map(nodes.map((node) => [node.id, domainOf(node)]));
  const byId = new Map<string, DomainSummary>();
  nodes.forEach((node) => {
    const lane = domainOf(node);
    const entry = byId.get(lane.id) ?? { lane, count: 0, crossDomain: 0 };
    entry.count += 1;
    byId.set(lane.id, entry);
  });
  crossDomainEdges.forEach((edge) => {
    [edge.source, edge.target].forEach((id) => {
      const entry = byId.get(domains.get(id)?.id ?? '');
      if (entry) entry.crossDomain += 1;
    });
  });
  const last = (id: string) => (id === sharedLaneId ? 1 : id === NO_DOMAIN.id ? 2 : 0);
  return [...byId.values()].sort((a, b) => last(a.lane.id) - last(b.lane.id) || a.lane.name.localeCompare(b.lane.name));
};

/**
 * The entities of the domains not hidden (only those at an end of a reference across domains, when
 * asked) and the references between them. `isEverything` when nothing is filtered out, so the map's
 * own layout can be used.
 */
export const getShownGraph = ({
  nodes,
  edges,
  crossDomainEdges,
  hidden,
  crossDomainOnly,
}: {
  nodes: Node[];
  edges: Edge[];
  crossDomainEdges: Edge[];
  hidden: Set<string>;
  crossDomainOnly: boolean;
}) => {
  const onCrossDomainEdge = new Set(crossDomainEdges.flatMap((edge) => [edge.source, edge.target]));
  const visible = nodes.filter((node) => !hidden.has(domainOf(node).id) && (!crossDomainOnly || onCrossDomainEdge.has(node.id)));
  const ids = new Set(visible.map((node) => node.id));
  return {
    nodes: visible,
    edges: (crossDomainOnly ? crossDomainEdges : edges).filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    isEverything: visible.length === nodes.length && !crossDomainOnly,
  };
};
