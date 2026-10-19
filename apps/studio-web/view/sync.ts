/**
 * Sync to agent (in a chat): what changed in the design since the agent last had it, as the message that sends it.
 * Only the design counts: resources, their connections and what's written on the canvas (notes and text). Where
 * things are, how they're drawn, evidence and comments don't (the agent has the whole diagram in its context).
 */
import type { Model, Note, Relation, Resource } from '@eventcatalog/visualiser/model';
import { nodeDefinitions } from '@eventcatalog/visualiser/studio';

/** How long the design stays as it is before its changes are sent (one message for a burst of edits) */
export const SYNC_AFTER_MS = 5000;

/** What about a resource is its design (not `card`, how a domain or system is drawn, or `evidence`, the agent's) */
const RESOURCE_FIELDS = ['type', 'name', 'summary', 'parent', 'version', 'owners', 'technology', 'containerType', 'properties', 'url', 'schema'] as const;
const RELATION_FIELDS = ['label', 'fromField', 'toField'] as const;

// Most changes listed in one message (the rest are counted)
const MAX_LINES = 30;

// The canvas shows a resource without a version as 0.0.1 (and writes it back): that's no change
const DEFAULT_VERSION = '0.0.1';

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const valueOf = (resource: Resource, field: (typeof RESOURCE_FIELDS)[number]) =>
  field === 'version' && resource.version === DEFAULT_VERSION ? undefined : resource[field];
// The summaries the palette starts new nodes with ("Describe what this service does."): not something anyone wrote
const summariesIn = (value: unknown): string[] =>
  value && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, inner]) => (key === 'summary' && typeof inner === 'string' ? [inner] : summariesIn(inner)))
    : [];
let placeholders: Set<string> | undefined;
const isPlaceholder = (summary?: string) =>
  !!summary && (placeholders ??= new Set(nodeDefinitions.flatMap((definition) => summariesIn(definition.createData())))).has(summary);

const relationKey = (relation: Relation) => `${relation.from}|${relation.to}|${relation.kind}`;
const noteKey = (note: Note) => `${note.kind ?? 'sticky'}|${note.resource ?? ''}|${note.text}`;
const fieldLabel = (field: string) => (field === 'containerType' ? 'container type' : field === 'fromField' || field === 'toField' ? 'fields' : field);

/** The design's changes from `before` to `after`, one line each */
export function designChanges(before: Model, after: Model): string[] {
  const lines: string[] = [];
  const beforeResources = new Map(before.resources.map((r) => [r.id, r]));
  const afterResources = new Map(after.resources.map((r) => [r.id, r]));
  const nameOf = (id: string) => `"${(afterResources.get(id) ?? beforeResources.get(id))?.name ?? id}"`;
  const describe = (resource: Resource) =>
    `${resource.type} "${resource.name}"${resource.parent ? ` (in ${nameOf(resource.parent)})` : ''}${resource.summary && !isPlaceholder(resource.summary) ? `: ${resource.summary}` : ''}`;

  for (const resource of after.resources) {
    const was = beforeResources.get(resource.id);
    if (!was) {
      lines.push(`Added ${describe(resource)}`);
      continue;
    }
    const changed = RESOURCE_FIELDS.filter((field) => field !== 'name' && !same(valueOf(was, field), valueOf(resource, field))).map(fieldLabel);
    const renamed = was.name !== resource.name;
    if (renamed) lines.push(`Renamed ${was.type} "${was.name}" to "${resource.name}"${changed.length ? ` and changed its ${[...new Set(changed)].join(', ')}` : ''}`);
    else if (changed.length) lines.push(`Changed the ${[...new Set(changed)].join(', ')} of ${resource.type} "${resource.name}"`);
  }
  for (const resource of before.resources) if (!afterResources.has(resource.id)) lines.push(`Removed ${resource.type} "${resource.name}"`);

  const beforeRelations = new Map(before.relations.map((r) => [relationKey(r), r]));
  const afterRelations = new Map(after.relations.map((r) => [relationKey(r), r]));
  const connection = (relation: Relation) => `${nameOf(relation.from)} → ${nameOf(relation.to)} (${relation.kind}${relation.label ? `: ${relation.label}` : ''})`;
  for (const [key, relation] of afterRelations) {
    const was = beforeRelations.get(key);
    if (!was) lines.push(`Connected ${connection(relation)}`);
    else if (RELATION_FIELDS.some((field) => !same(was[field], relation[field]))) lines.push(`Changed the connection ${connection(relation)}`);
  }
  for (const [key, relation] of beforeRelations) if (!afterRelations.has(key)) lines.push(`Disconnected ${connection(relation)}`);

  // Notes have no ids: one whose text changed is one removed and one added
  const beforeNotes = new Set((before.notes ?? []).map(noteKey));
  const afterNotes = new Set((after.notes ?? []).map(noteKey));
  const where = (note: Note) => (note.resource ? ` on ${nameOf(note.resource)}` : '');
  for (const note of after.notes ?? [])
    if (!beforeNotes.has(noteKey(note))) lines.push(`Wrote ${note.kind === 'text' ? 'text' : 'a note'}${where(note)}: "${note.text}"`);
  for (const note of before.notes ?? [])
    if (!afterNotes.has(noteKey(note))) lines.push(`Removed ${note.kind === 'text' ? 'text' : 'a note'}${where(note)}: "${note.text}"`);

  return lines;
}

/** The message that sends the changes to the agent, asking it to make them in the code */
export function syncMessage(changes: string[]): string {
  const listed = changes.slice(0, MAX_LINES).map((line) => `- ${line}`);
  if (changes.length > MAX_LINES) listed.push(`- …and ${changes.length - MAX_LINES} more (the whole diagram is in your context)`);
  return [
    'I changed the design on the EventCatalog Studio canvas (Sync to agent is on):',
    ...listed,
    '',
    "Make these changes in the code. The diagram as it is now is in your context: build on it, and don't redraw it unless I ask.",
  ].join('\n');
}
