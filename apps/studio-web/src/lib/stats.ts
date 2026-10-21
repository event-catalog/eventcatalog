/**
 * What analytics may say about a diagram: how big it is and what kinds of things are on it, in buckets. Never what
 * it's called, what's in it or what anything says (see view/analytics.ts and src/analytics.ts).
 */
import { MESSAGE_TYPES, type Model, type Resource } from '@eventcatalog/visualiser/model';

export function sizeBucket(count: number) {
  if (count === 0) return '0';
  if (count <= 5) return '1-5';
  if (count <= 20) return '6-20';
  if (count <= 50) return '21-50';
  if (count <= 100) return '51-100';
  if (count <= 250) return '101-250';
  return '250+';
}

export function durationBucket(ms: number) {
  if (ms < 10_000) return '<10s';
  if (ms < 60_000) return '10-60s';
  if (ms < 5 * 60_000) return '1-5m';
  if (ms < 15 * 60_000) return '5-15m';
  if (ms < 60 * 60_000) return '15-60m';
  return '60m+';
}

/** A diagram's shape: its size, and how many domains, services and messages, notes, comments and hotspots */
export function modelStats(model: Model) {
  const count = (test: (resource: Resource) => boolean) => sizeBucket(model.resources.filter(test).length);
  return {
    resources: sizeBucket(model.resources.length),
    relations: sizeBucket(model.relations.length),
    domains: count((resource) => resource.type === 'domain'),
    services: count((resource) => resource.type === 'service'),
    messages: count((resource) => MESSAGE_TYPES.has(resource.type)),
    notes: sizeBucket(model.notes?.length ?? 0),
    comments: sizeBucket(model.comments?.length ?? 0),
    hotspots: sizeBucket(model.hotspots?.length ?? 0),
    has_layout: !!model.layout?.messages,
  };
}

/** A share, in buckets: e.g. how many of a diagram's resources have a summary */
export function shareBucket(part: number, whole: number) {
  if (!whole || !part) return '0%';
  if (part >= whole) return '100%';
  const share = part / whole;
  if (share <= 0.25) return '1-25%';
  if (share <= 0.5) return '26-50%';
  if (share <= 0.75) return '51-75%';
  return '76-99%';
}

const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => !!value))].sort().join(',');

/**
 * What kinds of things a diagram has (our own vocabulary, never theirs): how many of each resource type and relation
 * kind (in buckets, only the ones it has), the lists of types and kinds (to count diagrams with channels, say), and
 * how complete it is: the share of resources with a summary, a code reference or a link, and of messages with a schema
 */
export function modelMix(model: Model) {
  const byType = new Map<string, number>();
  model.resources.forEach((resource) => byType.set(resource.type, (byType.get(resource.type) ?? 0) + 1));
  const byKind = new Map<string, number>();
  model.relations.forEach((relation) => byKind.set(relation.kind, (byKind.get(relation.kind) ?? 0) + 1));
  const messages = model.resources.filter((resource) => MESSAGE_TYPES.has(resource.type));
  const total = model.resources.length;
  return {
    resource_types: distinct([...byType.keys()]),
    relation_kinds: distinct([...byKind.keys()]),
    container_types: distinct(model.resources.filter((resource) => resource.type === 'container').map((resource) => resource.containerType ?? 'database')),
    schema_formats: distinct(messages.map((resource) => resource.schema?.format)),
    ...Object.fromEntries([...byType].map(([type, count]) => [`types_${type}`, sizeBucket(count)])),
    ...Object.fromEntries([...byKind].map(([kind, count]) => [`relations_${kind}`, sizeBucket(count)])),
    with_summary: shareBucket(model.resources.filter((resource) => resource.summary?.trim()).length, total),
    with_evidence: shareBucket(model.resources.filter((resource) => resource.evidence?.trim()).length, total),
    with_link: shareBucket(model.resources.filter((resource) => resource.url).length, total),
    messages_with_schema: shareBucket(messages.filter((resource) => resource.schema).length, messages.length),
    has_cards: model.resources.some((resource) => resource.card),
  };
}
