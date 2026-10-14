/**
 * Checks beyond the schema: references point at something, relations go the right way, parents make sense.
 * Returns every problem at once, written so an agent can fix the model and try again.
 */
import {
  MESSAGE_TYPES,
  type Model,
  type Resource,
  type ResourceType,
  type Scene,
} from "./schema";

export type ValidationResult = { errors: string[]; warnings: string[] };

// What each relation kind connects
const RELATION_RULES: Record<
  string,
  { from: ResourceType[]; to: ResourceType[] }
> = {
  sends: {
    from: ["service", "agent", "view", "actor", "external-system"],
    to: ["event", "command", "query"],
  },
  receives: {
    from: ["service", "agent", "view", "actor", "external-system"],
    to: ["event", "command", "query"],
  },
  "routes-through": { from: ["event", "command", "query"], to: ["channel"] },
  reads: { from: ["service", "agent"], to: ["container"] },
  writes: { from: ["service", "agent"], to: ["container"] },
};
// "connects" joins anything to anything (described by its label)

// What each type of resource may sit in. Only domains and systems hold things (EventCatalog: domains contain systems
// and subdomains, systems their services); on the canvas people can also put messages, channels and the like in them
const IN_CONTAINERS: ResourceType[] = ["system", "domain"];
const PARENT_RULES: Partial<Record<ResourceType, ResourceType[]>> = {
  service: IN_CONTAINERS,
  agent: IN_CONTAINERS,
  view: IN_CONTAINERS,
  event: IN_CONTAINERS,
  command: IN_CONTAINERS,
  query: IN_CONTAINERS,
  channel: IN_CONTAINERS,
  container: IN_CONTAINERS,
  actor: IN_CONTAINERS,
  "external-system": IN_CONTAINERS,
  entity: IN_CONTAINERS,
  team: IN_CONTAINERS,
  system: IN_CONTAINERS,
  domain: ["domain"],
};

/** A tour's scenes must point at resources in the model */
export function validateTour(model: Model, tour: Scene[]): string[] {
  const ids = new Set(model.resources.map((r) => r.id));
  const errors: string[] = [];
  tour.forEach((scene, index) => {
    const used = [
      ...(scene.focus ?? []),
      ...(scene.highlight ?? []),
      ...(scene.notes ?? []).map((n) => n.resource),
      ...(scene.code ?? []).map((c) => c.resource),
    ];
    for (const id of new Set(used))
      if (!ids.has(id))
        errors.push(
          `Scene ${index + 1}: "${id}" isn't a resource in the diagram. Use the ids from the model.`,
        );
  });
  return errors;
}

export function validateModel(model: Model): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byId = new Map<string, Resource>();

  for (const resource of model.resources) {
    if (byId.has(resource.id))
      errors.push(
        `Duplicate id "${resource.id}": every resource needs a unique id.`,
      );
    byId.set(resource.id, resource);
  }

  for (const resource of model.resources) {
    if (!resource.parent) continue;
    const parent = byId.get(resource.parent);
    const allowed = PARENT_RULES[resource.type];
    if (!allowed) {
      errors.push(
        `${resource.type} "${resource.id}" has parent "${resource.parent}", but a ${resource.type} can't have a parent. Remove it.`,
      );
    } else if (!parent) {
      errors.push(
        `${resource.type} "${resource.id}" has parent "${resource.parent}", which isn't a resource. Add it or remove the parent.`,
      );
    } else if (!allowed.includes(parent.type)) {
      errors.push(
        `${resource.type} "${resource.id}" is in ${parent.type} "${parent.id}", but a ${resource.type} can only sit in a ${allowed.join(" or ")}.` +
          (resource.type === "domain" && parent.type === "system"
            ? " In EventCatalog domains contain systems: set the system's parent to the domain instead."
            : ""),
      );
    }
  }

  // Parent cycles
  for (const resource of model.resources) {
    const seen = new Set<string>([resource.id]);
    for (
      let current = resource.parent && byId.get(resource.parent);
      current;
      current = current.parent ? byId.get(current.parent) : undefined
    ) {
      if (seen.has(current.id)) {
        errors.push(
          `"${resource.id}" is inside itself (parents loop through "${current.id}"). Break the loop.`,
        );
        break;
      }
      seen.add(current.id);
    }
  }

  model.relations.forEach((relation, index) => {
    const label = `Relation ${index} (${relation.from} ${relation.kind} ${relation.to})`;
    const from = byId.get(relation.from);
    const to = byId.get(relation.to);
    if (!from)
      errors.push(
        `${label}: "${relation.from}" isn't a resource. Add it or fix the id.`,
      );
    if (!to)
      errors.push(
        `${label}: "${relation.to}" isn't a resource. Add it or fix the id.`,
      );
    if (!from || !to) return;
    const rule = RELATION_RULES[relation.kind];
    if (
      rule &&
      (!rule.from.includes(from.type) || !rule.to.includes(to.type))
    ) {
      errors.push(
        `${label}: "${relation.kind}" goes from a ${rule.from.join("/")} to a ${rule.to.join("/")}, not from a ${from.type} to a ${to.type}.`,
      );
    }
  });

  (model.hotspots ?? []).forEach((hotspot, index) => {
    if (hotspot.resource && !byId.has(hotspot.resource))
      errors.push(
        `Hotspot ${index + 1} ("${hotspot.title.slice(0, 40)}"): "${hotspot.resource}" isn't a resource. Use the id of a resource in the model.`,
      );
    if (!hotspot.resource && !hotspot.position)
      errors.push(
        `Hotspot ${index + 1} ("${hotspot.title.slice(0, 40)}"): set resource, the id of the resource it's about.`,
      );
  });
  (model.notes ?? []).forEach((note, index) => {
    if (note.resource && !byId.has(note.resource))
      errors.push(
        `Note ${index + 1}: "${note.resource}" isn't a resource. Use the id of a resource in the model, or leave it out.`,
      );
  });

  // Warnings: likely gaps, but still worth drawing
  const connected = new Set(model.relations.flatMap((r) => [r.from, r.to]));
  const sent = new Set(
    model.relations.filter((r) => r.kind === "sends").map((r) => r.to),
  );
  for (const resource of model.resources) {
    if (resource.type === "service" && !connected.has(resource.id))
      warnings.push(
        `Service "${resource.id}" has no relations: what does it send, receive, read or write?`,
      );
    if (MESSAGE_TYPES.has(resource.type) && !sent.has(resource.id))
      warnings.push(
        `${resource.type} "${resource.id}" has no sender in the model.`,
      );
  }
  const inferred = model.relations.filter((r) => r.inferred).length;
  if (model.relations.length >= 4 && inferred / model.relations.length > 0.5)
    warnings.push(
      `${inferred} of ${model.relations.length} relations are inferred: look for evidence in code or specs to confirm them.`,
    );

  return { errors, warnings };
}
