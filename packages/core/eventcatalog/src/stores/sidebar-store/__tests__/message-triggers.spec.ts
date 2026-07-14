import { describe, expect, it, vi } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import { buildMessageNode } from '../builders/message';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
  buildEditUrlForResource: () => undefined,
}));

const createMessage = (collection: 'events' | 'commands' | 'queries', id: string) =>
  ({
    id: `${collection}/${id}/index.mdx`,
    collection,
    data: { id, version: '1.0.0', name: id, producers: [], consumers: [] },
  }) as unknown as CollectionEntry<'events' | 'commands' | 'queries'>;

const createService = (id: string) =>
  ({
    id: `services/${id}/index.mdx`,
    collection: 'services',
    data: { id, version: '1.0.0', name: id },
  }) as unknown as CollectionEntry<'services'>;

const context = {
  schemas: [],
  resourceDocs: [],
  resourceDocCategories: [],
  diagrams: [],
} as any;

const findGroup = (node: any, title: string) => node.pages.find((page: any) => page?.type === 'group' && page.title === title);

describe('message trigger sidebar sections', () => {
  it('does not add trigger paths when the message has no trigger relationships', () => {
    const node = buildMessageNode(createMessage('commands', 'CreateUser'), [], context);
    const quickReference = findGroup(node, 'Quick Reference');
    const architecture = findGroup(node, 'Architecture');

    expect(quickReference?.pages).toEqual([{ type: 'item', title: 'Overview', href: '/docs/commands/CreateUser/1.0.0' }]);
    expect(architecture?.pages).toEqual([{ type: 'item', title: 'Map', href: '/visualiser/commands/CreateUser/1.0.0' }]);
  });

  it('adds trigger paths below the message map when a relationship exists', () => {
    const command = createMessage('commands', 'CreateUser');
    const event = createMessage('events', 'UserCreated');
    const userService = createService('UserService');
    const node = buildMessageNode(command, [], context, false, [], {
      triggers: [{ receiver: userService, message: event, condition: 'on success' }],
      triggeredBy: [],
    });

    expect(findGroup(node, 'Architecture')?.pages).toEqual([
      { type: 'item', title: 'Map', href: '/visualiser/commands/CreateUser/1.0.0' },
      { type: 'item', title: 'Trigger paths', href: '/triggers/commands/CreateUser/1.0.0' },
    ]);
  });

  it('lists each triggered message once', () => {
    const command = createMessage('commands', 'CreateUser');
    const event = createMessage('events', 'UserCreated');
    const userService = createService('UserService');
    const auditService = createService('AuditService');

    const node = buildMessageNode(command, [], context, false, [], {
      triggers: [
        { receiver: userService, message: event, condition: 'on success' },
        { receiver: auditService, message: event },
      ],
      triggeredBy: [],
    });

    expect(findGroup(node, 'Triggers')).toEqual({
      type: 'group',
      title: 'Triggers',
      icon: 'Mail',
      pages: ['event:UserCreated:1.0.0'],
      visible: true,
    });
  });

  it('lists each triggering message once', () => {
    const command = createMessage('commands', 'CreateUser');
    const event = createMessage('events', 'UserCreated');
    const userService = createService('UserService');
    const auditService = createService('AuditService');

    const node = buildMessageNode(event, [], context, false, [], {
      triggers: [],
      triggeredBy: [
        { receiver: userService, message: command, condition: 'on success' },
        { receiver: auditService, message: command },
      ],
    });

    expect(findGroup(node, 'Triggered by')).toEqual({
      type: 'group',
      title: 'Triggered by',
      icon: 'Mail',
      pages: ['command:CreateUser:1.0.0'],
      visible: true,
    });
  });

  it('renders relationships between arbitrary message types', () => {
    const query = createMessage('queries', 'GetUser');
    const command = createMessage('commands', 'RefreshUser');

    const node = buildMessageNode(query, [], context, false, [], {
      triggers: [{ receiver: createService('UserService'), message: command }],
      triggeredBy: [],
    });

    expect(findGroup(node, 'Triggers')?.pages).toEqual(['command:RefreshUser:1.0.0']);
  });

  it('does not render trigger sections when there are no relationships', () => {
    const node = buildMessageNode(createMessage('queries', 'GetUser'), [], context);

    expect(findGroup(node, 'Triggers')).toBeUndefined();
    expect(findGroup(node, 'Triggered by')).toBeUndefined();
  });

  it('allows both sections to be hidden through detailsPanel configuration', () => {
    const query = createMessage('queries', 'GetUser');
    query.data.detailsPanel = { triggers: { visible: false }, triggeredBy: { visible: false } } as any;
    const command = createMessage('commands', 'RefreshUser');
    const event = createMessage('events', 'UserCreated');

    const node = buildMessageNode(query, [], context, false, [], {
      triggers: [{ receiver: createService('UserService'), message: command }],
      triggeredBy: [{ receiver: createService('AuditService'), message: event }],
    });

    expect(findGroup(node, 'Triggers')).toBeUndefined();
    expect(findGroup(node, 'Triggered by')).toBeUndefined();
  });
});
