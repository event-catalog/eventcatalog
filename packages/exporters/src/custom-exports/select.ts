import type {
  CatalogModel,
  ChannelModel,
  ChannelRef,
  DataStoreModel,
  DomainModel,
  EntityModel,
  FlowModel,
  MessageModel,
  Owner,
  Ref,
  SectionKind,
  ServiceModel,
  SystemModel,
  TeamModel,
} from '../catalog/model';
import { matchesProperty } from '@eventcatalog/sdk';
import { matchesVersion } from '../catalog/versions';
import { RESOURCE_LINK } from '../html/markdown';
import { describeSelector, isPropertySelector, type ExportSelector, type CustomExportSpec, type SelectorKind } from './spec';

/**
 * Chooses a custom export's part of the catalog, in this order:
 *   1. exclude, and neverExport (eventcatalog.config.js): what nothing below may add (a domain or system with what's
 *      in it)
 *   2. include: what the export names, by id or by custom property (a domain or system brings what's in it)
 *   3. references: include adds what those point at (one level)
 *   4. hide: leaves fields out of what's left
 * A pointer at anything outside the export is then dropped (or kept as a plain name with `references: name-only`).
 * A resource taken out by exclude or neverExport is never named, whatever `references` says.
 */

type Resource =
  | DomainModel
  | SystemModel
  | ServiceModel
  | MessageModel
  | ChannelModel
  | DataStoreModel
  | FlowModel
  | EntityModel
  | TeamModel;

export interface CustomExportEntry {
  kind: SectionKind;
  id: string;
  name: string;
  version?: string;
  /** Why it's in (or out of) the export. */
  reason: string;
}

export interface CustomExportLink {
  from: string;
  to: string;
  /** Dropped from the page, or shown as a plain name. */
  action: 'dropped' | 'named';
  reason: string;
}

export interface CustomExportReport {
  id: string;
  title: string;
  file?: string;
  included: CustomExportEntry[];
  /** What exclude and neverExport took out of what the export would otherwise have. */
  excluded: CustomExportEntry[];
  /** Selectors in include and exclude that matched nothing in the catalog. */
  unmatched: { field: 'include' | 'exclude'; selector: string; reason: string }[];
  links: CustomExportLink[];
  /** Resource links ([[service|id]]) in docs that lead outside the export, and the text shown in their place. */
  mentions: { from: string; to: string; shownAs: string }[];
  hidden: CustomExportSpec['hide'];
}

const KIND_WORD: Record<string, string> = { container: 'data store' };
const label = (r: { kind: string; id: string }) => `${KIND_WORD[r.kind] ?? r.kind} ${r.id}`;
const keyOf = (r: { kind: string; id: string }) => `${r.kind}:${r.id}`;
const MESSAGE_KINDS = ['event', 'command', 'query'];
const singular = (type: string) => (type.endsWith('ies') ? `${type.slice(0, -3)}y` : type.replace(/s$/, ''));

