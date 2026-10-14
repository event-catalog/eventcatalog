/**
 * Text versions of the model for clients without MCP Apps (e.g. Claude Code): a Mermaid diagram of a level, and a
 * short summary.
 */
import { MESSAGE_TYPES, type Level, type Model, type Resource } from '@eventcatalog/visualiser/model';

// Mermaid labels: no quotes, brackets or markup from untrusted strings
const label = (text: string) => text.replace(/["`<>{}[\]()|#&;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || '?';
const nodeKey = (id: string) => `n_${id.replace(/[^A-Za-z0-9_]/g, '_')}`;

const SHAPES: Record<string, [string, string]> = {
  service: ['[', ']'],
  event: ['>', ']'],
  command: ['>', ']'],
  query: ['>', ']'],
  channel: ['([', '])'],
  container: ['[(', ')]'],
  system: ['[[', ']]'],
  domain: ['{{', '}}'],
  actor: ['((', '))'],
  'external-system': ['[/', '/]'],
  agent: ['[', ']'],
  view: ['[', ']'],
  entity: ['[/', '\\]'],
  team: ['((', '))'],
};

const nodeLine = (r: Resource) => {
  const [open, close] = SHAPES[r.type];
  return `${nodeKey(r.id)}${open}"${label(r.name)} (${r.type})"${close}`;
};

/**
 * Mermaid flowchart. "messages" draws everything with services in subgraphs for their systems and domains;
 * "services" connects services directly; "overview" connects systems and domains.
 */
export function toMermaid(model: Model, level: Level = 'messages'): string {
  const byId = new Map(model.resources.map((r) => [r.id, r]));
  const lines = ['flowchart LR'];
  const arrow = (inferred?: boolean) => (inferred ? '-.->' : '-->');

  // What a resource is shown as at this level
  const shownAs = (r: Resource): Resource | undefined => {
    if (level === 'messages') return r;
    if (level === 'services') return MESSAGE_TYPES.has(r.type) || r.type === 'channel' ? undefined : r;
    // overview: services fold into their system or domain
    let current: Resource | undefined = r;
    while (current && current.type !== 'system' && current.type !== 'domain') current = current.parent ? byId.get(current.parent) : undefined;
    return current;
  };

  if (level === 'messages' || level === 'services') {
    // Subgraphs for domains and systems, with their services inside
    const children = new Map<string | undefined, Resource[]>();
    for (const r of model.resources) {
      if (level === 'services' && !shownAs(r)) continue;
      const key = r.parent && byId.has(r.parent) ? r.parent : undefined;
      children.set(key, [...(children.get(key) ?? []), r]);
    }
    const write = (r: Resource, indent: string) => {
      if (r.type === 'domain' || r.type === 'system') {
        lines.push(`${indent}subgraph ${nodeKey(r.id)}["${label(r.name)} (${r.type})"]`);
        (children.get(r.id) ?? []).forEach((child) => write(child, indent + '  '));
        lines.push(`${indent}end`);
      } else {
        lines.push(`${indent}${nodeLine(r)}`);
      }
    };
    (children.get(undefined) ?? []).forEach((r) => write(r, '  '));
  }

  const seen = new Set<string>();
  const edge = (from: Resource, to: Resource, text: string, inferred?: boolean) => {
    const key = `${from.id}->${to.id}:${text}`;
    if (from.id === to.id || seen.has(key)) return;
    seen.add(key);
    lines.push(`  ${nodeKey(from.id)} ${arrow(inferred)}|${label(text)}| ${nodeKey(to.id)}`);
  };

  if (level === 'messages') {
    for (const rel of model.relations) {
      const from = byId.get(rel.from);
      const to = byId.get(rel.to);
      if (!from || !to) continue;
      if (rel.kind === 'receives') edge(to, from, 'received by', rel.inferred);
      else edge(from, to, rel.kind, rel.inferred);
    }
  } else {
    // Connect senders to receivers through each message
    const senders = model.relations.filter((r) => r.kind === 'sends');
    const receivers = model.relations.filter((r) => r.kind === 'receives');
    for (const send of senders) {
      for (const receive of receivers.filter((r) => r.to === send.to)) {
        const from = byId.get(send.from) && shownAs(byId.get(send.from)!);
        const to = byId.get(receive.from) && shownAs(byId.get(receive.from)!);
        const message = byId.get(send.to);
        if (from && to && message) edge(from, to, message.name, send.inferred || receive.inferred);
      }
    }
    if (level === 'services') {
      for (const rel of model.relations.filter((r) => r.kind === 'reads' || r.kind === 'writes')) {
        const from = byId.get(rel.from);
        const to = byId.get(rel.to);
        if (from && to) edge(from, to, rel.kind, rel.inferred);
      }
    }
    // Declare the nodes used on the overview
    if (level === 'overview') {
      const used = new Set(lines.slice(1).flatMap((line) => line.match(/n_[A-Za-z0-9_]+/g) ?? []));
      const declared = model.resources.filter((r) => (r.type === 'system' || r.type === 'domain') && used.has(nodeKey(r.id)));
      lines.splice(1, 0, ...declared.map((r) => `  ${nodeLine(r)}`));
    }
  }
  return lines.join('\n');
}

/** Counts per type, the busiest resources, and the warnings */
export function summarise(model: Model, warnings: string[]) {
  const counts: Record<string, number> = {};
  model.resources.forEach((r) => (counts[r.type] = (counts[r.type] ?? 0) + 1));
  const degree = new Map<string, number>();
  model.relations.forEach((r) => [r.from, r.to].forEach((id) => degree.set(id, (degree.get(id) ?? 0) + 1)));
  const byId = new Map(model.resources.map((r) => [r.id, r]));
  const mostConnected = [...degree]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => `${byId.get(id)?.name ?? id} (${byId.get(id)?.type}, ${count} connections)`);
  const inferred = model.relations.filter((r) => r.inferred).length;
  // What's flagged on it, most important first
  const order = { critical: 0, warning: 1, info: 2 };
  const hotspots = [...(model.hotspots ?? [])]
    .sort((a, b) => order[a.severity] - order[b.severity])
    .map((h) => `[${h.severity}] ${h.title}${h.resource ? ` (on ${byId.get(h.resource)?.name ?? h.resource})` : ''}${h.description ? `: ${h.description}` : ''}`);
  // Conversations people are having on it, still open: to answer or act on
  const openComments = (model.comments ?? [])
    .filter((thread) => !thread.resolved)
    .map((thread) => `On ${thread.nodeId ? (byId.get(thread.nodeId)?.name ?? thread.nodeId) : 'the canvas'}: ${thread.messages.map((m) => `${m.author.name}: ${m.text}`).join(' / ')}`);
  return {
    counts,
    relations: model.relations.length,
    inferredRelations: inferred,
    mostConnected,
    ...(hotspots.length && { hotspots }),
    ...(openComments.length && { openComments }),
    warnings,
  };
}


