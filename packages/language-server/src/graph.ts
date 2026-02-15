import semver from "semver";
import type { AstNode } from "langium";
import type {
  Program,
  DomainDef,
  ServiceDef,
  EventDef,
  CommandDef,
  QueryDef,
  ChannelDef,
  ContainerDef,
  DataProductDef,
  FlowDef,
  DiagramDef,
  UserDef,
  TeamDef,
  SubdomainDef,
  SendsStmt,
  ReceivesStmt,
  ResourceDefinition,
  VisualizerDef,
  VisualizerBodyItem,
  FlowRef,
} from "./generated/ast.js";
import {
  isDomainDef,
  isServiceDef,
  isEventDef,
  isCommandDef,
  isQueryDef,
  isChannelDef,
  isContainerDef,
  isDataProductDef,
  isFlowDef,
  isDiagramDef,
  isUserDef,
  isTeamDef,
  isVisualizerDef,
  isToClause,
  isFromClause,
  isServiceRefStmt,
  isDomainRefStmt,
  isChannelRefStmt,
  isDataProductRefStmt,
  isFlowRefStmt,
  isContainerRefStmt,
  isActorDef,
  isExternalSystemDef,
  isPositionalAnnotationArg,
  isNamedAnnotationArg,
  isStringAnnotationValue,
  isIdAnnotationValue,
} from "./generated/ast.js";
import {
  stripQuotes,
  getVersion,
  getName,
  getSummary,
  getOwners,
  getServices,
  getSubdomains,
  getContainers,
  getServiceRefs,
  getFlowRefs,
  getDataProductRefs,
  getSends,
  getReceives,
  getWritesToRefs,
  getReadsFromRefs,
  getChannelRefs,
  getAddress,
  getProtocols,
  getContainerType,
  getInputs,
  getOutputs,
  getAnnotations,
  getToClause,
  getFromClause,
  getLegend,
  getSearch,
  getToolbar,
  getFocusMode,
  getAnimated,
  getStyle,
  getDeprecated,
  getDraft,
  getSchema,
  getRoutes,
  getFlowEntryChains,
  getFlowWhenBlocks,
} from "./ast-utils.js";
import type { GraphNode, GraphEdge, DslGraph } from "./graph-types.js";

function extractNotes(
  body: AstNode[],
): Array<{ content: string; author?: string; priority?: string }> {
  const annotations = getAnnotations(body);
  const notes: Array<{ content: string; author?: string; priority?: string }> =
    [];
  for (const ann of annotations) {
    if (ann.name !== "note") continue;
    const note: { content: string; author?: string; priority?: string } = {
      content: "",
    };
    const contentArg = ann.args.find((a) => isPositionalAnnotationArg(a));
    if (contentArg) {
      const v = isPositionalAnnotationArg(contentArg)
        ? contentArg.value
        : undefined;
      if (v && isStringAnnotationValue(v)) note.content = stripQuotes(v.value);
      else if (v && isIdAnnotationValue(v)) note.content = v.value;
    }
    for (const arg of ann.args) {
      if (isNamedAnnotationArg(arg)) {
        const val = isStringAnnotationValue(arg.value)
          ? stripQuotes(arg.value.value)
          : isIdAnnotationValue(arg.value)
            ? arg.value.value
            : undefined;
        if (val && arg.key === "author") note.author = val;
        if (val && arg.key === "priority") note.priority = val;
      }
    }
    if (note.content) notes.push(note);
  }
  return notes;
}

