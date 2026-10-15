import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import createSDK from '@eventcatalog/sdk';
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

type SDK = ReturnType<typeof createSDK>;

const MESSAGE_TYPES: MessageType[] = ['event', 'command', 'query'];
const EXAMPLE_EXTENSIONS = /\.(json|ya?ml|xml|txt|avro|proto)$/i;

export const anchorFor = (kind: SectionKind, id: string) => `${kind}-${id.replace(/[^A-Za-z0-9_-]+/g, '-')}`;

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
    sdk.getDomains(latest),
    sdk.getSystems(latest).catch(() => [] as System[]),
    sdk.getServices(latest),
    sdk.getAgents(latest).catch(() => [] as Agent[]),
    sdk.getEvents(latest),
    sdk.getCommands(latest),
    sdk.getQueries(latest),
    sdk.getChannels(latest),
    sdk.getDataStores(latest).catch(() => [] as Container[]),
    sdk.getFlows(latest),
    sdk.getEntities(latest),
    sdk.getTeams(),
    sdk.getUsers(),
  ]);

  const list = <T>(items: T[] | undefined): T[] => items || [];

  // ---------- references ----------
  const refs = new Map<string, Ref>();
  const key = (kind: SectionKind, id: string) => `${kind}:${id}`;
  const register = (kind: SectionKind, id: string, name: string) =>
    refs.set(key(kind, id), { kind, id, name, anchor: anchorFor(kind, id) });

  list(domains).forEach((d) => register('domain', d.id, d.name || d.id));
  list(systems).forEach((x) => register('system', x.id, x.name || x.id));
  list(services).forEach((s) => register('service', s.id, s.name || s.id));
  list(agents).forEach((a) => register('agent', a.id, a.name || a.id));
  list(events).forEach((m) => register('event', m.id, m.name || m.id));
  list(commands).forEach((m) => register('command', m.id, m.name || m.id));
  list(queries).forEach((m) => register('query', m.id, m.name || m.id));
  list(channels).forEach((c) => register('channel', c.id, c.name || c.id));
  list(flows).forEach((f) => register('flow', f.id, f.name || f.id));
  list(entities).forEach((e) => register('entity', e.id, e.name || e.id));
  list(containers).forEach((c) => register('container', c.id, c.name || c.id));
  list(teams).forEach((t) => register('team', t.id, t.name || t.id));
  list(users).forEach((u) => register('user', u.id, u.name || u.id));

  const ref = (kind: SectionKind, id: string): Ref => refs.get(key(kind, id)) || { kind, id, name: id };
  const messageKind = new Map<string, MessageType>();
  list(events).forEach((m) => messageKind.set(m.id, 'event'));
  list(commands).forEach((m) => messageKind.set(m.id, 'command'));
  list(queries).forEach((m) => messageKind.set(m.id, 'query'));
  const messageRef = (id: string) => ref(messageKind.get(id) || 'event', id) as Ref & { kind: MessageType };
  const channelById = new Map(list(channels).map((c) => [c.id, c]));
  const channelRef = (p: ChannelPointer): ChannelRef => ({
    ...ref('channel', p.id),
    kind: 'channel',
    address: channelById.get(p.id)?.address,
  });
  const ownersOf = (ids: string[] = []): Owner[] =>
    ids.map(
      (id) =>
        (refs.has(key('team', id))
          ? ref('team', id)
          : refs.has(key('user', id))
            ? ref('user', id)
            : { kind: 'team', id, name: id }) as Owner
    );

  // ---------- domain membership ----------
  const systemById = new Map(list(systems).map((s: System) => [s.id, s]));
  const domainOfService = new Map<string, Ref>();
  const domainOfEntity = new Map<string, Ref>();
  const parentOfDomain = new Map<string, Ref>();
  const domainOfSystem = new Map<string, Ref>();
  const systemOfService = new Map<string, Ref>();
  list(systems).forEach((x) =>
    list(x.services).forEach((p) => !systemOfService.has(p.id) && systemOfService.set(p.id, ref('system', x.id)))
  );
  for (const d of list(domains)) {
    const dRef = ref('domain', d.id);
    list(d.systems).forEach((p) => !domainOfSystem.has(p.id) && domainOfSystem.set(p.id, dRef));
    const serviceIds = [
      ...list(d.services).map((p) => p.id),
      ...list(d.agents).map((p) => p.id),
      ...list(d.systems).flatMap((p) => list(systemById.get(p.id)?.services).map((s) => s.id)),
    ];
    serviceIds.forEach((id) => !domainOfService.has(id) && domainOfService.set(id, dRef));
    list(d.entities).forEach((p) => !domainOfEntity.has(p.id) && domainOfEntity.set(p.id, dRef));
    list(d.domains).forEach((p) => parentOfDomain.set(p.id, dRef));
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
    const chans = channelsOfMessage.get(messageId) || new Map();
    chans.set(p.id, channelRef(p));
    channelsOfMessage.set(messageId, chans);
    const msgs = messagesOnChannel.get(p.id) || new Set();
    msgs.add(messageId);
    messagesOnChannel.set(p.id, msgs);
  };
  for (const a of actors) {
    list(a.sends).forEach((p) => {
      push(producers, p.id, a.ref);
      list(p.to).forEach((c) => linkChannel(p.id, c));
    });
    list(a.receives).forEach((p) => {
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
    const link = (p: { id: string }, channelPointers?: ChannelPointer[]) => ({
      message: messageRef(p.id),
      channels: list(channelPointers).map(channelRef),
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
      deprecated: deprecatedText(s.deprecated),
      draft: Boolean(s.draft),
      domain: domainOfService.get(s.id),
      system: systemOfService.get(s.id),
      sends,
      receives,
      upstream: uniqueRefs(list(s.receives).flatMap((p) => producers.get(p.id) || [])).filter((r) => key(r.kind, r.id) !== self),
      downstream: uniqueRefs(list(s.sends).flatMap((p) => consumers.get(p.id) || [])).filter((r) => key(r.kind, r.id) !== self),
      writesTo: list(s.writesTo).map((p) => ref('container', p.id)),
      readsFrom: list(s.readsFrom).map((p) => ref('container', p.id)),
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
        deprecated: deprecatedText(d.deprecated),
        draft: Boolean(d.draft),
        parent: parentOfDomain.get(d.id),
        subdomains: list(d.domains).map((p) => ref('domain', p.id)),
        systems: list(d.systems).map((p) => ref('system', p.id)),
        services: serviceModels.filter((s) => domainOfService.get(s.id)?.id === d.id).map((s) => ref(s.kind, s.id)),
        sends: list(d.sends).map((p) => messageRef(p.id)),
        receives: list(d.receives).map((p) => messageRef(p.id)),
        entities: list(d.entities).map((p) => ref('entity', p.id)),
        flows: list(d.flows).map((p) => ref('flow', p.id)),
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
      if (step.message) return messageRef(step.message.id);
      if (step.service) return ref('service', step.service.id);
      if (step.agent) return ref('agent', step.agent.id);
      if (step.flow) return ref('flow', step.flow.id);
      if (step.channel) return ref('channel', step.channel.id);
      if (step.container) return ref('container', step.container.id);
      const system = step.systems || step.system;
      if (system) return ref('system', system.id);
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
    list(x.containers).forEach((p) => !systemOfStore.has(p.id) && systemOfStore.set(p.id, ref('system', x.id)))
  );
  const writers = new Map<string, Ref[]>();
  const readers = new Map<string, Ref[]>();
  serviceModels.forEach((s) => {
    s.writesTo.forEach((c) => push(writers, c.id, ref(s.kind, s.id)));
    s.readsFrom.forEach((c) => push(readers, c.id, ref(s.kind, s.id)));
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
    deprecated: deprecatedText(x.deprecated),
    draft: Boolean(x.draft),
    scope: x.scope,
    domain: domainOfSystem.get(x.id),
    services: list(x.services).map((p) =>
      refs.has(key('agent', p.id)) && !refs.has(key('service', p.id)) ? ref('agent', p.id) : ref('service', p.id)
    ),
    flows: list(x.flows).map((p) => ref('flow', p.id)),
    entities: list(x.entities).map((p) => ref('entity', p.id)),
    dataStores: list(x.containers).map((p) => ref('container', p.id)),
    relationships: list(x.relationships).map((r) => ({ ref: ref('system', r.id), label: r.label })),
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
