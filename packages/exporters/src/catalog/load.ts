import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import createSDK, { isCustomPropertyName } from '@eventcatalog/sdk';
import type {
  Agent,
  Channel,
  ChannelPointer,
  Container,
  Domain,
  Entity,
  EntityProperty,
  Flow,
  Service,
  System,
  Team,
  User,
} from '@eventcatalog/sdk';
import type {
  Attribute,
  CatalogModel,
  ChannelModel,
  ChannelRef,
  DataStoreModel,
  DomainModel,
  EntityModel,
  FlowModel,
  MessageModel,
  MessageType,
  Owner,
  Ref,
  SectionKind,
  ServiceModel,
  SpecificationModel,
  SystemModel,
  TeamModel,
} from './model';
import { parseSchema } from './schema';
import { matchesVersion } from './versions';

type SDK = ReturnType<typeof createSDK>;

const MESSAGE_TYPES: MessageType[] = ['event', 'command', 'query'];
const EXAMPLE_EXTENSIONS = /\.(json|ya?ml|xml|txt|avro|proto)$/i;

/**
 * The section's id in the page. IDs that are already safe are used as they are; any other ID is made safe and given
 * a short hash of the original, so `orders.created` and `orders-created` never share an anchor.
 */
export const anchorFor = (kind: SectionKind, id: string) => {
  if (/^[A-Za-z0-9_-]+$/.test(id)) return `${kind}-${id}`;
  const hash = createHash('sha1').update(id).digest('hex').slice(0, 8);
  return `${kind}-${id.replace(/[^A-Za-z0-9_-]+/g, '-')}-${hash}`;
};

const deprecatedText = (value: unknown): string | true | undefined => {
  if (!value) return undefined;
  if (typeof value === 'object' && value && 'message' in value && typeof (value as any).message === 'string')
    return (value as any).message;
  return true;
};

const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * Embeds the logo from eventcatalog.config.js so the exported file stays self-contained.
 * Local paths resolve against the catalog's public/ folder, as they do on the site.
 */