export function selectCustomExport(
  model: CatalogModel,
  spec: CustomExportSpec,
  { neverExport = [] }: { neverExport?: ExportSelector[] } = {}
): { model: CatalogModel; report: CustomExportReport; intro: string } {
  const hidden = new Set(spec.hide);
  const resources = new Map<string, Resource>();
  [
    ...model.domains,
    ...model.systems,
    ...model.services,
    ...model.messages,
    ...model.channels,
    ...model.dataStores,
    ...model.flows,
    ...model.entities,
    ...model.teams,
    ...model.users,
  ].forEach((r) => resources.set(keyOf(r), r));
  // Pointers with an anchor are the ones at a resource's exported version: the only ones that count as relationships
  const linked = (refs: (Ref | undefined)[]) => refs.filter((r): r is Ref => Boolean(r?.anchor && resources.has(keyOf(r))));
  const versionOf = (r: Resource) => ('version' in r ? r.version : undefined);

  const kindsOf = (kind: SelectorKind) => (kind === 'message' ? MESSAGE_KINDS : [kind]);
  const matches = (selector: ExportSelector): { found: Resource[]; otherVersion?: Resource } => {
    if (isPropertySelector(selector)) {
      const kinds = selector.kinds && new Set(selector.kinds.flatMap(kindsOf));
      const wanted = Object.entries(selector.properties);
      return {
        found: [...resources.values()].filter(
          (r) =>
            (!kinds || kinds.has(r.kind)) &&
            'properties' in r &&
            wanted.every(([name, values]) => name in r.properties && matchesProperty(r.properties[name], values))
        ),
      };
    }
    const named = kindsOf(selector.kind)
      .map((kind) => resources.get(`${kind}:${selector.id}`))
      .filter((r): r is Resource => Boolean(r));
    // `service: X` reaches an agent called X only when no service is, as [[service|X]] links do
    const agent = selector.kind === 'service' && !named.length ? resources.get(`agent:${selector.id}`) : undefined;
    const found = agent ? [agent] : named;
    return {
      found: found.filter((r) => matchesVersion(selector.version, versionOf(r))),
      otherVersion: found.find((r) => !matchesVersion(selector.version, versionOf(r))),
    };
  };
  /** Why a selector took a resource in or out: the field, and the properties it matched. */
  const because = (field: string, selector: ExportSelector) =>
    isPropertySelector(selector) ? `${field} ${describeSelector(selector)}` : field;

  const entry = (k: string, reason: string): CustomExportEntry => {
    const r = resources.get(k)!;
    return { kind: r.kind, id: r.id, name: r.name, version: versionOf(r), reason };
  };

  /**
   * What a domain or system holds: its subdomains, systems, services, data stores, entities and flows and, when it's
   * included, the messages its services send and receive (but not those of services taken out by exclude).
   */
  const removed = new Map<string, string>();
  const messagesOf = (services: Ref[]) =>
    services.flatMap((s) => {
      const service = resources.get(keyOf(s)) as ServiceModel | undefined;
      return service && !removed.has(keyOf(s)) ? [...service.sends, ...service.receives].map((l) => l.message) : [];
    });
  const contents = (r: Resource, { messages }: { messages: boolean }): Ref[] => {
    if (r.kind === 'domain')
      return linked([
        ...r.subdomains,
        ...r.systems,
        ...r.services,
        ...r.entities,
        ...r.flows,
        ...(messages ? [...r.sends, ...r.receives, ...messagesOf(r.services)] : []),
      ]);
    if (r.kind === 'system')
      return linked([...r.services, ...r.dataStores, ...r.entities, ...r.flows, ...(messages ? messagesOf(r.services) : [])]);
    return [];
  };
  /** A resource and everything in it, all the way down (a domain's subdomains, their systems, …), while add says yes */
  const withContents = (r: Resource, reason: string, add: (r: Resource, reason: string) => boolean, messages: boolean) => {
    const visit = (parent: Resource, seen: Set<string>) => {
      for (const ref of contents(parent, { messages })) {
        const child = resources.get(keyOf(ref));
        if (!child || seen.has(keyOf(child))) continue;
        seen.add(keyOf(child));
        if (add(child, `in ${label(parent)}`)) visit(child, seen);
      }
    };
    if (add(r, reason)) visit(r, new Set([keyOf(r)]));
  };

  // ---------- exclude and neverExport: what nothing below may add, or bring anything with it ----------
  const remove = (selectors: ExportSelector[], field: string) =>
    selectors.forEach((selector) => {
      const reason = because(field, selector);
      matches(selector).found.forEach((r) =>
        withContents(r, reason, (x) => (removed.has(keyOf(x)) ? false : (removed.set(keyOf(x), reason), true)), false)
      );
    });
  remove(neverExport, 'neverExport in eventcatalog.config.js');
  remove(spec.exclude, 'exclude');
  const notFound = (selector: ExportSelector) =>
    isPropertySelector(selector) ? 'nothing in the catalog has it' : 'not in the catalog';
  const excludeMisses: CustomExportReport['unmatched'] = spec.exclude
    .filter((selector) => !matches(selector).found.length)
    .map((selector) => ({ field: 'exclude', selector: describeSelector(selector), reason: notFound(selector) }));

  const inExport = new Map<string, string>();
  const excluded = new Map<string, CustomExportEntry>();
  const add = (r: Resource, reason: string) => {
    const k = keyOf(r);
    if (removed.has(k)) {
      if (!excluded.has(k)) excluded.set(k, entry(k, `${removed.get(k)}, was ${reason}`));
      return false;
    }
    if (!inExport.has(k)) inExport.set(k, reason);
    return true;
  };

  // ---------- include ----------
  const includeMisses: CustomExportReport['unmatched'] = [];
  for (const selector of spec.include) {
    const { found, otherVersion } = matches(selector);
    if (!found.length) {
      includeMisses.push({
        field: 'include',
        selector: describeSelector(selector),
        reason:
          otherVersion && !isPropertySelector(selector)
            ? `only version ${versionOf(otherVersion)} is exported, which isn't ${selector.version}`
            : notFound(selector),
      });
      continue;
    }
    found.forEach((r) => withContents(r, because('include', selector), add, true));
  }

  // ---------- references: include ----------
  /** Every pointer a resource has, to anything (owners only when they're shown) */
  const pointersOf = (r: Resource): (Ref | undefined)[] => {
    const owners = 'owners' in r && !hidden.has('owners') ? r.owners : [];
    switch (r.kind) {
      case 'domain':
        return [
          r.parent,
          ...r.subdomains,
          ...r.systems,
          ...r.services,
          ...r.sends,
          ...r.receives,
          ...r.entities,
          ...r.flows,
          ...owners,
        ];
      case 'system':
        return [
          r.domain,
          ...r.services,
          ...r.flows,
          ...r.entities,
          ...r.dataStores,
          ...r.relationships.map((x) => x.ref),
          ...owners,
        ];
      case 'service':
      case 'agent':
        return [
          r.domain,
          r.system,
          ...[...r.sends, ...r.receives].flatMap((l) => [l.message, ...l.channels]),
          ...r.upstream,
          ...r.downstream,
          ...r.writesTo,
          ...r.readsFrom,
          ...owners,
        ];
      case 'event':
      case 'command':
      case 'query':
        return [r.domain, ...r.producers, ...r.consumers, ...r.channels, ...owners];
      case 'channel':
        return [...r.messages, ...r.routesTo, ...r.routedFrom, ...owners];
      case 'container':
        return [r.system, ...r.writers, ...r.readers, ...owners];
      case 'flow':
        return [...r.steps.map((s) => s.ref), ...owners];
      case 'entity':
        return [r.domain, ...owners];
      case 'team':
      case 'user':
        // Owners hidden means ownership is hidden from both sides: a team doesn't bring in what it owns either
        return [...r.members, ...r.teams, ...(hidden.has('owners') ? [] : r.owns)];
    }
  };
  if (spec.references === 'include') {
    for (const k of [...inExport.keys()]) {
      const from = resources.get(k)!;
      for (const ref of linked(pointersOf(from))) add(resources.get(keyOf(ref))!, `referenced by ${label(from)}`);
    }
  }

  // ---------- pointers out of the export ----------
  const links = new Map<string, CustomExportLink>();
  const point =
    <R extends Ref>(from: Resource) =>
    (r: R | undefined): R | undefined => {
      if (!r) return undefined;
      if (inExport.has(keyOf(r))) return r;
      const isRemoved = removed.has(keyOf(r));
      const named = !isRemoved && spec.references === 'name-only';
      const linkKey = `${keyOf(from)}>${keyOf(r)}`;
      if (!links.has(linkKey))
        links.set(linkKey, {
          from: label(from),
          to: label(r),
          action: named ? 'named' : 'dropped',
          reason: isRemoved ? removed.get(keyOf(r))! : 'not in this export',
        });
      return named ? { ...r, anchor: undefined } : undefined;
    };
  const pointAll = <R extends Ref>(from: Resource, refs: R[]) => refs.map(point<R>(from)).filter((r): r is R => Boolean(r));
  const ownersOf = (r: Resource & { owners: Owner[] }) => (hidden.has('owners') ? [] : pointAll(r, r.owners));

  // ---------- resource links in docs ([[service|id]]) that lead out of the export ----------
  // A link to something outside the export reads "another service" (or, with name-only, the resource's name), so
  // nothing exclude took out is named in prose either
  const mentions = new Map<string, CustomExportReport['mentions'][number]>();
  const rewriteLinks = (from: string, markdown: string) =>
    markdown.replace(RESOURCE_LINK, (link, type: string, rawId: string) => {
      const kind = /^data-?stores?$/i.test(type) ? 'container' : singular(type.toLowerCase());
      const id = rawId.trim();
      if (!id) return link;
      const target = resources.get(`${kind}:${id}`) ?? (kind === 'service' ? resources.get(`agent:${id}`) : undefined);
      if (!target || inExport.has(keyOf(target))) return link;
      const shownAs =
        spec.references === 'name-only' && !removed.has(keyOf(target))
          ? target.name
          : `another ${KIND_WORD[target.kind] ?? target.kind}`;
      mentions.set(`${from}>${keyOf(target)}`, { from, to: label(target), shownAs });
      return shownAs;
    });
  const docs = (from: Resource, markdown: string) => (hidden.has('docs') ? '' : rewriteLinks(label(from), markdown));
  const intro = rewriteLinks('the introduction', spec.intro);
  const keep = <T extends Resource>(items: T[]) => items.filter((r) => inExport.has(keyOf(r)));
  // Custom properties choose what's in a custom export, but never go out with it: they're often internal (x-cost-centre)

  const domains = keep(model.domains).map(
    (d): DomainModel => ({
      ...d,
      owners: ownersOf(d),
      properties: {},
      markdown: docs(d, d.markdown),
      parent: point(d)(d.parent),
      subdomains: pointAll(d, d.subdomains),
      systems: pointAll(d, d.systems),
      services: pointAll(d, d.services),
      sends: pointAll(d, d.sends),
      receives: pointAll(d, d.receives),
      entities: pointAll(d, d.entities),
      flows: pointAll(d, d.flows),
      specifications: hidden.has('specifications') ? [] : d.specifications,
    })
  );
  const systems = keep(model.systems).map(
    (x): SystemModel => ({
      ...x,
      owners: ownersOf(x),
      properties: {},
      markdown: docs(x, x.markdown),
      domain: point(x)(x.domain),
      services: pointAll(x, x.services),
      flows: pointAll(x, x.flows),
      entities: pointAll(x, x.entities),
      dataStores: pointAll(x, x.dataStores),
      relationships: x.relationships.flatMap((rel) => {
        const ref = point(x)(rel.ref);
        return ref ? [{ ...rel, ref }] : [];
      }),
    })
  );
  const services = keep(model.services).map((s): ServiceModel => {
    const messageLinks = (list: ServiceModel['sends']) =>
      list.flatMap((l) => {
        const message = point<typeof l.message>(s)(l.message);
        return message ? [{ ...l, message, channels: pointAll<ChannelRef>(s, l.channels) }] : [];
      });
    return {
      ...s,
      owners: ownersOf(s),
      properties: {},
      markdown: docs(s, s.markdown),
      domain: point(s)(s.domain),
      system: point(s)(s.system),
      sends: messageLinks(s.sends),
      receives: messageLinks(s.receives),
      upstream: pointAll(s, s.upstream),
      downstream: pointAll(s, s.downstream),
      writesTo: pointAll(s, s.writesTo),
      readsFrom: pointAll(s, s.readsFrom),
      specifications: hidden.has('specifications') ? [] : s.specifications,
      repository: hidden.has('repository') ? undefined : s.repository,
    };
  });
  const messages = keep(model.messages).map(
    (m): MessageModel => ({
      ...m,
      owners: ownersOf(m),
      properties: {},
      markdown: docs(m, m.markdown),
      domain: point(m)(m.domain),
      producers: pointAll(m, m.producers),
      consumers: pointAll(m, m.consumers),
      channels: pointAll(m, m.channels),
      examples: hidden.has('examples') ? [] : m.examples,
      // The page falls back to an example made from the schema when there are no example files: that goes too
      schema: hidden.has('examples') && m.schema ? { ...m.schema, example: undefined } : m.schema,
    })
  );
  const channels = keep(model.channels).map(
    (c): ChannelModel => ({
      ...c,
      owners: ownersOf(c),
      properties: {},
      markdown: docs(c, c.markdown),
      messages: pointAll(c, c.messages),
      routesTo: pointAll(c, c.routesTo),
      routedFrom: pointAll(c, c.routedFrom),
    })
  );
  const dataStores = keep(model.dataStores).map(
    (c): DataStoreModel => ({
      ...c,
      owners: ownersOf(c),
      properties: {},
      markdown: docs(c, c.markdown),
      system: point(c)(c.system),
      writers: pointAll(c, c.writers),
      readers: pointAll(c, c.readers),
    })
  );
  const flows = keep(model.flows).map((f): FlowModel => {
    // A step stays (the flow needs it), without its link. A title that was the resource's own name is replaced, so the
    // resource isn't named; the steps leading to it use the same title.
    const titles = new Map<string, string>();
    const steps = f.steps.map((s) => {
      if (!s.ref) return s;
      const ref = point(f)(s.ref);
      if (ref) return { ...s, ref };
      if (s.title !== s.ref.name && s.title !== s.ref.id) return { ...s, ref: undefined };
      const title = 'A step outside this document';
      titles.set(s.title, title);
      return { ...s, ref: undefined, title, summary: undefined };
    });
    return {
      ...f,
      owners: ownersOf(f),
      properties: {},
      markdown: docs(f, f.markdown),
      steps: steps.map((s) => ({ ...s, next: s.next.map((n) => ({ ...n, title: titles.get(n.title) ?? n.title })) })),
    };
  });
  const entities = keep(model.entities).map(
    (x): EntityModel => ({
      ...x,
      owners: ownersOf(x),
      properties: {},
      markdown: docs(x, x.markdown),
      domain: point(x)(x.domain),
    })
  );
  const people = (list: TeamModel[]) =>
    keep(list).map(
      (t): TeamModel => ({
        ...t,
        members: pointAll(t, t.members),
        teams: pointAll(t, t.teams),
        owns: hidden.has('owners') ? [] : pointAll(t, t.owns),
        ...(hidden.has('contacts') && { email: undefined, slack: undefined }),
      })
    );

  const filtered: CatalogModel = {
    ...model,
    domains,
    systems,
    services,
    messages,
    channels,
    dataStores,
    flows,
    entities,
    teams: people(model.teams),
    users: people(model.users),
  };
  return {
    model: filtered,
    intro,
    report: {
      id: spec.id,
      title: spec.title,
      file: spec.file,
      included: [...inExport].map(([k, reason]) => entry(k, reason)),
      excluded: [...excluded.values()],
      unmatched: [...includeMisses, ...excludeMisses],
      links: [...links.values()],
      mentions: [...mentions.values()],
      hidden: spec.hide,
    },
  };
}
