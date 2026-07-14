import { describe, expect, it } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import { buildMessageLineageGraph, groupMessageLineageGraphs } from '@utils/node-graphs/message-lineage';

const createMessage = (collection: 'events' | 'commands' | 'queries', id: string) =>
  ({
    collection,
    data: { id, name: id, version: '1.0.0' },
  }) as CollectionEntry<'events' | 'commands' | 'queries'>;

const createReceiver = (collection: 'services' | 'domains' | 'agents', id: string) =>
  ({
    collection,
    data: { id, name: id, version: '1.0.0' },
  }) as CollectionEntry<'services' | 'domains' | 'agents'>;

describe('message lineage graphs', () => {
  it('builds a focused message to receiver to triggered message row', () => {
    const command = createMessage('commands', 'CreateOrder');
    const event = createMessage('events', 'OrderCreated');
    const service = createReceiver('services', 'OrderService');

    const graph = buildMessageLineageGraph({
      currentMessage: command,
      direction: 'triggers',
      relation: { receiver: service, message: event, condition: 'when the order is valid' },
    });

    expect(graph.condition).toBe('when the order is valid');
    expect(graph.nodes.map((node) => node.id)).toEqual(['CreateOrder-1.0.0', 'OrderService-1.0.0', 'OrderCreated-1.0.0']);
    expect(graph.nodes[0].data.isFocused).toBe(true);
    expect(graph.nodes[2].data.isFocused).toBeUndefined();
    expect(graph.edges.map((edge) => [edge.source, edge.target])).toEqual([
      ['CreateOrder-1.0.0', 'OrderService-1.0.0'],
      ['OrderService-1.0.0', 'OrderCreated-1.0.0'],
    ]);
  });

  it('builds an arbitrary triggering message through a domain to the focused message', () => {
    const query = createMessage('queries', 'CheckOrder');
    const event = createMessage('events', 'OrderReviewed');
    const domain = createReceiver('domains', 'Ordering');

    const graph = buildMessageLineageGraph({
      currentMessage: event,
      direction: 'triggeredBy',
      relation: { receiver: domain, message: query },
    });

    expect(graph.source).toBe(query);
    expect(graph.target).toBe(event);
    expect(graph.nodes[0].data.isFocused).toBeUndefined();
    expect(graph.nodes[2].data.isFocused).toBe(true);
    expect(graph.nodes[1].type).toBe('domains');
  });

  it('groups conditions that share the same source, receiver, and target path into scenarios', () => {
    const source = createMessage('events', 'ReviewSubmitted');
    const target = createMessage('events', 'ReviewPublished');
    const service = createReceiver('services', 'ReviewModerationWorker');
    const otherService = createReceiver('services', 'OtherModerationWorker');

    const graphs = [
      buildMessageLineageGraph({
        currentMessage: target,
        direction: 'triggeredBy',
        relation: { receiver: service, message: source, condition: 'when automated moderation passes' },
      }),
      buildMessageLineageGraph({
        currentMessage: target,
        direction: 'triggeredBy',
        relation: { receiver: service, message: source, condition: 'when a human moderator approves it' },
      }),
      buildMessageLineageGraph({
        currentMessage: target,
        direction: 'triggeredBy',
        relation: { receiver: otherService, message: source, condition: 'when a second system approves it' },
      }),
    ];

    const groups = groupMessageLineageGraphs(graphs);

    expect(groups).toHaveLength(2);
    expect(groups[0].scenarios).toEqual([
      { condition: 'when automated moderation passes' },
      { condition: 'when a human moderator approves it' },
    ]);
    expect(groups[0].nodes).toBe(graphs[0].nodes);
    expect(groups[1].receiver).toBe(otherService);
  });
});
