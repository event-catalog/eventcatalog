import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { COMMAND, EVENT, MESSAGE, QUERY } from "../nodes/node-types";
import { createEdge } from "./utils/utils";
import type { EdgeRoute } from "./elk-layout";

const MESSAGE_NODE_TYPES = [...MESSAGE, "messageGroup", "messageGroupExpanded"];

export const isMessageNode = (node: Node) =>
  MESSAGE_NODE_TYPES.includes(node.type || "");

const getCollection = (type = "") => {
  if (EVENT.includes(type)) return "events";
  if (COMMAND.includes(type)) return "commands";
  if (QUERY.includes(type)) return "queries";
  return "messages";
};

// Returns the messages a node represents, as [name, collection] pairs
const getMessages = (node: Node): [string, string][] => {
  const data = node.data as any;
  if (node.type === "messageGroup") {
    return (data?.messages || []).map(({ message }: any) => [
      message?.data?.name || message?.data?.id,
      getCollection(message?.collection),
    ]);
  }
  const message = data?.message;
  return message
    ? [[message.name || message.id, getCollection(node.type)]]
    : [];
};

/** A channel a route goes through: its node, name and protocol (the first it lists, if any) */
export type Channel = { id: string; name: string; protocol?: string };

/** The channels a route goes through, in order (e.g. a topic, then the queue it routes to) */
export type ChannelRoute = Channel[];

/** The distinct routes through channels an edge stands for, keyed by the channel nodes they go through */
export type ChannelRoutes = Map<string, ChannelRoute>;

export const getChannel = (node: Node): Channel => {
  const channel = (
    node.data as
      | { channel?: { name?: string; id?: string; protocols?: string[] } }
      | undefined
  )?.channel;
  return {
    id: node.id,
    name: channel?.name || channel?.id || node.id,
    protocol: channel?.protocols?.[0],
  };
};

/** Adds a route an edge stands for, if it goes through any channels (the same route again changes nothing) */
export const addChannelRoute = (routes: ChannelRoutes, route: ChannelRoute) => {
  if (route.length > 0)
    routes.set(route.map(({ id }) => id).join("\u0000"), route);
};

const describeChannel = ({ name, protocol }: Channel) =>
  protocol ? `${name} (${protocol})` : name;

/**
 * How messages travel along an edge bridging hidden channels. One route says where it starts and ends, with the
 * channels in between counted, the end on a line of its own (so labels stay narrow): "via orders (kafka)",
 * "via orders (kafka)\n→ billing (sqs)", "via orders (kafka)\n→ +1 → billing (sqs)". Separate routes are counted:
 * "via 2 channels (kafka)", "via 2 channels"
 */
const getChannelsLabel = (routes: ChannelRoutes) => {
  if (routes.size === 0) return undefined;
  if (routes.size === 1) {
    const [route] = routes.values();
    const first = describeChannel(route[0]);
    if (route.length === 1) return `via ${first}`;
    const last = describeChannel(route[route.length - 1]);
    const between = route.length > 2 ? `+${route.length - 2} → ` : "";
    return `via ${first}\n→ ${between}${last}`;
  }
  const channels = new Map(
    Array.from(routes.values())
      .flat()
      .map((channel) => [channel.id, channel]),
  );
  const protocols = new Set(
    Array.from(channels.values(), ({ protocol }) => protocol),
  );
  const protocol = protocols.size === 1 ? Array.from(protocols)[0] : undefined;
  return `via ${channels.size} channels${protocol ? ` (${protocol})` : ""}`;
};

/** Label for an edge bridging hidden messages and channels: what it carries, then how */
export const getBridgedLabel = (
  messages: Map<string, string>,
  routes: ChannelRoutes,
) =>
  [getMessagesLabel(messages), getChannelsLabel(routes)]
    .filter(Boolean)
    .join("\n") || undefined;

const VERBS: Record<string, string> = {
  events: "publishes",
  commands: "invokes",
  queries: "requests",
};

/**
 * Label for an edge carrying messages (name -> collection), e.g.
 * "publishes\nProduct Created", "publishes\n3 events", "sends\n3 messages"
 */
export const getMessagesLabel = (messages: Map<string, string>) => {
  if (messages.size === 0) return undefined;
  const collections = new Set(messages.values());
  const collection =
    collections.size === 1 ? Array.from(collections)[0] : "messages";
  const verb = VERBS[collection] || "sends";
  const sent =
    messages.size === 1
      ? Array.from(messages.keys())[0]
      : `${messages.size} ${collection}`;
  return `${verb}\n${sent}`;
};

// Messages and channels carry what's sent between the nodes either side of them
export const isCarrier = (node: Node) =>
  isMessageNode(node) || node.type === "channels";

// What level 2 leaves out: messages and channels, and agents' tools (how an
// agent works, L3 detail like its messages)
export const isLevel3Detail = (node: Node) =>
  isCarrier(node) || node.type === "agentTool";

const isCrossDomain = (edge: Edge) =>
  !!(edge.data as { crossDomain?: boolean } | undefined)?.crossDomain;

const getRoute = (edge: Edge) =>
  (edge.data as { route?: EdgeRoute } | undefined)?.route;

/**
 * The route of an edge bridging hidden nodes: along the routes of the edges it
 * replaces (through where the hidden nodes were), labelled where the first
 * hidden node was. None unless they're all laid out.
 */
