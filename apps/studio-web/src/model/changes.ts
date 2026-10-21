/**
 * Changes to a diagram, as the agent sends them (edit_diagram): a short list of what to add, change and remove,
 * never the whole model again. The view applies them to the diagram as it is now (with what people changed on it),
 * one at a time: a change that would break the model (an unknown id, a service in a message) is turned down with
 * the reason and the rest still go on. Shared by the MCP server (the tool's schema), the view (applying them) and
 * agents in the browser (WebMCP).
 */
import { z } from 'zod';
import { Hotspot, Note, Relation, RelationKind, Resource, validateModel, type Model } from '@eventcatalog/visualiser/model';

const id = z.string().min(1).max(120);

export const Change = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add_resource'), resource: Resource }).describe('Add a resource (set parent to put it in its domain or system)'),
  z
    .object({
      op: z.literal('update_resource'),
      id,
      set: Resource.omit({ id: true }).partial().describe('Only the fields to change'),
    })
    .describe("Change a resource's fields (name, summary, parent, technology...)"),
  z.object({ op: z.literal('remove_resource'), id }).describe('Remove a resource, its relations and its hotspots (what was in it stays)'),
  z.object({ op: z.literal('add_relation'), relation: Relation }),
  z
    .object({ op: z.literal('remove_relation'), from: id, to: id, kind: RelationKind.optional() })
    .describe('Remove the relations from one resource to another (of one kind, if given)'),
  z.object({ op: z.literal('add_hotspot'), hotspot: Hotspot }).describe('Flag a risk, problem or key part'),
  z.object({ op: z.literal('remove_hotspot'), id: z.string().min(1).max(60) }),
  z.object({ op: z.literal('add_note'), note: Note.pick({ text: true, resource: true }) }).describe('A sticky note (only when the user asks for one)'),
  z.object({ op: z.literal('set_title'), title: z.string().min(1).max(200) }),
]);
export type Change = z.infer<typeof Change>;

export const Changes = z
  .array(Change)
  .min(1)
  .max(200)
  .describe('What to change, applied in order. Use the ids read_diagram shows; new resources are placed next to what they connect to');
export type Changes = z.infer<typeof Changes>;

/** How one change went: applied, or why not */
export type ChangeResult = { index: number; op: Change['op']; ok: boolean; error?: string };

// Validation errors name relations by their index, which moves as relations come and go
const normalised = (errors: string[]) => new Set(errors.map((error) => error.replace(/^Relation \d+ /, 'Relation ')));

const without = <T,>(items: T[] | undefined, keep: (item: T) => boolean) => items?.filter(keep);

/** One change on the model (or why it can't be made), before it's checked */
function applyOne(model: Model, change: Change): Model | string {
  const has = (resourceId: string) => model.resources.some((resource) => resource.id === resourceId);
  switch (change.op) {
    case 'add_resource':
      if (has(change.resource.id)) return `"${change.resource.id}" is already on the diagram: use update_resource to change it.`;
      return { ...model, resources: [...model.resources, change.resource] };
    case 'update_resource':
      if (!has(change.id)) return `"${change.id}" isn't on the diagram.`;
      return { ...model, resources: model.resources.map((resource) => (resource.id === change.id ? { ...resource, ...change.set, id: resource.id } : resource)) };
    case 'remove_resource':
      if (!has(change.id)) return `"${change.id}" isn't on the diagram.`;
      return {
        ...model,
        // What was in it stays on the diagram, out of it
        resources: model.resources
          .filter((resource) => resource.id !== change.id)
          .map((resource) => (resource.parent === change.id ? { ...resource, parent: undefined } : resource)),
        relations: model.relations.filter((relation) => relation.from !== change.id && relation.to !== change.id),
        hotspots: without(model.hotspots, (hotspot) => hotspot.resource !== change.id),
        notes: without(model.notes, (note) => note.resource !== change.id),
      };
    case 'add_relation': {
      const { from, to, kind } = change.relation;
      if (model.relations.some((relation) => relation.from === from && relation.to === to && relation.kind === kind))
        return `${from} already ${kind} ${to}.`;
      return { ...model, relations: [...model.relations, change.relation] };
    }
    case 'remove_relation': {
      const matches = (relation: Model['relations'][number]) =>
        relation.from === change.from && relation.to === change.to && (!change.kind || relation.kind === change.kind);
      if (!model.relations.some(matches)) return `There's no relation from "${change.from}" to "${change.to}"${change.kind ? ` (${change.kind})` : ''}.`;
      return { ...model, relations: model.relations.filter((relation) => !matches(relation)) };
    }
    case 'add_hotspot':
      if (change.hotspot.resource && !has(change.hotspot.resource)) return `"${change.hotspot.resource}" isn't on the diagram.`;
      if (model.hotspots?.some((hotspot) => hotspot.id === change.hotspot.id)) return `There's already a hotspot "${change.hotspot.id}".`;
      return { ...model, hotspots: [...(model.hotspots ?? []), change.hotspot] };
    case 'remove_hotspot':
      if (!model.hotspots?.some((hotspot) => hotspot.id === change.id)) return `There's no hotspot "${change.id}".`;
      return { ...model, hotspots: model.hotspots.filter((hotspot) => hotspot.id !== change.id) };
    case 'add_note':
      if (change.note.resource && !has(change.note.resource)) return `"${change.note.resource}" isn't on the diagram.`;
      return { ...model, notes: [...(model.notes ?? []), change.note] };
    case 'set_title':
      return { ...model, title: change.title };
  }
}

/**
 * Applies the changes in order. Each is checked against the model's rules: one that would add a problem the model
 * didn't have (an unknown id, a resource in the wrong kind of parent, a relation the types don't allow) is turned
 * down with the reason, and the next one goes on from the model without it
 */
export function applyChanges(model: Model, changes: Changes): { model: Model; results: ChangeResult[] } {
  let current = model;
  let known = normalised(validateModel(current).errors);
  const results = changes.map((change, index): ChangeResult => {
    const next = applyOne(current, change);
    if (typeof next === 'string') return { index, op: change.op, ok: false, error: next };
    const errors = validateModel(next).errors;
    const added = errors.filter((error) => !known.has(error.replace(/^Relation \d+ /, 'Relation ')));
    if (added.length) return { index, op: change.op, ok: false, error: added.join(' ') };
    current = next;
    known = normalised(errors);
    return { index, op: change.op, ok: true };
  });
  return { model: current, results };
}
