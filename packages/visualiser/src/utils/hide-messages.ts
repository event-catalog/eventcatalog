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

/**
 * Removes the nodes `isHidden` picks. Messages and channels removed are
 * bridged: the nodes either side of them are connected directly, labelled with
 * the messages between them. Other edges to removed nodes go with them.
 * e.g. hiding events, ServiceA -> OrderPlaced -> ServiceB becomes ServiceA -> ServiceB
 */
export const hideNodes = (
  nodes: Node[],
  edges: Edge[],
  isHidden: (node: Node) => boolean,
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
    // visible nodes, collecting the names of the messages along the way
    const stack = [
      {
        id: edge.target,
        messages: [] as [string, string][],
        routes: [getRoute(edge)],
        crossDomain: isCrossDomain(edge),
      },
    ];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const messages = [
        ...current.messages,
        ...getMessages(hiddenNodes.get(current.id)!),
      ];

      for (const next of outgoingEdges.get(current.id) || []) {
        const routes = [...current.routes, getRoute(next)];
        const crossDomain = current.crossDomain || isCrossDomain(next);
        const nextNode = hiddenNodes.get(next.target);
        if (nextNode) {
          if (isCarrier(nextNode))
            stack.push({ id: next.target, messages, routes, crossDomain });
          continue;
        }
        if (next.target === edge.source) continue;

        // Prefixed, so it can't clash with an edge directly between the two
        const id = `bridged-${edge.source}-${next.target}`;
        const bridged = bridgedEdges.get(id) || {
          source: edge.source,
          target: next.target,
          messages: new Map<string, string>(),
          route: joinRoutes(routes),
          crossDomain: false,
        };
        bridged.crossDomain ||= crossDomain;
        messages.forEach(([name, collection]) =>
          bridged.messages.set(name, collection),
        );
        bridgedEdges.set(id, bridged);
      }
    }
  }

  const newEdges = Array.from(bridgedEdges, ([id, bridged]) =>
    createEdge({
      id,
      source: bridged.source,
      target: bridged.target,
      label: getMessagesLabel(bridged.messages),
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
 * travel through, connecting the nodes on either side directly.
 * e.g. ServiceA -> OrderPlaced -> orders-topic -> ServiceB becomes ServiceA -> ServiceB
 */
export const hideMessageNodes = (nodes: Node[], edges: Edge[]) =>
  hideNodes(nodes, edges, isCarrier);