const joinRoutes = (routes: (EdgeRoute | undefined)[]) => {
  if (!routes.every((route) => route && route.points.length > 0)) return;
  const laidOut = routes as EdgeRoute[];
  const arrives = laidOut[0].points[laidOut[0].points.length - 1];
  const leaves = laidOut[1].points[0];
  return {
    points: laidOut.flatMap((route) => route.points),
    label: { x: (arrives.x + leaves.x) / 2, y: (arrives.y + leaves.y) / 2 },
    source: laidOut[0].source,
    target: laidOut[laidOut.length - 1].target,
  };
};

export type HideNodesOptions = {
  /** Say which channels bridged edges go through (L2); off for L1 */
  channelRoutes?: boolean;
};

/**
 * Removes the nodes `isHidden` picks. Messages and channels removed are
 * bridged: the nodes either side of them are connected directly, labelled with
 * the messages between them. Other edges to removed nodes go with them.
 * e.g. hiding events, ServiceA -> OrderPlaced -> ServiceB becomes ServiceA -> ServiceB
 *
 * With `channelRoutes` (the default, for L2), they also say which channels the
 * messages go through ("via orders (kafka)"). L1 turns it off: its edges say
 * only what's sent between domains and systems.
 */
export const hideNodes = (
  nodes: Node[],
  edges: Edge[],
  isHidden: (node: Node) => boolean,
  { channelRoutes = true }: HideNodesOptions = {},
) => {
  const hiddenNodes = new Map(
    nodes.filter(isHidden).map((node) => [node.id, node]),
  );
  if (hiddenNodes.size === 0) return { nodes, edges };

  const outgoingEdges = new Map<string, Edge[]>();
  for (const edge of edges) {
    const outgoing = outgoingEdges.get(edge.source) || [];
    outgoing.push(edge);
    outgoingEdges.set(edge.source, outgoing);
  }

  const keptEdges: Edge[] = [];
  const bridgedEdges = new Map<
    string,
    {
      source: string;
      target: string;
      messages: Map<string, string>;
      channels: ChannelRoutes;
      route?: EdgeRoute;
      crossDomain: boolean;
    }
  >();

  for (const edge of edges) {
    if (hiddenNodes.has(edge.source)) continue;
    const target = hiddenNodes.get(edge.target);
    if (!target) {
      keptEdges.push(edge);
      continue;
    }
    if (!isCarrier(target)) continue;

    // Follow the edge through hidden messages and channels until we reach
    // visible nodes, collecting the names of the messages along the way. Each
    // path keeps what it went through, so it can't loop, and every route to a
    // node is followed (e.g. through two topics into the same queue)
    const stack = [
      {
        id: edge.target,
        path: [edge.target],
        messages: [] as [string, string][],
        channels: [] as ChannelRoute,
        routes: [getRoute(edge)],
        crossDomain: isCrossDomain(edge),
      },
    ];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const hidden = hiddenNodes.get(current.id)!;
      const messages = [...current.messages, ...getMessages(hidden)];
      const channels =
        channelRoutes && hidden.type === "channels"
          ? [...current.channels, getChannel(hidden)]
          : current.channels;

      for (const next of outgoingEdges.get(current.id) || []) {
        const routes = [...current.routes, getRoute(next)];
        const crossDomain = current.crossDomain || isCrossDomain(next);
        const nextNode = hiddenNodes.get(next.target);
        if (nextNode) {
          if (isCarrier(nextNode) && !current.path.includes(next.target))
            stack.push({
              id: next.target,
              path: [...current.path, next.target],
              messages,
              channels,
              routes,
              crossDomain,
            });
          continue;
        }
        if (next.target === edge.source) continue;

        // Prefixed, so it can't clash with an edge directly between the two
        const id = `bridged-${edge.source}-${next.target}`;
        const bridged = bridgedEdges.get(id) || {
          source: edge.source,
          target: next.target,
          messages: new Map<string, string>(),
          channels: new Map() as ChannelRoutes,
          route: joinRoutes(routes),
          crossDomain: false,
        };
        bridged.crossDomain ||= crossDomain;
        messages.forEach(([name, collection]) =>
          bridged.messages.set(name, collection),
        );
        addChannelRoute(bridged.channels, channels);
        bridgedEdges.set(id, bridged);
      }
    }
  }

  const newEdges = Array.from(bridgedEdges, ([id, bridged]) =>
    createEdge({
      id,
      source: bridged.source,
      target: bridged.target,
      label: getBridgedLabel(bridged.messages, bridged.channels),
      // The same size arrow as the rest of the graph's edges
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "rgb(var(--ec-page-text-muted))",
      },
      // Along the same route, and crossing domains if any edge it replaces did
      data: {
        ...(bridged.route ? { route: bridged.route } : {}),
        ...(bridged.crossDomain ? { crossDomain: true } : {}),
      },
    }),
  );

  return {
    nodes: nodes.filter((node) => !hiddenNodes.has(node.id)),
    edges: [...keptEdges, ...newEdges],
  };
};

/**
 * Removes message nodes (events, commands, queries) and the channels they
 * travel through, connecting the nodes on either side directly, and agents' tools.
 * e.g. ServiceA -> OrderPlaced -> orders-topic -> ServiceB becomes ServiceA -> ServiceB
 */
export const hideMessageNodes = (
  nodes: Node[],
  edges: Edge[],
  options?: HideNodesOptions,
) => hideNodes(nodes, edges, isLevel3Detail, options);
