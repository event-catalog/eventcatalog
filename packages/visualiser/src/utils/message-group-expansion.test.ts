import { describe, expect, it } from "vitest";
import {
  buildMessageGroupExpansionNodes,
  getExpandedMessageGroupNode,
  type GraphNode,
} from "./message-group-expansion";

const node = (
  id: string,
  type: string,
  x = 0,
  y = 0,
  parentId?: string,
): GraphNode => ({
  id,
  type,
  parentId,
  position: { x, y },
});

describe("message group expansion helpers", () => {
  it("detects when a message group is already expanded", () => {
    const nodes = [
      node("message-group-orders-sends-Updates", "messageGroupExpanded"),
      node("OrderCreated-1.0.0", "events"),
    ];

    expect(
      getExpandedMessageGroupNode(nodes, "message-group-orders-sends-Updates"),
    ).toBe(nodes[0]);
  });

  it("replaces an existing expanded group and children instead of appending duplicates", () => {
    const groupNodeId = "message-group-orders-sends-Updates";
    const expandedContainer = node(groupNodeId, "messageGroupExpanded", 10, 20);
    const child = node(
      `${groupNodeId}__OrderCreated-1.0.0`,
      "events",
      70,
      70,
      groupNodeId,
    );
    const existingExpandedChild = node(
      `${groupNodeId}__OrderCreated-1.0.0`,
      "events",
      70,
      260,
      groupNodeId,
    );
    const downstream = node("NotificationsService-1.0.0", "services", 0, 0);

    const nextNodes = buildMessageGroupExpansionNodes({
      currentNodes: [
        node("OrdersService-1.0.0", "services"),
        node(groupNodeId, "messageGroupExpanded", 10, 20),
        existingExpandedChild,
        downstream,
      ],
      groupNodeId,
      expandedContainerNode: expandedContainer,
      childNodes: [child],
      downstreamNodes: [downstream],
      getDownstreamPosition: (_node, index) => ({
        x: 650,
        y: 60 + index * 190,
      }),
    });

    expect(nextNodes.filter((n) => n.id === groupNodeId)).toHaveLength(1);
    expect(nextNodes.filter((n) => n.parentId === groupNodeId)).toHaveLength(1);
    expect(nextNodes.filter((n) => n.id === downstream.id)).toHaveLength(1);
  });
});
