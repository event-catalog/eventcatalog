import type { ResolvedEdge, ResolvedEntity, ResolvedGraph } from '@eventcatalog/sdk';
import type { DiffEdge, Impact, ImpactedResource, MessageType, ResourceRemoved, SchemaChange } from './types';
import { indexEntities } from './utils/entities';
import type { EntityIndex } from './utils/entities';

const MESSAGE_TYPES: ReadonlySet<string> = new Set<MessageType>(['event', 'command', 'query']);

const isMessageType = (type: string | undefined): type is MessageType => type !== undefined && MESSAGE_TYPES.has(type);

export type ImpactInput = {
  /** The resolved baseline graph: who produces and consumes what today. */
  baseline: ResolvedGraph;
  schemaChanges: SchemaChange[];
  resourcesRemoved: ResourceRemoved[];
  edgesRemoved: DiffEdge[];
};

/**
 * Works out who is hurt by the changes, so consumers of the diff never walk edges.
 *
 * Producers and consumers always come from the BASELINE graph: they are the services
 * that exist today, on the message that is about to change or disappear.
 *
 *   schema_breaking_change  a message schema broke; lists everyone on the compared version
 *   message_removed         a message (or one version of it) is gone; lists everyone still using it
 *   consumer_removed        a service stopped receiving a message that still exists
 *   producer_removed        a service stopped sending a message that still exists
 */
export const impactOf = ({ baseline, schemaChanges, resourcesRemoved, edgesRemoved }: ImpactInput): Impact[] => {
  const graph: Graph = { edges: baseline.edges, entities: indexEntities(baseline) };
  return [
    ...impactOfSchemaChanges(graph, schemaChanges),
    ...impactOfRemovedMessages(graph, resourcesRemoved),
    ...impactOfRemovedEdges(graph, edgesRemoved, resourcesRemoved),
  ];
};

/** The baseline edges plus a constant-time entity lookup. */
type Graph = { edges: ResolvedEdge[]; entities: EntityIndex };

// ---------------------------------------------------------------------------
// schema_breaking_change
// ---------------------------------------------------------------------------

const impactOfSchemaChanges = (baseline: Graph, schemaChanges: SchemaChange[]): Impact[] =>
  schemaChanges
    .filter((change) => change.breaking === true && change.direction !== null)
    .map((change) => ({
      message: { type: change.message.type, id: change.message.id, version: change.message.version.a },
      reason: 'schema_breaking_change' as const,
      direction: change.direction!,
      producers: partiesOf(baseline, change.message.id, change.message.version.a, 'sends'),
      consumers: partiesOf(baseline, change.message.id, change.message.version.a, 'receives'),
    }));

// ---------------------------------------------------------------------------
// message_removed
// ---------------------------------------------------------------------------

/** A removed message with nobody left pointing at it is a tidy-up, not an impact, so those are skipped. */
const impactOfRemovedMessages = (baseline: Graph, resourcesRemoved: ResourceRemoved[]): Impact[] =>
  resourcesRemoved
    .filter((resource) => isMessageType(resource.type))
    .map((resource) => ({
      message: { type: resource.type as MessageType, id: resource.id, version: resource.version },
      reason: 'message_removed' as const,
      producers: partiesOf(baseline, resource.id, resource.version, 'sends'),
      consumers: partiesOf(baseline, resource.id, resource.version, 'receives'),
    }))
    .filter((impact) => impact.producers.length > 0 || impact.consumers.length > 0);

// ---------------------------------------------------------------------------
// consumer_removed / producer_removed
// ---------------------------------------------------------------------------

/**
 * A removed direct sends/receives edge whose message still exists. Edges lost because
 * the message itself was removed are already covered by message_removed.
 */
const impactOfRemovedEdges = (baseline: Graph, edgesRemoved: DiffEdge[], resourcesRemoved: ResourceRemoved[]): Impact[] => {
  const removedMessages = new Set(resourcesRemoved.filter((r) => isMessageType(r.type)).map((r) => r.id));
  const byMessage = new Map<string, Impact>();

  for (const edge of edgesRemoved) {
    if (edge.via !== undefined || !isMessageType(edge.to.type) || removedMessages.has(edge.to.id)) continue;
    if (edge.direction !== 'sends' && edge.direction !== 'receives') continue;

    const reason = edge.direction === 'receives' ? 'consumer_removed' : 'producer_removed';
    const key = `${reason}|${edge.to.type}:${edge.to.id}`;
    const impact = byMessage.get(key) ?? {
      message: { type: edge.to.type, id: edge.to.id },
      reason,
      producers: [],
      consumers: [],
    };

    const party = baseline.entities.find(edge.from.id, edge.from.version ?? null);
    if (party) (edge.direction === 'receives' ? impact.consumers : impact.producers).push(toImpactedResource(party));
    byMessage.set(key, impact);
  }

  return [...byMessage.values()].map((impact) => ({
    ...impact,
    producers: sortParties(impact.producers),
    consumers: sortParties(impact.consumers),
  }));
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const partiesOf = (
  graph: Graph,
  messageId: string,
  messageVersion: string | undefined,
  direction: ResolvedEdge['direction']
): ImpactedResource[] =>
  sortParties(
    graph.edges
      // `via` edges are indirect (e.g. `sends.to` a channel, `receives.from` a service); only direct message edges count.
      .filter(
        (edge) =>
          edge.direction === direction && edge.via === undefined && edge.to === messageId && pointsAt(edge, messageVersion)
      )
      .map((edge) => graph.entities.find(edge.from, edge.fromVersion))
      .filter((entity): entity is ResolvedEntity => entity !== undefined)
      .map(toImpactedResource)
  );

/** An edge counts when it resolved to the compared version, or could not be resolved at all. */
const pointsAt = (edge: ResolvedEdge, version: string | undefined) =>
  edge.resolved === null || version === undefined || edge.resolved === version;

const toImpactedResource = (entity: ResolvedEntity): ImpactedResource => ({
  type: entity.type,
  id: entity.id,
  ...(entity.version !== undefined ? { version: entity.version } : {}),
  ...(entity.owners !== undefined ? { owners: entity.owners } : {}),
});

const sortParties = (parties: ImpactedResource[]) =>
  [...parties].sort((left, right) => left.id.localeCompare(right.id) || (left.version ?? '').localeCompare(right.version ?? ''));
