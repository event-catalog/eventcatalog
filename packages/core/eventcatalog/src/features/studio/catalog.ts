import type { Edge, Node } from '@xyflow/react';
import type { CatalogRelation, CatalogResource } from './catalog-resources';
import { buildNode } from './canvas-doc';
import { createEdge } from './edges';
import { layoutGraph, withGroupSizes } from './layout';
import { GROUP_TYPES, isGroupType } from './node-types';

/**
 * Catalog resources on a canvas: the node for a resource, its connections to related resources already there,
 * and domains and systems as containers with what they hold in the catalog.
 */

export type CatalogLink = { key: string; url: string; version: string };

/** The node data for a resource, tagged with the catalog resource it came from */
export const catalogNodeData = (resource: CatalogResource) => ({
  ...resource.node.data,
  catalog: { key: resource.key, url: resource.url, version: resource.version } satisfies CatalogLink,
});

export const getCatalogLink = (node: Pick<Node, 'data'>) => node.data?.catalog as CatalogLink | undefined;

export const indexRelations = (relations: CatalogRelation[]) => {
  const byKey = new Map<string, CatalogRelation[]>();
  for (const relation of relations) {
    for (const key of [relation.source, relation.target]) byKey.set(key, [...(byKey.get(key) ?? []), relation]);
  }
  return byKey;
};

/**
 * Edges from a newly dropped resource to the related resources already on the canvas. A container doesn't get
 * "contains" edges: what it contains sits inside it.
 */
export const getRelatedEdges = (
  resource: CatalogResource,
  nodeId: string,
  existing: Node[],
  relationsByKey: Map<string, CatalogRelation[]>,
  nodeType = resource.node.type
): Edge[] => {
  const edges: Edge[] = [];
  for (const relation of relationsByKey.get(resource.key) ?? []) {
    const isSource = relation.source === resource.key;
    const otherKey = isSource ? relation.target : relation.source;

    for (const other of existing.filter((node) => getCatalogLink(node)?.key === otherKey)) {
      if (relation.label === 'contains' && (isGroupType(nodeType) || isGroupType(other.type))) continue;
      const [source, target] = isSource ? [{ id: nodeId, type: nodeType }, other] : [other, { id: nodeId, type: nodeType }];
      const edge = createEdge(
        { source: source.id, target: target.id, sourceHandle: null, targetHandle: null },
        source.type,
        target.type
      );
      edges.push(relation.label ? { ...edge, label: relation.label } : edge);
    }
  }
  return edges;
};

// ---- Domains and systems as containers ----

export const canBeContainer = (resource: CatalogResource) =>
  resource.collection === 'domains' || resource.collection === 'systems';

export const containerTypeFor = (resource: CatalogResource) =>
  resource.collection === 'domains' ? GROUP_TYPES.domain : GROUP_TYPES.system;

/** A container's data: the domain or system it stands for, and where it is in the catalog */
export const catalogGroupData = (resource: CatalogResource) => ({
  [resource.collection === 'domains' ? 'domain' : 'system']: {
    id: resource.id,
    name: resource.name,
    version: resource.version,
    summary: resource.summary,
  },
  catalog: { key: resource.key, url: resource.url, version: resource.version } satisfies CatalogLink,
});

/** What a domain or system contains in the catalog: a domain's systems and services, a system's services */
export const getContents = (
  resource: CatalogResource,
  catalog: { resourcesByKey: Map<string, CatalogResource>; relationsByKey: Map<string, CatalogRelation[]> }
) =>
  (catalog.relationsByKey.get(resource.key) ?? [])
    .filter((relation) => relation.source === resource.key && relation.label === 'contains')
    .map((relation) => catalog.resourcesByKey.get(relation.target))
    .filter((child): child is CatalogResource => !!child);

/** A domain or system as an (empty) container, centred on a point */
export const buildContainer = (resource: CatalogResource, center: { x: number; y: number }): Node =>
  buildNode(containerTypeFor(resource), catalogGroupData(resource), center);

/**
 * A domain or system as a container with everything it holds in the catalog: its systems (as containers too)
 * and services, and the messages and data stores of those services, so every level of detail (L1 to L3) has
 * something to show. Laid out with the visualiser's layout and centred on a point, with the connections between
 * them and to related resources already on the canvas. Resources already on the canvas aren't added again.
 */
export const buildContainerWithContents = async (
  resource: CatalogResource,
  center: { x: number; y: number },
  catalog: { resourcesByKey: Map<string, CatalogResource>; relationsByKey: Map<string, CatalogRelation[]> },
  existing: Node[]
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  const onCanvas = new Set(existing.map((node) => getCatalogLink(node)?.key).filter(Boolean));
  const root = buildContainer(resource, { x: 0, y: 0 });
  const nodes: Node[] = [root];
  const added = (key: string) => onCanvas.has(key) || nodes.some((node) => getCatalogLink(node)?.key === key);
  const services: { resource: CatalogResource; parentId: string }[] = [];

  // Its systems (as containers, with their services) and services
  const fill = (parent: CatalogResource, parentId: string) => {
    for (const child of getContents(parent, catalog)) {
      if (added(child.key)) continue;
      if (canBeContainer(child)) {
        const container = { ...buildContainer(child, { x: 0, y: 0 }), parentId };
        nodes.push(container);
        fill(child, container.id);
      } else {
        nodes.push({ ...buildNode(child.node.type, catalogNodeData(child), { x: 0, y: 0 }), parentId });
        if (child.collection === 'services') services.push({ resource: child, parentId });
      }
    }
  };
  fill(resource, root.id);

  // The messages its services send and receive (in the domain or system dropped), and their data stores (next to them)
  for (const service of services) {
    for (const relation of catalog.relationsByKey.get(service.resource.key) ?? []) {
      if (relation.label === 'contains') continue;
      const other = catalog.resourcesByKey.get(relation.source === service.resource.key ? relation.target : relation.source);
      if (!other || added(other.key) || canBeContainer(other) || other.collection === 'services') continue;
      const parentId = other.collection === 'containers' ? service.parentId : root.id;
      nodes.push({ ...buildNode(other.node.type, catalogNodeData(other), { x: 0, y: 0 }), parentId });
    }
  }

  if (nodes.length === 1) return { nodes: [buildContainer(resource, center)], edges: [] };

  // Connections between them, and to related resources already on the canvas
  const inside: Edge[] = [];
  const outside: Edge[] = [];
  const placed = [...existing];
  for (const node of nodes) {
    const link = getCatalogLink(node);
    const related = link && catalog.resourcesByKey.get(link.key);
    if (related) {
      for (const edge of getRelatedEdges(related, node.id, placed, catalog.relationsByKey, node.type)) {
        (existing.some((other) => other.id === edge.source || other.id === edge.target) ? outside : inside).push(edge);
      }
    }
    placed.push(node);
  }

  // Laid out with its connections; containers are sized to fit what's in them
  const laidOut = withGroupSizes((await layoutGraph(nodes, inside)).nodes);
  const top = laidOut.find((node) => node.id === root.id)!;
  const offset = { x: center.x - (top.width ?? 0) / 2 - top.position.x, y: center.y - (top.height ?? 0) / 2 - top.position.y };
  return {
    nodes: laidOut.map((node) => {
      const original = nodes.find((candidate) => candidate.id === node.id)!;
      return {
        ...original,
        position: node.parentId ? node.position : { x: node.position.x + offset.x, y: node.position.y + offset.y },
        ...(isGroupType(node.type) && { width: node.width, height: node.height }),
      };
    }),
    edges: [...inside, ...outside],
  };
};