export function astToGraph(
  program: Program,
  visualizerName?: string,
): DslGraph {
  // Find all visualizer definitions
  const visualizerDefs = program.definitions.filter(isVisualizerDef);
  const visualizerNames = visualizerDefs.map((v) => v.name);

  // If no visualizers exist, return empty graph
  if (visualizerDefs.length === 0) {
    return { nodes: [], edges: [], visualizers: [], empty: true };
  }

  // Select the active visualizer
  const activeViz = visualizerName
    ? visualizerDefs.find((v) => v.name === visualizerName) || visualizerDefs[0]
    : visualizerDefs[0];

  // Extract title and display options from visualizer body
  const vizBody = activeViz.body as AstNode[];
  const vizTitle = getName(vizBody) || activeViz.name;
  const options = {
    legend: getLegend(vizBody),
    search: getSearch(vizBody),
    toolbar: getToolbar(vizBody),
    focusMode: getFocusMode(vizBody),
    animated: getAnimated(vizBody),
    style: getStyle(vizBody),
  };

  // Build a lookup map of all definitions (including nested ones) for resolving refs
  // Key format: "name" for unversioned, "name@version" for versioned
  const topLevelDefs = new Map<string, ResourceDefinition>();

  function defKey(name: string, version?: string): string {
    return version ? `${name}@${version}` : name;
  }

  function addToDefMap(def: ResourceDefinition): void {
    if ("name" in def) {
      const body = ("body" in def ? def.body : []) as AstNode[];
      const version = getVersion(body);
      // Store under name@version for exact lookups
      if (version) {
        topLevelDefs.set(defKey(def.name, version), def);
      }
      // Store under bare name only if it's the latest version seen so far
      const existing = topLevelDefs.get(def.name);
      if (!existing) {
        topLevelDefs.set(def.name, def);
      } else if (version) {
        const existingBody = (
          "body" in existing ? existing.body : []
        ) as AstNode[];
        const existingVersion = getVersion(existingBody);
        if (
          !existingVersion ||
          (semver.valid(version) &&
            semver.valid(existingVersion) &&
            semver.compare(version, existingVersion) > 0)
        ) {
          topLevelDefs.set(def.name, def);
        }
      }
    }

    // Also add nested definitions (services, containers, etc. inside domains)
    if (isDomainDef(def) && def.body) {
      const body = def.body as AstNode[];
      for (const svc of getServices(body)) {
        addToDefMap(svc);
      }
      for (const container of getContainers(body)) {
        addToDefMap(container);
      }
      for (const ch of body.filter(isChannelDef)) {
        addToDefMap(ch as ResourceDefinition);
      }
      // Subdomains are handled separately (they have their own services/containers)
      for (const subdomain of getSubdomains(body)) {
        const subBody = subdomain.body as AstNode[];
        for (const svc of getServices(subBody)) {
          addToDefMap(svc);
        }
        for (const container of getContainers(subBody)) {
          addToDefMap(container);
        }
        for (const ch of subBody.filter(isChannelDef)) {
          addToDefMap(ch as ResourceDefinition);
        }
      }
    }
  }

  for (const def of program.definitions) {
    if (!isVisualizerDef(def)) {
      addToDefMap(def);
    }
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Build a versioned node ID: type:name@version or type:name (unversioned)
  function nid(name: string, type: string, version?: string): string {
    if (version) return `${type}:${name}@${version}`;
    return `${type}:${name}`;
  }

  // Infer the graph node type for a flow ref by looking up definitions.
  // Uses topLevelDefs which includes nested defs (services/events inside domains).
  function inferTypeFromCatalog(name: string): GraphNode["type"] {
    const def = topLevelDefs.get(name);
    if (def) {
      if (isServiceDef(def)) return "service";
      if (isEventDef(def)) return "event";
      if (isCommandDef(def)) return "command";
      if (isQueryDef(def)) return "query";
      if (isChannelDef(def)) return "channel";
      if (isContainerDef(def)) return "container";
      if (isDataProductDef(def)) return "data-product";
      if (isFlowDef(def)) return "flow";
      if (isActorDef(def)) return "actor";
      if (isExternalSystemDef(def)) return "external-system";
    }
    // Also check if it already exists as a node (from earlier processing)
    for (const n of nodes) {
      if (n.id.startsWith(`${name}`) || n.id.includes(`:${name}`)) {
        return n.type;
      }
    }
    // Default: treat as step (unresolved flow refs are process steps)
    return "step";
  }

  // Find the best matching node for a type+name, optionally with a specific version.
  // If version is given, look for that exact versioned node first.
  // If no version, resolve to the latest version per the DSL spec.
  function resolveNodeId(
    name: string,
    type: string,
    version?: string,
  ): string | undefined {
    if (version) {
      // When a specific version is requested, only return an exact match
      const exact = nodes.find((n) => n.id === nid(name, type, version));
      return exact?.id;
    }
    // No version: per spec, bare refs resolve to the latest version.
    // Collect all matching nodes and pick the one with the highest semver.
    const prefix = `${type}:${name}`;
    const candidates = nodes.filter(
      (n) => n.id === prefix || n.id.startsWith(prefix + "@"),
    );
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0].id;

    // Pick the candidate with the highest semver version
    let latest = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const cv = (candidates[i].metadata.version as string) || "";
      const lv = (latest.metadata.version as string) || "";
      if (
        semver.valid(cv) &&
        (!semver.valid(lv) || semver.compare(cv, lv) > 0)
      ) {
        latest = candidates[i];
      }
    }
    return latest.id;
  }

  function addNode(
    name: string,
    type: GraphNode["type"],
    label: string,
    parentId?: string,
    metadata: Record<string, unknown> = {},
  ): string {
    const version = metadata.version as string | undefined;
    const id = nid(name, type, version);
    const existing = nodes.find((n) => n.id === id);
    if (existing) {
      if (parentId && !existing.parentId) {
        existing.parentId = parentId;
      }
      // Merge metadata: fill in values the existing node is missing
      for (const [key, value] of Object.entries(metadata)) {
        if (value != null && existing.metadata[key] == null) {
          existing.metadata[key] = value;
        }
      }
      if (label !== name && existing.label === name) {
        existing.label = label;
      }
      return id;
    }

    // For unversioned references, check if a versioned node already exists
    if (!version) {
      const resolved = resolveNodeId(name, type);
      if (resolved) {
        const existingNode = nodes.find((n) => n.id === resolved)!;
        if (parentId && !existingNode.parentId) {
          existingNode.parentId = parentId;
        }
        return resolved;
      }
    }

    // For versioned definitions, check if an unversioned stub already exists and upgrade it
    if (version) {
      const unversionedId = nid(name, type);
      const stub = nodes.find((n) => n.id === unversionedId);
      if (stub) {
        // Upgrade: change the stub's ID to include the version
        const oldId = stub.id;
        stub.id = id;
        stub.metadata.version = version;
        for (const [key, value] of Object.entries(metadata)) {
          if (value != null && stub.metadata[key] == null) {
            stub.metadata[key] = value;
          }
        }
        if (label !== name && stub.label === name) {
          stub.label = label;
        }
        if (parentId && !stub.parentId) {
          stub.parentId = parentId;
        }
        // Update all edges that referenced the old unversioned ID
        for (const edge of edges) {
          if (edge.source === oldId) {
            edge.source = id;
            edge.id = `${edge.source}-${edge.type}-${edge.target}`;
          }
          if (edge.target === oldId) {
            edge.target = id;
            edge.id = `${edge.source}-${edge.type}-${edge.target}`;
          }
        }
        return id;
      }
    }

    nodes.push({ id, type, label, parentId, metadata });
    return id;
  }

  function addEdge(
    sourceId: string,
    targetId: string,
    type: GraphEdge["type"],
    label?: string,
  ): void {
    const id = `${sourceId}-${type}-${targetId}`;
    if (edges.some((e) => e.id === id)) return;
    edges.push({ id, source: sourceId, target: targetId, type, label });
  }

  // Enrich a node with metadata from matching top-level definitions (e.g. channel defined outside visualizer)
  function enrichFromTopLevel(
    nodeId: string,
    name: string,
    type: GraphNode["type"],
  ): void {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Find all top-level defs with this name (there can be multiple versions)
    const matchingDefs = program.definitions.filter(
      (d) => !isVisualizerDef(d) && "name" in d && d.name === name,
    );

    for (const def of matchingDefs) {
      const body = ("body" in def ? def.body : []) as AstNode[];
      const defVersion = getVersion(body);

      // If the node has a version, only enrich from the matching version def
      if (
        node.metadata.version &&
        defVersion &&
        node.metadata.version !== defVersion
      ) {
        continue;
      }

      const enrichOwners = getOwners(body);
      const enrichNotes = extractNotes(body);
      const meta: Record<string, unknown> = {
        version: defVersion,
        summary: getSummary(body),
        deprecated: getDeprecated(body),
        draft: getDraft(body),
        schema: getSchema(body),
        ...(enrichOwners.length > 0 ? { owners: enrichOwners } : {}),
        ...(enrichNotes.length > 0 ? { notes: enrichNotes } : {}),
      };
      if (isChannelDef(def)) {
        meta.address = getAddress(body);
        meta.protocols = getProtocols(body);
      }
      for (const [key, value] of Object.entries(meta)) {
        if (value != null && node.metadata[key] == null) {
          node.metadata[key] = value;
        }
      }
      const label = getName(body);
      if (label && node.label === name) {
        node.label = label;
      }

      // Process route statements for channels discovered via sends/receives
      if (isChannelDef(def)) {
        for (const route of getRoutes(body)) {
          const targetChId = resolveOrCreateMsg(
            route.ref.name,
            "channel",
            route.ref.version,
          );
          addEdge(nodeId, targetChId, "routes-to");
        }
      }
    }
  }

  // For sends/receives references: resolve to versioned node if it exists, otherwise create
  function resolveOrCreateMsg(
    name: string,
    type: GraphNode["type"],
    version?: string,
    parentId?: string,
  ): string {
    // If a specific version is requested, try to find that exact node
    if (version) {
      const existingId = resolveNodeId(name, type, version);
      if (existingId) {
        const node = nodes.find((n) => n.id === existingId)!;
        if (parentId && !node.parentId) node.parentId = parentId;
        enrichFromTopLevel(existingId, name, type);
        return existingId;
      }
      const id = addNode(name, type, name, parentId, { version });
      enrichFromTopLevel(id, name, type);
      return id;
    }

    // No version: try to find any existing node for this type+name
    const existingId = resolveNodeId(name, type);
    if (existingId) {
      const node = nodes.find((n) => n.id === existingId)!;
      if (parentId && !node.parentId) node.parentId = parentId;
      enrichFromTopLevel(existingId, name, type);
      return existingId;
    }
    const id = addNode(name, type, name, parentId, {});
    enrichFromTopLevel(id, name, type);
    return id;
  }

  function processSends(
    serviceId: string,
    sendsList: SendsStmt[],
    domainId?: string,
  ): void {
    for (const s of sendsList) {
      const msgType = s.messageType as GraphNode["type"];

      // Determine version: from inline body, or from the statement itself
      let version = s.version;
      if (!version && s.body.length > 0) {
        version = getVersion(s.body as AstNode[]);
      }

      const msgNodeId = resolveOrCreateMsg(
        s.messageName,
        msgType,
        version,
        domainId,
      );
      if (domainId) {
        addEdge(domainId, msgNodeId, "contains");
      }
      addEdge(serviceId, msgNodeId, "sends");

      // Inline body summary + schema + notes
      if (s.body.length > 0) {
        const existing = nodes.find((n) => n.id === msgNodeId);
        if (existing) {
          const summary = getSummary(s.body as AstNode[]);
          if (summary && !existing.metadata.summary)
            existing.metadata.summary = summary;
          const schema = getSchema(s.body as AstNode[]);
          if (schema && !existing.metadata.schema)
            existing.metadata.schema = schema;
          const inlineNotes = extractNotes(s.body as AstNode[]);
          if (inlineNotes.length > 0 && !existing.metadata.notes)
            existing.metadata.notes = inlineNotes;
        }
      }

      // Channel clause (on the sends statement itself)
      if (s.channelClause) {
        const clause = s.channelClause;
        if (isToClause(clause) || isFromClause(clause)) {
          for (const ch of clause.channels) {
            const chId = resolveOrCreateMsg(
              ch.channelName,
              "channel",
              ch.channelVersion,
              domainId,
            );
            if (domainId) addEdge(domainId, chId, "contains");
            addEdge(msgNodeId, chId, "routes-to");
          }
        }
      }

      // Channel clauses inside body
      const bodyTo = getToClause(s.body as AstNode[]);
      if (bodyTo) {
        for (const ch of bodyTo.channels) {
          const chId = resolveOrCreateMsg(
            ch.channelName,
            "channel",
            ch.channelVersion,
            domainId,
          );
          if (domainId) addEdge(domainId, chId, "contains");
          addEdge(msgNodeId, chId, "routes-to");
        }
      }
      const bodyFrom = getFromClause(s.body as AstNode[]);
      if (bodyFrom) {
        for (const ch of bodyFrom.channels) {
          const chId = resolveOrCreateMsg(
            ch.channelName,
            "channel",
            ch.channelVersion,
            domainId,
          );
          if (domainId) addEdge(domainId, chId, "contains");
          addEdge(msgNodeId, chId, "routes-to");
        }
      }
    }
  }

  function processReceives(
    serviceId: string,
    receivesList: ReceivesStmt[],
    domainId?: string,
  ): void {
    for (const r of receivesList) {
      const msgType = r.messageType as GraphNode["type"];

      let version = r.version;
      if (!version && r.body.length > 0) {
        version = getVersion(r.body as AstNode[]);
      }

      const msgNodeId = resolveOrCreateMsg(
        r.messageName,
        msgType,
        version,
        domainId,
      );
      if (domainId) {
        addEdge(domainId, msgNodeId, "contains");
      }
      addEdge(msgNodeId, serviceId, "receives");

      if (r.body.length > 0) {
        const existing = nodes.find((n) => n.id === msgNodeId);
        if (existing) {
          const summary = getSummary(r.body as AstNode[]);
          if (summary && !existing.metadata.summary)
            existing.metadata.summary = summary;
          const schema = getSchema(r.body as AstNode[]);
          if (schema && !existing.metadata.schema)
            existing.metadata.schema = schema;
          const inlineNotes = extractNotes(r.body as AstNode[]);
          if (inlineNotes.length > 0 && !existing.metadata.notes)
            existing.metadata.notes = inlineNotes;
        }
      }

      // Channel clause: "from ChannelX" means the service receives via that channel.
      // Only create Channel → Service edge. The Message → Channel edge is handled
      // by the sends side or by channel route statements.
      const channelRefs: { name: string; version?: string }[] = [];

      if (r.channelClause) {
        const clause = r.channelClause;
        if (isToClause(clause) || isFromClause(clause)) {
          for (const ch of clause.channels) {
            channelRefs.push({
              name: ch.channelName,
              version: ch.channelVersion,
            });
          }
        }
      }

      const bodyTo = getToClause(r.body as AstNode[]);
      if (bodyTo) {
        for (const ch of bodyTo.channels) {
          channelRefs.push({
            name: ch.channelName,
            version: ch.channelVersion,
          });
        }
      }
      const bodyFrom = getFromClause(r.body as AstNode[]);
      if (bodyFrom) {
        for (const ch of bodyFrom.channels) {
          channelRefs.push({
            name: ch.channelName,
            version: ch.channelVersion,
          });
        }
      }

      if (channelRefs.length > 0) {
        // Remove the direct Message → Service edge since the channel mediates
        const directEdgeIdx = edges.findIndex(
          (e) =>
            e.source === msgNodeId &&
            e.target === serviceId &&
            e.type === "receives",
        );
        if (directEdgeIdx !== -1) edges.splice(directEdgeIdx, 1);

        for (const ch of channelRefs) {
          const chId = resolveOrCreateMsg(
            ch.name,
            "channel",
            ch.version,
            domainId,
          );
          if (domainId) addEdge(domainId, chId, "contains");
          // Only add Message → Channel edge if no route path already exists
          // from the message to this channel (via sends + channel routes).
          // Check if the message already has a routes-to edge to ANY channel;
          // if a route chain exists, the sends side + route statements handle connectivity.
          const msgHasChannelEdge = edges.some(
            (e) => e.source === msgNodeId && e.type === "routes-to",
          );
          if (!msgHasChannelEdge) {
            addEdge(msgNodeId, chId, "routes-to");
          }
          addEdge(chId, serviceId, "receives");
        }
      }
    }
  }

  function processService(svc: ServiceDef, parentId?: string): void {
    const body = svc.body as AstNode[];
    const svcName = getName(body) || svc.name;
    const notes = extractNotes(body);
    const svcOwners = getOwners(body);
    const svcId = addNode(svc.name, "service", svcName, parentId, {
      version: getVersion(body),
      summary: getSummary(body),
      deprecated: getDeprecated(body),
      draft: getDraft(body),
      ...(svcOwners.length > 0 ? { owners: svcOwners } : {}),
      ...(notes.length > 0 ? { notes } : {}),
    });

    if (parentId) {
      addEdge(parentId, svcId, "contains");
    }

    // Messages sent/received by a service inside a domain should be parented to the same domain
    processSends(svcId, getSends(body), parentId);
    processReceives(svcId, getReceives(body), parentId);

    for (const ref of getWritesToRefs(body)) {
      const containerId = resolveOrCreateMsg(
        ref.ref.name,
        "container",
        ref.ref.version,
      );
      addEdge(svcId, containerId, "writes-to");
    }

    for (const ref of getReadsFromRefs(body)) {
      const containerId = resolveOrCreateMsg(
        ref.ref.name,
        "container",
        ref.ref.version,
      );
      addEdge(containerId, svcId, "reads-from");
    }
  }

  function processSubdomain(sub: SubdomainDef, parentId: string): void {
    const body = sub.body as AstNode[];
    const subName = getName(body) || sub.name;
    const subOwners = getOwners(body);
    const subId = addNode(sub.name, "domain", subName, parentId, {
      version: getVersion(body),
      summary: getSummary(body),
      deprecated: getDeprecated(body),
      draft: getDraft(body),
      ...(subOwners.length > 0 ? { owners: subOwners } : {}),
    });
    addEdge(parentId, subId, "contains");

    for (const svc of getServices(body)) {
      processService(svc, subId);
    }
    for (const nested of getSubdomains(body)) {
      processSubdomain(nested, subId);
    }
  }

  function processDomain(domain: DomainDef): void {
    const body = domain.body as AstNode[];
    const domainName = getName(body) || domain.name;
    const domOwners = getOwners(body);
    const domId = addNode(domain.name, "domain", domainName, undefined, {
      version: getVersion(body),
      summary: getSummary(body),
      deprecated: getDeprecated(body),
      draft: getDraft(body),
      ...(domOwners.length > 0 ? { owners: domOwners } : {}),
    });

    for (const svc of getServices(body)) {
      processService(svc, domId);
    }

    for (const ref of getServiceRefs(body)) {
      const svcId = resolveOrCreateMsg(
        ref.ref.name,
        "service",
        ref.ref.version,
        domId,
      );
      addEdge(domId, svcId, "contains");
    }

    for (const container of getContainers(body)) {
      const containerBody = container.body as AstNode[];
      const containerId = addNode(
        container.name,
        "container",
        getName(containerBody) || container.name,
        domId,
        {
          version: getVersion(containerBody),
          summary: getSummary(containerBody),
          deprecated: getDeprecated(containerBody),
          draft: getDraft(containerBody),
          containerType: getContainerType(containerBody),
        },
      );
      addEdge(domId, containerId, "contains");
    }

    for (const item of body.filter(isChannelDef)) {
      const chBody = item.body as AstNode[];
      const chBodyNotes = extractNotes(chBody);
      const chId = addNode(
        item.name,
        "channel",
        getName(chBody) || item.name,
        domId,
        {
          version: getVersion(chBody),
          summary: getSummary(chBody),
          deprecated: getDeprecated(chBody),
          draft: getDraft(chBody),
          address: getAddress(chBody),
          protocols: getProtocols(chBody),
          ...(chBodyNotes.length > 0 ? { notes: chBodyNotes } : {}),
        },
      );
      addEdge(domId, chId, "contains");

      for (const route of getRoutes(chBody)) {
        const targetChId = resolveOrCreateMsg(
          route.ref.name,
          "channel",
          route.ref.version,
        );
        addEdge(chId, targetChId, "routes-to");
      }
    }

    for (const sub of getSubdomains(body)) {
      processSubdomain(sub, domId);
    }

    for (const ref of getFlowRefs(body)) {
      const flowId = resolveOrCreateMsg(
        ref.ref.name,
        "flow",
        ref.ref.version,
        domId,
      );
      addEdge(domId, flowId, "contains");
    }

    for (const ref of getDataProductRefs(body)) {
      const dpId = resolveOrCreateMsg(
        ref.ref.name,
        "data-product",
        ref.ref.version,
        domId,
      );
      addEdge(domId, dpId, "contains");
    }

    processSends(domId, getSends(body));
    processReceives(domId, getReceives(body));
  }

  function processMessage(def: EventDef | CommandDef | QueryDef): void {
    const nodeType: GraphNode["type"] = isEventDef(def)
      ? "event"
      : isCommandDef(def)
        ? "command"
        : "query";
    const body = def.body as AstNode[];
    const msgName = getName(body) || def.name;
    const notes = extractNotes(body);
    const msgOwners = getOwners(body);
    addNode(def.name, nodeType, msgName, undefined, {
      version: getVersion(body),
      summary: getSummary(body),
      deprecated: getDeprecated(body),
      draft: getDraft(body),
      schema: getSchema(body),
      ...(msgOwners.length > 0 ? { owners: msgOwners } : {}),
      ...(notes.length > 0 ? { notes } : {}),
    });

    for (const ref of getChannelRefs(body)) {
      resolveOrCreateMsg(ref.ref.name, "channel", ref.ref.version);
    }
  }

  function processDefinition(def: ResourceDefinition): void {
    if (isDomainDef(def)) {
      processDomain(def);
    } else if (isServiceDef(def)) {
      processService(def);
    } else if (isEventDef(def) || isCommandDef(def) || isQueryDef(def)) {
      processMessage(def);
    } else if (isChannelDef(def)) {
      const body = def.body as AstNode[];
      const chNotes = extractNotes(body);
      const chOwners = getOwners(body);
      const chId = addNode(
        def.name,
        "channel",
        getName(body) || def.name,
        undefined,
        {
          version: getVersion(body),
          summary: getSummary(body),
          deprecated: getDeprecated(body),
          draft: getDraft(body),
          address: getAddress(body),
          protocols: getProtocols(body),
          ...(chOwners.length > 0 ? { owners: chOwners } : {}),
          ...(chNotes.length > 0 ? { notes: chNotes } : {}),
        },
      );

      // Process route statements: channel → channel edges
      for (const route of getRoutes(body)) {
        const targetChId = resolveOrCreateMsg(
          route.ref.name,
          "channel",
          route.ref.version,
        );
        addEdge(chId, targetChId, "routes-to");
      }
    } else if (isContainerDef(def)) {
      const body = def.body as AstNode[];
      const contOwners = getOwners(body);
      addNode(def.name, "container", getName(body) || def.name, undefined, {
        version: getVersion(body),
        summary: getSummary(body),
        deprecated: getDeprecated(body),
        draft: getDraft(body),
        containerType: getContainerType(body),
        ...(contOwners.length > 0 ? { owners: contOwners } : {}),
      });
    } else if (isDataProductDef(def)) {
      const body = def.body as AstNode[];
      const dpOwners = getOwners(body);
      const dpId = addNode(
        def.name,
        "data-product",
        getName(body) || def.name,
        undefined,
        {
          version: getVersion(body),
          summary: getSummary(body),
          deprecated: getDeprecated(body),
          draft: getDraft(body),
          ...(dpOwners.length > 0 ? { owners: dpOwners } : {}),
        },
      );
      for (const inp of getInputs(body)) {
        const inpType = inp.type as GraphNode["type"];
        const existing =
          resolveNodeId(inp.ref.name, "event", inp.ref.version) ||
          resolveNodeId(inp.ref.name, "command", inp.ref.version) ||
          resolveNodeId(inp.ref.name, "query", inp.ref.version);
        const inpId =
          existing ||
          addNode(inp.ref.name, inpType, inp.ref.name, undefined, {
            version: inp.ref.version,
          });
        addEdge(inpId, dpId, "sends");
      }
      for (const out of getOutputs(body)) {
        const outType = out.type as GraphNode["type"];
        const existing =
          resolveNodeId(out.name, "event") ||
          resolveNodeId(out.name, "command") ||
          resolveNodeId(out.name, "query");
        const outId = existing || addNode(out.name, outType, out.name);
        addEdge(dpId, outId, "sends");
      }
    } else if (isFlowDef(def)) {
      const body = def.body as AstNode[];
      const entryChains = getFlowEntryChains(body);
      const whenBlocks = getFlowWhenBlocks(body);

      if (entryChains.length > 0 || whenBlocks.length > 0) {
        // Resolve a FlowRef to a graph node, inferring type from catalog
        function resolveFlowRef(ref: FlowRef): string {
          return resolveOrCreateMsg(ref.name, inferTypeFromCatalog(ref.name));
        }

        // Get the edge label from a FlowRef (the quoted string after the name)
        function flowRefLabel(ref: FlowRef): string | undefined {
          return ref.label ? stripQuotes(ref.label) : undefined;
        }

        // Process entry chains
        for (const chain of entryChains) {
          for (const ref of [...chain.sources, ...chain.targets]) {
            resolveFlowRef(ref);
          }
          const firstTarget = chain.targets[0];
          if (firstTarget) {
            const firstTargetId = resolveFlowRef(firstTarget);
            for (const src of chain.sources) {
              // Label on source ref becomes the edge label to first target
              addEdge(
                resolveFlowRef(src),
                firstTargetId,
                "flow-step",
                flowRefLabel(src),
              );
            }
          }
          for (let i = 0; i < chain.targets.length - 1; i++) {
            addEdge(
              resolveFlowRef(chain.targets[i]),
              resolveFlowRef(chain.targets[i + 1]),
              "flow-step",
              flowRefLabel(chain.targets[i]),
            );
          }
        }

        // Process when blocks
        for (const block of whenBlocks) {
          for (const trigger of block.triggers) {
            resolveFlowRef(trigger);
          }
          for (const action of block.actions) {
            const actionId = resolveFlowRef(action.ref);
            // Triggers connect to each action; action ref label goes on the edge
            for (const trigger of block.triggers) {
              addEdge(
                resolveFlowRef(trigger),
                actionId,
                "flow-step",
                flowRefLabel(action.ref),
              );
            }
            // Action outputs
            for (const output of action.outputs) {
              const targetId = resolveFlowRef(output.target);
              addEdge(
                actionId,
                targetId,
                "flow-step",
                output.label ? stripQuotes(output.label) : undefined,
              );
            }
          }
        }
      } else {
        // No flow body — just show as a single node
        addNode(def.name, "flow", getName(body) || def.name, undefined, {
          version: getVersion(body),
          summary: getSummary(body),
          deprecated: getDeprecated(body),
          draft: getDraft(body),
        });
      }
    } else if (isDiagramDef(def)) {
      const body = def.body as AstNode[];
      addNode(def.name, "diagram", getName(body) || def.name, undefined, {
        version: getVersion(body),
        summary: getSummary(body),
        deprecated: getDeprecated(body),
        draft: getDraft(body),
      });
    } else if (isUserDef(def)) {
      const props = def.props as AstNode[];
      const userName = getName(props) || def.name;
      let role: string | undefined;
      let email: string | undefined;
      let team: string | undefined;
      const owns: { resourceType: string; id: string }[] = [];

      for (const p of def.props) {
        if ("value" in p && p.$type === "UserRoleProp")
          role = stripQuotes(p.value);
        if ("value" in p && p.$type === "UserEmailProp")
          email = stripQuotes(p.value);
        if (p.$type === "UserTeamProp") team = p.teamRef;
        if (p.$type === "UserOwnsProp") {
          owns.push({
            resourceType: p.owns.resourceType,
            id: p.owns.resourceName,
          });
        }
      }

      const userId = addNode(def.name, "user", userName, undefined, {
        role,
        email,
      });
      for (const o of owns) {
        const targetId =
          resolveNodeId(o.id, o.resourceType) || nid(o.id, o.resourceType);
        addEdge(userId, targetId, "owns");
      }
      if (team) {
        const teamId = resolveNodeId(team, "team") || nid(team, "team");
        addEdge(userId, teamId, "member-of");
      }
    } else if (isTeamDef(def)) {
      const props = def.props as AstNode[];
      const teamName = getName(props) || def.name;
      let summary: string | undefined;
      let email: string | undefined;
      const members: string[] = [];
      const owns: { resourceType: string; id: string }[] = [];

      for (const p of def.props) {
        if (p.$type === "TeamSummaryProp") summary = stripQuotes(p.value);
        if (p.$type === "TeamEmailProp") email = stripQuotes(p.value);
        if (p.$type === "TeamMemberProp") members.push(p.memberRef);
        if (p.$type === "TeamOwnsProp") {
          owns.push({
            resourceType: p.owns.resourceType,
            id: p.owns.resourceName,
          });
        }
      }

      const teamId = addNode(def.name, "team", teamName, undefined, {
        summary,
        email,
      });
      for (const m of members) {
        const memberId = resolveNodeId(m, "user") || nid(m, "user");
        addEdge(memberId, teamId, "member-of");
      }
      for (const o of owns) {
        const targetId =
          resolveNodeId(o.id, o.resourceType) || nid(o.id, o.resourceType);
        addEdge(teamId, targetId, "owns");
      }
    } else if (isActorDef(def)) {
      const body = (def.body || []) as AstNode[];
      addNode(def.name, "actor", getName(body) || def.name, undefined, {
        summary: getSummary(body),
      });
    } else if (isExternalSystemDef(def)) {
      const body = (def.body || []) as AstNode[];
      addNode(
        def.name,
        "external-system",
        getName(body) || def.name,
        undefined,
        {
          summary: getSummary(body),
        },
      );
    }
  }

  // Look up a top-level def by name, preferring an exact name+version match
  function lookupDef(
    name: string,
    version?: string,
  ): ResourceDefinition | undefined {
    if (version) {
      const exact = topLevelDefs.get(defKey(name, version));
      if (exact) return exact;
    }
    return topLevelDefs.get(name);
  }

  function processVisualizerItem(item: VisualizerBodyItem): void {
    // Ref statements → look up top-level def and process it
    if (isServiceRefStmt(item)) {
      const def = lookupDef(item.ref.name, item.ref.version);
      if (def && isServiceDef(def)) {
        processService(def);
      } else {
        addNode(item.ref.name, "service", item.ref.name, undefined, {
          version: item.ref.version,
        });
      }
      return;
    }
    if (isDomainRefStmt(item)) {
      const def = lookupDef(item.ref.name, item.ref.version);
      if (def && isDomainDef(def)) {
        processDomain(def);
      } else {
        addNode(item.ref.name, "domain", item.ref.name, undefined, {
          version: item.ref.version,
        });
      }
      return;
    }
    if (isChannelRefStmt(item)) {
      const def = lookupDef(item.ref.name, item.ref.version);
      if (def && isChannelDef(def)) {
        processDefinition(def);
      } else {
        addNode(item.ref.name, "channel", item.ref.name, undefined, {
          version: item.ref.version,
        });
      }
      return;
    }
    if (isDataProductRefStmt(item)) {
      const def = lookupDef(item.ref.name, item.ref.version);
      if (def && isDataProductDef(def)) {
        processDefinition(def);
      } else {
        addNode(item.ref.name, "data-product", item.ref.name, undefined, {
          version: item.ref.version,
        });
      }
      return;
    }
    if (isFlowRefStmt(item)) {
      const def = lookupDef(item.ref.name, item.ref.version);
      if (def && isFlowDef(def)) {
        processDefinition(def);
      } else {
        addNode(item.ref.name, "flow", item.ref.name, undefined, {
          version: item.ref.version,
        });
      }
      return;
    }
    if (isContainerRefStmt(item)) {
      const def = lookupDef(item.ref.name, item.ref.version);
      if (def && isContainerDef(def)) {
        processDefinition(def);
      } else {
        addNode(item.ref.name, "container", item.ref.name, undefined, {
          version: item.ref.version,
        });
      }
      return;
    }

    // EventDef/CommandDef/QueryDef with empty body → treat as reference
    if (
      (isEventDef(item) || isCommandDef(item) || isQueryDef(item)) &&
      (!item.body || item.body.length === 0)
    ) {
      const nodeType: GraphNode["type"] = isEventDef(item)
        ? "event"
        : isCommandDef(item)
          ? "command"
          : "query";
      const def = topLevelDefs.get(item.name);
      if (def && (isEventDef(def) || isCommandDef(def) || isQueryDef(def))) {
        processMessage(def);
      } else {
        addNode(item.name, nodeType, item.name);
      }
      return;
    }

    // Inline definitions → use existing process functions
    if (isDomainDef(item)) {
      processDomain(item);
      return;
    }
    if (isServiceDef(item)) {
      processService(item);
      return;
    }
    if (isEventDef(item) || isCommandDef(item) || isQueryDef(item)) {
      processMessage(item);
      return;
    }
    if (
      isChannelDef(item) ||
      isContainerDef(item) ||
      isDataProductDef(item) ||
      isFlowDef(item) ||
      isActorDef(item) ||
      isExternalSystemDef(item)
    ) {
      processDefinition(item as ResourceDefinition);
      return;
    }
  }

  // Process only items inside the active visualizer body
  for (const item of activeViz.body) {
    processVisualizerItem(item);
  }

  return {
    nodes,
    edges,
    visualizers: visualizerNames,
    activeVisualizer: activeViz.name,
    title: vizTitle,
    options,
  };
}