const logoFromConfig = (dir: string, logo: { src?: string; alt?: string } | undefined): string | undefined => {
  const src = logo?.src?.trim();
  if (src && /^https?:\/\//i.test(src)) return src;
  if (src) {
    const file = join(dir, 'public', src.replace(/^\/+/, ''));
    const type = IMAGE_TYPES[extname(file).toLowerCase()];
    if (type && existsSync(file)) return `data:${type};base64,${readFileSync(file).toString('base64')}`;
  }
  return undefined;
};

const badgesOf = (r: { badges?: { content: string }[] }) =>
  (r.badges || []).filter((b) => b?.content).map((b) => ({ content: b.content }));

/** The resource's custom properties (its `x-…` frontmatter fields). */
const propertiesOf = (r: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(r).filter(([name]) => isCustomPropertyName(name)));

const entityAttributes = (props: EntityProperty[] = [], depth = 0): Attribute[] =>
  props.map((p) => {
    const nested = p.properties || p.items?.properties;
    const type = p.type === 'array' && p.items?.type ? `array of ${p.items.type}` : p.type;
    return {
      name: p.name,
      type: p.references ? `${type} → ${p.references}` : type,
      required: Boolean(p.required),
      description: p.description,
      enum: p.enum,
      children: nested && depth < 6 ? entityAttributes(nested, depth + 1) : undefined,
    };
  });

/**
 * Reads the catalog through the SDK and resolves every relationship the reference needs.
 * All collections load in parallel; per-message files (schemas, examples) load in parallel too.
 */
export const loadCatalog = async (dir: string): Promise<CatalogModel> => {
  const sdk: SDK = createSDK(dir);
  const latest = { latestOnly: true };
  // Hidden resources stay out of the reference, as they stay out of the catalog itself
  const visible = <T>(items: T[] | undefined): T[] => (items || []).filter((r) => (r as { hidden?: boolean })?.hidden !== true);

  const [
    config,
    domains,
    systems,
    services,
    agents,
    events,
    commands,
    queries,
    channels,
    containers,
    flows,
    entities,
    teams,
    users,
  ] = await Promise.all([
    existsSync(join(dir, 'eventcatalog.config.js')) ? sdk.getEventCatalogConfigurationFile().catch(() => null) : null,
    sdk.getDomains(latest).then(visible),
    sdk
      .getSystems(latest)
      .catch(() => [] as System[])
      .then(visible),
    sdk.getServices(latest).then(visible),
    sdk
      .getAgents(latest)
      .catch(() => [] as Agent[])
      .then(visible),
    sdk.getEvents(latest).then(visible),
    sdk.getCommands(latest).then(visible),
    sdk.getQueries(latest).then(visible),
    sdk.getChannels(latest).then(visible),
    sdk
      .getDataStores(latest)
      .catch(() => [] as Container[])
      .then(visible),
    sdk.getFlows(latest).then(visible),
    sdk.getEntities(latest).then(visible),
    sdk.getTeams().then(visible),
    sdk.getUsers().then(visible),
  ]);

  const list = <T>(items: T[] | undefined): T[] => items || [];

  // ---------- references ----------
  const refs = new Map<string, Ref>();
  const versions = new Map<string, string>();
  const key = (kind: SectionKind, id: string) => `${kind}:${id}`;
  const register = (kind: SectionKind, r: { id: string; name?: string; version?: string }) => {
    refs.set(key(kind, r.id), { kind, id: r.id, name: r.name || r.id, anchor: anchorFor(kind, r.id) });
    if (r.version) versions.set(key(kind, r.id), r.version);
  };

  list(domains).forEach((r) => register('domain', r));
  list(systems).forEach((r) => register('system', r));
  list(services).forEach((r) => register('service', r));
  list(agents).forEach((r) => register('agent', r));
  list(events).forEach((r) => register('event', r));
  list(commands).forEach((r) => register('command', r));
  list(queries).forEach((r) => register('query', r));
  list(channels).forEach((r) => register('channel', r));
  list(flows).forEach((r) => register('flow', r));
  list(entities).forEach((r) => register('entity', r));
  list(containers).forEach((r) => register('container', r));
  list(teams).forEach((r) => register('team', r));
  list(users).forEach((r) => register('user', r));

  const ref = (kind: SectionKind, id: string): Ref => refs.get(key(kind, id)) || { kind, id, name: id };
  const messageKind = new Map<string, MessageType>();
  list(events).forEach((m) => messageKind.set(m.id, 'event'));
  list(commands).forEach((m) => messageKind.set(m.id, 'command'));
  list(queries).forEach((m) => messageKind.set(m.id, 'query'));
  const messageKindOf = (id: string): MessageType => messageKind.get(id) || 'event';
  const serviceKindOf = (id: string): 'service' | 'agent' =>
    !refs.has(key('service', id)) && refs.has(key('agent', id)) ? 'agent' : 'service';
  const messageRef = (id: string) => ref(messageKindOf(id), id) as Ref & { kind: MessageType };

  // ---------- versions ----------
  // Only latest versions are exported. Every pointer in the catalog (sends, channels, data stores, memberships,
  // flow steps, …) counts as a relationship with a section only when it points at that section's version: no
  // version, 'latest', the exact version, or a range it satisfies (matchesVersion follows the SDK and core).
  // A pointer at an older version is shown named and labelled with its version, but never linked or counted.
  type Pointer = { id: string; version?: string };
  const pointsAt = (kind: SectionKind, p: Pointer) => matchesVersion(p.version, versions.get(key(kind, p.id)));
  const pointerRef = (kind: SectionKind, p: Pointer): Ref => {
    const r = ref(kind, p.id);
    return pointsAt(kind, p) ? r : { kind, id: p.id, name: `${r.name} v${p.version}` };
  };
  const pointsAtLatest = (p: Pointer) => pointsAt(messageKindOf(p.id), p);
  const pointsAtLatestChannel = (p: Pointer) => pointsAt('channel', p);
  const storeRef = (p: Pointer) => pointerRef('container', p);
  const serviceRef = (p: Pointer) => pointerRef(serviceKindOf(p.id), p);

  const channelById = new Map(list(channels).map((c) => [c.id, c]));
  const channelRef = (p: ChannelPointer): ChannelRef =>
    pointsAtLatestChannel(p)
      ? { ...ref('channel', p.id), kind: 'channel', address: channelById.get(p.id)?.address }
      : { ...pointerRef('channel', p), kind: 'channel' };
  const ownersOf = (ids: string[] = []): Owner[] =>
    ids.map(
      (id) =>
        (refs.has(key('team', id))
          ? ref('team', id)
          : refs.has(key('user', id))
            ? ref('user', id)
            : { kind: 'team', id, name: id }) as Owner
    );

  // ---------- domain membership (only pointers at the exported versions count) ----------
  const systemById = new Map(list(systems).map((s: System) => [s.id, s]));
  const domainOfService = new Map<string, Ref>();
  const domainOfEntity = new Map<string, Ref>();
  const parentOfDomain = new Map<string, Ref>();
  const domainOfSystem = new Map<string, Ref>();
  const systemOfService = new Map<string, Ref>();
  const servicesOfSystem = (x: System | undefined) => list(x?.services).filter((p) => pointsAt(serviceKindOf(p.id), p));
  list(systems).forEach((x) =>
    servicesOfSystem(x).forEach((p) => !systemOfService.has(p.id) && systemOfService.set(p.id, ref('system', x.id)))
  );
  for (const d of list(domains)) {
    const dRef = ref('domain', d.id);
    const ownSystems = list(d.systems).filter((p) => pointsAt('system', p));
    ownSystems.forEach((p) => !domainOfSystem.has(p.id) && domainOfSystem.set(p.id, dRef));
    const serviceIds = [
      ...list(d.services)
        .filter((p) => pointsAt(serviceKindOf(p.id), p))
        .map((p) => p.id),
      ...list(d.agents)
        .filter((p) => pointsAt('agent', p))
        .map((p) => p.id),
      ...ownSystems.flatMap((p) => servicesOfSystem(systemById.get(p.id)).map((s) => s.id)),
    ];
    serviceIds.forEach((id) => !domainOfService.has(id) && domainOfService.set(id, dRef));
    list(d.entities)
      .filter((p) => pointsAt('entity', p))
      .forEach((p) => !domainOfEntity.has(p.id) && domainOfEntity.set(p.id, dRef));
    list(d.domains)
      .filter((p) => pointsAt('domain', p))
      .forEach((p) => parentOfDomain.set(p.id, dRef));
  }

  // ---------- producers and consumers ----------
  type Actor = { ref: Ref; sends: Service['sends']; receives: Service['receives'] };
  const actors: Actor[] = [
    ...list(services).map((s) => ({ ref: ref('service', s.id), sends: s.sends, receives: s.receives })),
    ...list(agents).map((a) => ({ ref: ref('agent', a.id), sends: a.sends, receives: a.receives })),
    ...list(domains).map((d) => ({ ref: ref('domain', d.id), sends: d.sends, receives: d.receives })),
  ];
  const producers = new Map<string, Ref[]>();
  const consumers = new Map<string, Ref[]>();
  const channelsOfMessage = new Map<string, Map<string, ChannelRef>>();
  const messagesOnChannel = new Map<string, Set<string>>();
  const push = <T>(map: Map<string, T[]>, k: string, v: T) => {
    const arr = map.get(k) || [];
    if (!arr.includes(v)) arr.push(v);
    map.set(k, arr);
  };
  const linkChannel = (messageId: string, p: ChannelPointer) => {
    if (!pointsAtLatestChannel(p)) return;
    const chans = channelsOfMessage.get(messageId) || new Map();
    chans.set(p.id, channelRef(p));
    channelsOfMessage.set(messageId, chans);
    const msgs = messagesOnChannel.get(p.id) || new Set();
    msgs.add(messageId);
    messagesOnChannel.set(p.id, msgs);
  };
  for (const a of actors) {
    list(a.sends).forEach((p) => {
      if (!pointsAtLatest(p)) return;
      push(producers, p.id, a.ref);
      list(p.to).forEach((c) => linkChannel(p.id, c));
    });
    list(a.receives).forEach((p) => {
      if (!pointsAtLatest(p)) return;
      push(consumers, p.id, a.ref);
      list(p.from).forEach((c) => linkChannel(p.id, c));
    });
  }
  for (const type of MESSAGE_TYPES) {
    const collection = type === 'event' ? events : type === 'command' ? commands : queries;
    list(collection).forEach((m) => list(m.channels).forEach((c) => linkChannel(m.id, c)));
  }

  // Events belong to the domain that publishes them; commands and queries to the domain that handles them.
  const homeDomain = (id: string, type: MessageType): Ref | undefined => {
    const order = type === 'event' ? [producers, consumers] : [consumers, producers];
    for (const map of order) {
      for (const a of map.get(id) || []) {
        if (a.kind === 'domain') return a;
        const d = domainOfService.get(a.id);
        if (d) return d;
      }
    }
    return undefined;
  };

  // ---------- messages (schemas and examples load in parallel) ----------
  const allMessages = MESSAGE_TYPES.flatMap((type) => {
    const collection = type === 'event' ? events : type === 'command' ? commands : queries;
    return list(collection).map((m) => ({ type, m }));
  });

  const messages: MessageModel[] = await Promise.all(
    allMessages.map(async ({ type, m }) => {
      const [schemaFile, exampleFiles] = await Promise.all([
        m.schemaPath ? sdk.getSchemaForMessage(m.id, m.version).catch(() => undefined) : undefined,
        sdk.getExamplesFromEvent(m.id, m.version).catch(() => [] as { fileName: string; content: string }[]),
      ]);
      return {
        kind: type,
        id: m.id,
        name: m.name || m.id,
        version: m.version,
        summary: m.summary?.trim(),
        markdown: m.markdown || '',
        anchor: anchorFor(type, m.id),
        owners: ownersOf(m.owners),
        badges: badgesOf(m),
        properties: propertiesOf(m),
        deprecated: deprecatedText(m.deprecated),
        draft: Boolean(m.draft),
        domain: homeDomain(m.id, type),
        producers: producers.get(m.id) || [],
        consumers: consumers.get(m.id) || [],
        channels: [...(channelsOfMessage.get(m.id)?.values() || [])],
        operation: m.operation,
        schema: schemaFile ? parseSchema(schemaFile.fileName, schemaFile.schema, m.id, m.summary?.trim()) : undefined,
        examples: exampleFiles.filter((f) => EXAMPLE_EXTENSIONS.test(f.fileName)),
      };
    })
  );

  // ---------- specifications (read from each resource's folder, in parallel) ----------
  const SPEC_LABEL: Record<string, string> = { openapi: 'OpenAPI', asyncapi: 'AsyncAPI', graphql: 'GraphQL' };
  type SpecPointer = { type: string; path: string; name?: string };
  const specPointers = (specs: unknown): SpecPointer[] => {
    if (Array.isArray(specs)) return specs.filter((x) => x?.path).map((x) => ({ type: x.type, path: x.path, name: x.name }));
    if (specs && typeof specs === 'object') {
      const legacy = specs as Record<string, string | undefined>;
      return (['openapi', 'asyncapi', 'graphql'] as const)
        .map((type) => ({ type, path: legacy[`${type}Path`] as string }))
        .filter((x) => Boolean(x.path));
    }
    return [];
  };
  const specificationsByKey = new Map<string, SpecificationModel[]>();
  const withSpecs = [
    ...list(services).map((r) => ({ kind: 'service' as SectionKind, r })),
    ...list(domains).map((r) => ({ kind: 'domain' as SectionKind, r })),
  ].filter(({ r }) => specPointers((r as any).specifications).length);
  await Promise.all(
    withSpecs.map(async ({ kind, r }) => {
      const location = await sdk.getResourcePath(dir, r.id, r.version).catch(() => undefined);
      const folder = location ? dirname(location.fullPath) : undefined;
      const specs = specPointers((r as any).specifications).map((p) => {
        const file = folder ? join(folder, p.path) : undefined;
        let content: string | undefined;
        try {
          content = file && existsSync(file) ? readFileSync(file, 'utf-8') : undefined;
        } catch {
          content = undefined;
        }
        return { type: p.type, name: p.name || SPEC_LABEL[p.type] || p.type, fileName: basename(p.path), content };
      });
      specificationsByKey.set(key(kind, r.id), specs);
    })
  );

  // ---------- services and agents ----------
  const uniqueRefs = (items: Ref[]) => [...new Map(items.map((r) => [key(r.kind, r.id), r])).values()];
  const toServiceModel = (s: Service | Agent, kind: 'service' | 'agent'): ServiceModel => {
    const self = key(kind, s.id);
    const link = (p: { id: string; version?: string }, channelPointers?: ChannelPointer[]) => ({
      message: messageRef(p.id),
      channels: list(channelPointers).map(channelRef),
      // An older pinned version still shows on the service, labelled, but is not a link to the latest section's relationships
      pinnedVersion: pointsAtLatest(p) ? undefined : p.version,
    });
    const sends = list(s.sends).map((p) => link(p, p.to));
    const receives = list(s.receives).map((p) => link(p, p.from));
    return {
      kind,
      id: s.id,
      name: s.name || s.id,
      version: s.version,
      summary: s.summary?.trim(),
      markdown: s.markdown || '',
      anchor: anchorFor(kind, s.id),
      owners: ownersOf(s.owners),
      badges: badgesOf(s),
      properties: propertiesOf(s),
      deprecated: deprecatedText(s.deprecated),
      draft: Boolean(s.draft),
      domain: domainOfService.get(s.id),
      system: systemOfService.get(s.id),
      sends,
      receives,
      upstream: uniqueRefs(
        list(s.receives)
          .filter(pointsAtLatest)
          .flatMap((p) => producers.get(p.id) || [])
      ).filter((r) => key(r.kind, r.id) !== self),
      downstream: uniqueRefs(
        list(s.sends)
          .filter(pointsAtLatest)
          .flatMap((p) => consumers.get(p.id) || [])
      ).filter((r) => key(r.kind, r.id) !== self),
      writesTo: list(s.writesTo).map(storeRef),
      readsFrom: list(s.readsFrom).map(storeRef),
      specifications: specificationsByKey.get(key(kind, s.id)) || [],
      repository: s.repository,
    };
  };
  const serviceModels = [
    ...list(services).map((s) => toServiceModel(s, 'service')),
    ...list(agents).map((a) => toServiceModel(a, 'agent')),
  ];

  // ---------- domains (ubiquitous language loads in parallel) ----------
  const domainModels: DomainModel[] = await Promise.all(
    list(domains).map(async (d: Domain) => {
      const language = await sdk.getUbiquitousLanguageFromDomain(d.id, d.version).catch(() => undefined);
      const dictionary = Array.isArray((language as any)?.dictionary) ? (language as any).dictionary : [];
      return {
        kind: 'domain' as const,
        id: d.id,
        name: d.name || d.id,
        version: d.version,
        summary: d.summary?.trim(),
        markdown: d.markdown || '',
        anchor: anchorFor('domain', d.id),
        owners: ownersOf(d.owners),
        badges: badgesOf(d),
        properties: propertiesOf(d),
        deprecated: deprecatedText(d.deprecated),
        draft: Boolean(d.draft),
        parent: parentOfDomain.get(d.id),
        subdomains: list(d.domains).map((p) => pointerRef('domain', p)),
        systems: list(d.systems).map((p) => pointerRef('system', p)),
        services: serviceModels.filter((s) => domainOfService.get(s.id)?.id === d.id).map((s) => ref(s.kind, s.id)),
        sends: list(d.sends)
          .filter(pointsAtLatest)
          .map((p) => messageRef(p.id)),
        receives: list(d.receives)
          .filter(pointsAtLatest)
          .map((p) => messageRef(p.id)),
        entities: list(d.entities).map((p) => pointerRef('entity', p)),
        flows: list(d.flows).map((p) => pointerRef('flow', p)),
        ubiquitousLanguage: dictionary.map((u: any) => ({ name: u.name || u.id, summary: u.summary })),
        specifications: specificationsByKey.get(key('domain', d.id)) || [],
      };
    })
  );

  // ---------- channels ----------
  const channelModels: ChannelModel[] = list(channels).map((c: Channel) => ({
    kind: 'channel',
    id: c.id,
    name: c.name || c.id,
    version: c.version,
    summary: c.summary?.trim(),
    markdown: c.markdown || '',
    anchor: anchorFor('channel', c.id),
    owners: ownersOf(c.owners),
    badges: badgesOf(c),
    properties: propertiesOf(c),
    deprecated: deprecatedText(c.deprecated),
    draft: Boolean(c.draft),
    address: c.address,
    protocols: list(c.protocols),
    deliveryGuarantee: c.deliveryGuarantee,
    parameters: Object.entries(c.parameters || {}).map(([name, p]) => ({
      name,
      description: p.description,
      enum: p.enum,
      default: p.default,
    })),
    messages: [...(messagesOnChannel.get(c.id) || [])].filter((id) => messageKind.has(id)).map(messageRef),
    routesTo: list(c.routes).map(channelRef),
    routedFrom: list(channels)
      .filter((from) => list(from.routes).some((r) => r.id === c.id && pointsAtLatestChannel(r)))
      .map((from) => channelRef({ id: from.id })),
  }));

  // ---------- flows ----------
  const flowModels: FlowModel[] = list(flows).map((f: Flow) => {
    const titleOf = new Map<string, string>();
    const stepRef = (
      step: Flow['steps'][number] & {
        channel?: { id: string };
        container?: { id: string };
        system?: { id: string };
        systems?: { id: string };
      }
    ): Ref | undefined => {
      if (step.message) return pointerRef(messageKindOf(step.message.id), step.message);
      if (step.service) return serviceRef(step.service);
      if (step.agent) return pointerRef('agent', step.agent);
      if (step.flow) return pointerRef('flow', step.flow);
      if (step.channel) return pointerRef('channel', step.channel);
      if (step.container) return pointerRef('container', step.container);
      const system = step.systems || step.system;
      if (system) return pointerRef('system', system);
      return undefined;
    };
    list(f.steps).forEach((s) => titleOf.set(String(s.id), s.title || stepRef(s)?.name || s.actor?.name || String(s.id)));
    const nextOf = (n: unknown) => {
      if (n === undefined || n === null) return undefined;
      if (typeof n === 'object')
        return { title: titleOf.get(String((n as any).id)) || String((n as any).id), label: (n as any).label };
      return { title: titleOf.get(String(n)) || String(n) };
    };
    return {
      kind: 'flow',
      id: f.id,
      name: f.name || f.id,
      version: f.version,
      summary: f.summary?.trim(),
      markdown: f.markdown || '',
      anchor: anchorFor('flow', f.id),
      owners: ownersOf(f.owners),
      badges: badgesOf(f),
      properties: propertiesOf(f),
      deprecated: deprecatedText(f.deprecated),
      draft: Boolean(f.draft),
      steps: list(f.steps).map((s) => ({
        title: titleOf.get(String(s.id)) || String(s.id),
        summary: (s.summary || s.actor?.summary || s.externalSystem?.summary)?.trim(),
        ref: stepRef(s),
        actor: s.actor?.name || s.externalSystem?.name || s.custom?.title,
        next: [s.next_step, ...list(s.next_steps)].map(nextOf).filter((x): x is { title: string; label?: string } => Boolean(x)),
      })),
    };
  });

  // ---------- data stores ----------
  const systemOfStore = new Map<string, Ref>();
  list(systems).forEach((x) =>
    list(x.containers)
      .filter((p) => pointsAt('container', p))
      .forEach((p) => !systemOfStore.has(p.id) && systemOfStore.set(p.id, ref('system', x.id)))
  );
  const writers = new Map<string, Ref[]>();
  const readers = new Map<string, Ref[]>();
  serviceModels.forEach((s) => {
    s.writesTo.filter((c) => c.anchor).forEach((c) => push(writers, c.id, ref(s.kind, s.id)));
    s.readsFrom.filter((c) => c.anchor).forEach((c) => push(readers, c.id, ref(s.kind, s.id)));
  });
  const dataStoreModels: DataStoreModel[] = list(containers).map((c: Container) => ({
    kind: 'container',
    id: c.id,
    name: c.name || c.id,
    version: c.version,
    summary: c.summary?.trim(),
    markdown: c.markdown || '',
    anchor: anchorFor('container', c.id),
    owners: ownersOf(c.owners),
    badges: badgesOf(c),
    properties: propertiesOf(c),
    deprecated: deprecatedText(c.deprecated),
    draft: Boolean(c.draft),
    containerType: c.container_type,
    technology: c.technology,
    authoritative: c.authoritative,
    accessMode: c.access_mode,
    classification: c.classification,
    residency: c.residency,
    retention: c.retention,
    purpose: (c as Container & { purpose?: string }).purpose,
    system: systemOfStore.get(c.id),
    writers: writers.get(c.id) || [],
    readers: readers.get(c.id) || [],
  }));

  // ---------- entities ----------
  const entityModels: EntityModel[] = list(entities).map((e: Entity) => ({
    kind: 'entity',
    id: e.id,
    name: e.name || e.id,
    version: e.version,
    summary: e.summary?.trim(),
    markdown: e.markdown || '',
    anchor: anchorFor('entity', e.id),
    owners: ownersOf(e.owners),
    badges: badgesOf(e),
    properties: propertiesOf(e),
    deprecated: deprecatedText(e.deprecated),
    draft: Boolean(e.draft),
    aggregateRoot: Boolean(e.aggregateRoot),
    domain: domainOfEntity.get(e.id),
    attributes: entityAttributes(e.properties),
  }));

  // ---------- systems ----------
  const systemModels: SystemModel[] = list(systems).map((x: System) => ({
    kind: 'system',
    id: x.id,
    name: x.name || x.id,
    version: x.version,
    summary: x.summary?.trim(),
    markdown: x.markdown || '',
    anchor: anchorFor('system', x.id),
    owners: ownersOf(x.owners),
    badges: badgesOf(x),
    properties: propertiesOf(x),
    deprecated: deprecatedText(x.deprecated),
    draft: Boolean(x.draft),
    scope: x.scope,
    domain: domainOfSystem.get(x.id),
    services: list(x.services).map(serviceRef),
    flows: list(x.flows).map((p) => pointerRef('flow', p)),
    entities: list(x.entities).map((p) => pointerRef('entity', p)),
    dataStores: list(x.containers).map(storeRef),
    relationships: list(x.relationships).map((r) => ({ ref: pointerRef('system', r), label: r.label })),
    actors: list(x.actors).map((a) => ({ name: a.name || a.id, label: a.label, direction: a.direction })),
  }));

  // ---------- teams and users ----------
  const owned = new Map<string, Ref[]>();
  const allOwned: { owners: Owner[]; ref: Ref }[] = [
    ...domainModels.map((d) => ({ owners: d.owners, ref: ref('domain', d.id) })),
    ...systemModels.map((x) => ({ owners: x.owners, ref: ref('system', x.id) })),
    ...serviceModels.map((s) => ({ owners: s.owners, ref: ref(s.kind, s.id) })),
    ...messages.map((m) => ({ owners: m.owners, ref: ref(m.kind, m.id) })),
    ...channelModels.map((c) => ({ owners: c.owners, ref: ref('channel', c.id) })),
    ...flowModels.map((f) => ({ owners: f.owners, ref: ref('flow', f.id) })),
    ...entityModels.map((e) => ({ owners: e.owners, ref: ref('entity', e.id) })),
    ...dataStoreModels.map((c) => ({ owners: c.owners, ref: ref('container', c.id) })),
  ];
  allOwned.forEach(({ owners, ref: r }) => owners.forEach((o) => push(owned, key(o.kind, o.id), r)));

  const memberIds = (t: Team) => list(t.members as (string | User)[]).map((m) => (typeof m === 'string' ? m : m.id));
  const teamsOfUser = new Map<string, Ref[]>();
  list(teams).forEach((t) => memberIds(t).forEach((u) => push(teamsOfUser, u, ref('team', t.id))));

  const teamModels: TeamModel[] = list(teams)
    .filter((t) => !t.hidden)
    .map((t: Team) => ({
      kind: 'team',
      id: t.id,
      name: t.name || t.id,
      anchor: anchorFor('team', t.id),
      summary: t.summary?.trim(),
      email: t.email,
      slack: t.slackDirectMessageUrl,
      members: memberIds(t).map((id) => ref('user', id)),
      teams: [],
      owns: owned.get(key('team', t.id)) || [],
    }));
  const userModels: TeamModel[] = list(users)
    .filter((u) => !u.hidden)
    .map((u: User) => ({
      kind: 'user',
      id: u.id,
      name: u.name || u.id,
      anchor: anchorFor('user', u.id),
      role: u.role,
      email: u.email,
      slack: u.slackDirectMessageUrl,
      members: [],
      teams: teamsOfUser.get(u.id) || [],
      owns: owned.get(key('user', u.id)) || [],
    }));

  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

  return {
    title: config?.title || config?.organizationName || 'EventCatalog',
    organization: config?.organizationName,
    tagline: config?.tagline,
    homepage: config?.homepageLink,
    logo: (() => {
      const src = logoFromConfig(dir, config?.logo);
      return src ? { src, alt: config?.logo?.alt || config?.logo?.text || config?.title || 'Logo' } : undefined;
    })(),
    generatedAt: new Date(),
    domains: domainModels.sort(byName),
    systems: systemModels.sort(byName),
    services: serviceModels.sort(byName),
    messages: messages.sort(byName),
    channels: channelModels.sort(byName),
    flows: flowModels.sort(byName),
    entities: entityModels.sort(byName),
    dataStores: dataStoreModels.sort(byName),
    teams: teamModels.sort(byName),
    users: userModels.sort(byName),
  };
};
