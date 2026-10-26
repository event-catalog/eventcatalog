/**
 * What a node is connected to on the diagram, as its card lists it: a message's producers and consumers, what a
 * service sends and receives, and what else connects to or from it. Through channels: what goes through a channel is
 * what's on its other side, as far as channels route to each other (the route is said as "via"). A channel's own card
 * is about what it transports: the messages it carries, who produces and consumes them, and where it routes.
 */
import type { Edge, Node } from "@xyflow/react";
import { getNodeInfo } from "./node-labels";

export type Neighbour = {
  id: string;
  type?: string;
  name: string;
  /** What the connection says, e.g. "publishes event", or the channel it goes through */
  label?: string;
};
export type NeighbourGroup = { heading: string; items: Neighbour[] };

const MESSAGE_TYPES = new Set([
  "events",
  "commands",
  "queries",
  "event",
  "command",
  "query",
]);
const CHANNEL_TYPES = new Set(["channels", "channel"]);
const SERVICE_TYPES = new Set(["services", "service", "agents", "agent"]);
// Not something it's connected to: written on the diagram, or a box around things
const NOT_NEIGHBOURS = new Set(["note", "text"]);

type Direction = "in" | "out";
// How many channels a route is followed through (channels can route to each other in a loop)
const MAX_ROUTE = 5;

const edgeLabel = (edge: Edge) => {
  const label =
    edge.label ?? (edge.data as { label?: unknown } | undefined)?.label;
  return typeof label === "string" && label.trim()
    ? label.replace(/\s+/g, " ").trim()
    : undefined;
};

/** The node's neighbours, in groups with headings for what they are to it (empty groups left out) */
export function getNodeNeighbours(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): NeighbourGroup[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const node = byId.get(nodeId);
  if (!node) return [];
  const typeOf = (id: string) => byId.get(id)?.type ?? "";

  // One step along the edges, in a direction
  const step = (from: string, direction: Direction) =>
    edges
      .filter((edge) =>
        direction === "out" ? edge.source === from : edge.target === from,
      )
      .map((edge) => ({
        id: direction === "out" ? edge.target : edge.source,
        label: edgeLabel(edge),
      }));

  const isChannel = (id: string) => CHANNEL_TYPES.has(typeOf(id));
  const toNeighbour = (id: string, label?: string): Neighbour => ({
    id,
    type: byId.get(id)!.type,
    name: getNodeInfo(byId.get(id)!).name,
    ...(label && { label }),
  });

  // What's beyond the node in a direction. From anything but a channel, through channels (as far as they route), to
  // what's on their other side, said as "via" them (a channel with nothing beyond it on this diagram is listed itself)
  const reach = (
    from: string,
    direction: Direction,
    throughChannels: boolean,
  ) => {
    const found = new Map<string, string | undefined>();
    const add = (id: string, label?: string) => {
      if (id === nodeId || found.has(id)) return;
      if (!byId.has(id) || NOT_NEIGHBOURS.has(typeOf(id))) return;
      found.set(id, label);
    };
    const follow = (channel: string, route: string[], seen: Set<string>) => {
      const via = `via ${route.join(" → ")}`;
      const beyond = step(channel, direction).filter(
        (other) => other.id !== nodeId && !seen.has(other.id),
      );
      if (!beyond.length) return add(channel);
      for (const other of beyond) {
        if (isChannel(other.id) && route.length < MAX_ROUTE)
          follow(
            other.id,
            [...route, getNodeInfo(byId.get(other.id)!).name],
            new Set([...seen, other.id]),
          );
        else add(other.id, via);
      }
    };
    for (const next of step(from, direction)) {
      if (throughChannels && isChannel(next.id))
        follow(
          next.id,
          [getNodeInfo(byId.get(next.id)!).name],
          new Set([next.id]),
        );
      else add(next.id, next.label);
    }
    return [...found].map(([id, label]) => toNeighbour(id, label));
  };

  const isMessage = (item: Neighbour) => MESSAGE_TYPES.has(item.type ?? "");
  const isChannelItem = (item: Neighbour) => CHANNEL_TYPES.has(item.type ?? "");

  // A channel: what it carries, who sends that and who reads from it, and the channels it routes from and to
  if (CHANNEL_TYPES.has(node.type ?? "")) {
    const incoming = reach(nodeId, "in", false);
    const outgoing = reach(nodeId, "out", false);
    // What it carries: the messages sent to it, and to the channels that route to it (said as "via" them)
    const carried = new Map<string, string | undefined>();
    const carry = (channel: string, route: string[], seen: Set<string>) => {
      for (const next of step(channel, "in")) {
        if (seen.has(next.id) || !byId.has(next.id)) continue;
        if (MESSAGE_TYPES.has(typeOf(next.id))) {
          if (!carried.has(next.id))
            carried.set(
              next.id,
              route.length ? `via ${route.join(" → ")}` : undefined,
            );
        } else if (isChannel(next.id) && route.length < MAX_ROUTE)
          carry(
            next.id,
            [getNodeInfo(byId.get(next.id)!).name, ...route],
            new Set([...seen, next.id]),
          );
      }
    };
    carry(nodeId, [], new Set([nodeId]));
    const messages = [...carried].map(([id, label]) => toNeighbour(id, label));
    // The services sending what it carries, and how many of its messages each sends
    const senders = new Map<string, number>();
    for (const message of messages)
      for (const sender of step(message.id, "in"))
        if (
          !isChannel(sender.id) &&
          byId.has(sender.id) &&
          !NOT_NEIGHBOURS.has(typeOf(sender.id))
        )
          senders.set(sender.id, (senders.get(sender.id) ?? 0) + 1);
    const withoutLabel = ({ label: _label, ...item }: Neighbour) => item;
    const groups: NeighbourGroup[] = [
      { heading: "Messages", items: messages },
      {
        heading: "Produced by",
        items: [...senders].map(([id, count]) =>
          toNeighbour(id, count === 1 ? "1 message" : `${count} messages`),
        ),
      },
      {
        heading: "Consumed by",
        items: outgoing.filter(
          (item) => !isMessage(item) && !isChannelItem(item),
        ),
      },
      {
        heading: "Routes from",
        items: incoming.filter(isChannelItem).map(withoutLabel),
      },
      {
        heading: "Routes to",
        items: outgoing.filter(isChannelItem).map(withoutLabel),
      },
      {
        heading: "Connected from",
        items: incoming.filter(
          (item) => !isMessage(item) && !isChannelItem(item),
        ),
      },
    ];
    return groups.filter((group) => group.items.length > 0);
  }

  const incoming = reach(nodeId, "in", true);
  const outgoing = reach(nodeId, "out", true);
  const groups: NeighbourGroup[] = MESSAGE_TYPES.has(node.type ?? "")
    ? [
        { heading: "Produced by", items: incoming },
        { heading: "Consumed by", items: outgoing },
      ]
    : SERVICE_TYPES.has(node.type ?? "")
      ? [
          { heading: "Sends", items: outgoing.filter(isMessage) },
          { heading: "Receives", items: incoming.filter(isMessage) },
          {
            heading: "Connects to",
            items: outgoing.filter((item) => !isMessage(item)),
          },
          {
            heading: "Connected from",
            items: incoming.filter((item) => !isMessage(item)),
          },
        ]
      : [
          { heading: "Connects to", items: outgoing },
          { heading: "Connected from", items: incoming },
        ];
  return groups.filter((group) => group.items.length > 0);
}
