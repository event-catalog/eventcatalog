/**
 * The diagram as the agent reads it (read_diagram) and as it's told about it (the model's context): what's on it
 * and how it connects, never where things are (the view places them: agents that copied places put things in the
 * wrong spot), and message schemas cut short (the agent read them in the code; they're long).
 */
import type { Model } from '@eventcatalog/visualiser/model';

const SCHEMA_PREVIEW = 300;

/** The model without its layout, and with schemas cut short */
export function outlineModel(model: Model): Omit<Model, 'layout'> {
  const { layout: _, ...rest } = model;
  return {
    ...rest,
    resources: model.resources.map((resource) =>
      resource.schema && resource.schema.content.length > SCHEMA_PREVIEW
        ? { ...resource, schema: { ...resource.schema, content: `${resource.schema.content.slice(0, SCHEMA_PREVIEW)}… (cut short)` } }
        : resource
    ),
  };
}

/** What's on the diagram, a line each (resources, then relations), cut off at `maxChars` with how many more there are */
export function outlineText(model: Model, maxChars = 5000): string {
  const lines = [
    ...model.resources.map(
      (resource) => `- ${resource.id} (${resource.type})${resource.name !== resource.id ? ` "${resource.name}"` : ''}${resource.parent ? ` in ${resource.parent}` : ''}`
    ),
    ...model.relations.map((relation) => `- ${relation.from} ${relation.kind} ${relation.to}${relation.label ? ` (${relation.label})` : ''}`),
  ];
  const kept: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length > maxChars) {
      kept.push(`- …and ${lines.length - kept.length} more: call read_diagram for all of it`);
      break;
    }
    kept.push(line);
    length += line.length + 1;
  }
  return kept.join('\n');
}
