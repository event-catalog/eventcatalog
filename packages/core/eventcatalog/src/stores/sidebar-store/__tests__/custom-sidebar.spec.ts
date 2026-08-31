import { describe, expect, it, vi } from 'vitest';
import { applyCustomSidebar, indexSidebarsByFolder, getSidebarForResource, parseResourceRef } from '../custom-sidebar';
import type { SidebarSections, SidebarSpec } from '../custom-sidebar';
import type { NavNode } from '../builders/shared';

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => `/base${path}`,
}));

const group = (title: string, pages: string[] = []): NavNode => ({ type: 'group', title, icon: 'Box', pages });

const sections: SidebarSections = {
  'quick-reference': group('Quick Reference'),
  owners: group('Owners', ['team:product-platform']),
  services: group('Services', ['service:Orders:1.0.0']),
  entities: null,
  'resource-groups': [group('Group A'), group('Group B')],
};

const resource = { collection: 'domains' as const, id: 'Catalog', version: '1.0.0' };

const spec = (entries: SidebarSpec['sections']): SidebarSpec => ({
  sections: entries,
  sourcePath: 'domains/Catalog/sidebar.json',
});

describe('parseResourceRef', () => {
  it('parses type, id and optional version', () => {
    expect(parseResourceRef('[[service|OrderService]]')).toEqual({ type: 'service', id: 'OrderService', version: undefined });
    expect(parseResourceRef('[[service|OrderService@1.2.3]]')).toEqual({ type: 'service', id: 'OrderService', version: '1.2.3' });
  });

  it('keeps doc targets as paths and never extracts a version from them', () => {
    expect(parseResourceRef('[[doc|guides/sla@v2]]')).toEqual({ type: 'doc', id: 'guides/sla@v2', version: undefined });
  });

  it('returns null for anything that is not a [[type|target]] ref', () => {
    expect(parseResourceRef('services')).toBeNull();
    expect(parseResourceRef('[[Order]]')).toBeNull();
  });
});

describe('applyCustomSidebar', () => {
  it('renders predefined sections in the order they are listed and nothing else', () => {
    const pages = applyCustomSidebar(spec(['$owners', '$quick-reference']), sections, resource);
    expect(pages.map((page) => (typeof page === 'string' ? page : page.title))).toEqual(['Owners', 'Quick Reference']);
  });

  it('omits predefined sections that have nothing to render', () => {
    expect(applyCustomSidebar(spec(['$entities']), sections, resource)).toEqual([]);
  });

  it('expands tokens that map to several groups', () => {
    const pages = applyCustomSidebar(spec(['$resource-groups']), sections, resource);
    expect(pages.map((page) => (page as NavNode).title)).toEqual(['Group A', 'Group B']);
  });

  it('relabels a predefined section without touching its contents', () => {
    const [owners] = applyCustomSidebar(spec([{ section: '$owners', title: 'Team', icon: 'Users' }]), sections, resource);
    expect(owners).toEqual({ type: 'group', title: 'Team', icon: 'Users', pages: ['team:product-platform'] });
  });

  it('builds custom groups from resource refs, doc refs and links', () => {
    const resourceDocs = [
      {
        data: {
          resourceCollection: 'domains',
          resourceId: 'Catalog',
          resourceVersion: '1.0.0',
          type: 'guides',
          id: 'sla',
          title: 'SLA & error budgets',
        },
      },
    ] as any;

    const [runbooks] = applyCustomSidebar(
      spec([
        {
          title: 'Runbooks',
          icon: 'Siren',
          pages: [
            '[[service|Orders]]',
            '[[service|Payments@2.0.0]]',
            '[[event|OrderPlaced]]',
            '[[adr|adr-001-outbox]]',
            '[[doc|guides/sla]]',
            { title: 'On-call', href: 'https://runbooks.acme.dev/orders' },
            { title: 'Internal', href: '/docs/domains/Catalog/1.0.0/resources' },
          ],
        },
      ]),
      sections,
      resource,
      { resourceDocs }
    ) as NavNode[];

    expect(runbooks).toMatchObject({
      type: 'group',
      title: 'Runbooks',
      icon: 'Siren',
      collapseKey: 'custom:domains:Catalog:1.0.0:runbooks',
    });
    expect(runbooks.pages).toEqual([
      'service:Orders',
      'service:Payments:2.0.0',
      'event:OrderPlaced',
      'adr:adr-001-outbox',
      { type: 'item', title: 'SLA & error budgets', href: '/base/docs/domains/Catalog/1.0.0/guides/sla' },
      { type: 'item', title: 'On-call', href: 'https://runbooks.acme.dev/orders', external: true },
      { type: 'item', title: 'Internal', href: '/base/docs/domains/Catalog/1.0.0/resources' },
    ]);
  });

  it("splices a predefined section's items into a custom group, wherever the token sits", () => {
    const [extended] = applyCustomSidebar(
      spec([
        {
          title: 'Quick Reference',
          icon: 'BookOpen',
          pages: [{ title: 'Before', href: '/before' }, '$services', { title: 'After', href: '/after' }],
        },
      ]),
      sections,
      resource
    ) as NavNode[];

    expect(extended.pages).toEqual([
      { type: 'item', title: 'Before', href: '/base/before' },
      'service:Orders:1.0.0',
      { type: 'item', title: 'After', href: '/base/after' },
    ]);
  });

  it('splices nothing when the predefined section has nothing to render', () => {
    const [group] = applyCustomSidebar(spec([{ title: 'X', pages: ['$entities'] }]), sections, resource) as NavNode[];
    expect(group.pages).toEqual([]);
  });

  it('refuses to splice a token that expands to several groups', () => {
    expect(() => applyCustomSidebar(spec([{ title: 'X', pages: ['$resource-groups'] }]), sections, resource)).toThrow(
      /Cannot splice "\$resource-groups" into a group/
    );
    expect(() => applyCustomSidebar(spec([{ title: 'X', pages: ['$nope'] }]), sections, resource)).toThrow(
      /Unknown section "\$nope"/
    );
  });

  it('interpolates {id}, {version} and {collection} into link titles and hrefs', () => {
    const [group] = applyCustomSidebar(
      spec([
        {
          title: 'Links',
          pages: [
            { title: 'Visualiser ({version})', href: '/visualiser/{collection}/{id}/{version}' },
            { title: 'Dashboard', href: 'https://grafana.acme.dev/d/{id}?v={version}' },
            { title: 'Unknown placeholder untouched', href: '/x/{nope}' },
          ],
        },
      ]),
      sections,
      resource
    ) as NavNode[];

    expect(group.pages).toEqual([
      { type: 'item', title: 'Visualiser (1.0.0)', href: '/base/visualiser/domains/Catalog/1.0.0' },
      { type: 'item', title: 'Dashboard', href: 'https://grafana.acme.dev/d/Catalog?v=1.0.0', external: true },
      { type: 'item', title: 'Unknown placeholder untouched', href: '/base/x/{nope}' },
    ]);
  });

  it('treats any protocol as external and leaves it untouched by buildUrl', () => {
    const [group] = applyCustomSidebar(
      spec([{ title: 'X', pages: [{ title: 'Mail', href: 'mailto:team@acme.dev' }] }]),
      sections,
      resource
    ) as NavNode[];
    expect(group.pages).toEqual([{ type: 'item', title: 'Mail', href: 'mailto:team@acme.dev', external: true }]);
  });

  it('renders nested groups as subtle subsections with path-based collapse keys', () => {
    const [parent] = applyCustomSidebar(
      spec([
        {
          title: 'Product data',
          icon: 'Package',
          pages: [
            '[[system|product-catalog-system]]',
            {
              title: 'Entities',
              collapsed: true,
              pages: ['[[entity|product]]', { title: 'Deeper', pages: ['[[entity|category]]'] }],
            },
          ],
        },
      ]),
      sections,
      resource
    ) as NavNode[];

    expect(parent.collapseKey).toBe('custom:domains:Catalog:1.0.0:product-data');
    expect(parent.subtle).toBeUndefined();
    expect(parent.pages?.[0]).toBe('system:product-catalog-system');

    const entities = parent.pages?.[1] as NavNode;
    expect(entities).toMatchObject({
      type: 'group',
      title: 'Entities',
      subtle: true,
      collapsed: true,
      collapseKey: 'custom:domains:Catalog:1.0.0:product-data:entities',
    });
    expect(entities.icon).toBeUndefined();

    const deeper = entities.pages?.[1] as NavNode;
    expect(deeper).toMatchObject({
      title: 'Deeper',
      subtle: true,
      collapseKey: 'custom:domains:Catalog:1.0.0:product-data:entities:deeper',
      pages: ['entity:category'],
    });
    expect(deeper.collapsed).toBeUndefined();
  });

  it('passes an explicit collapsed state through on custom groups and predefined sections', () => {
    const [custom, owners, untouched] = applyCustomSidebar(
      spec([{ title: 'Links', collapsed: false, pages: [] }, { section: '$owners', collapsed: true }, '$services']),
      sections,
      resource
    ) as NavNode[];

    expect(custom.collapsed).toBe(false);
    expect(owners).toEqual({ type: 'group', title: 'Owners', icon: 'Box', collapsed: true, pages: ['team:product-platform'] });
    expect(untouched.collapsed).toBeUndefined();
  });

  describe('spec and schema refs', () => {
    const ownResource = {
      ...resource,
      entry: { data: { specifications: [{ type: 'openapi', path: 'openapi.yml', name: 'Catalog API' }] } },
    };
    const context = {
      services: [
        {
          collection: 'services',
          data: {
            id: 'product-api',
            name: 'Product API',
            version: '1.0.0',
            specifications: [
              { type: 'asyncapi', path: 'specs/events.yaml', name: 'Product events' },
              { type: 'graphql', path: 'schema.graphql', name: 'Product GraphQL' },
            ],
          },
        },
      ],
      domains: [],
      events: [{ collection: 'events', data: { id: 'product-created', name: 'Product Created', version: '2.0.0' } }],
      commands: [{ collection: 'commands', data: { id: 'create-product', name: 'Create Product', version: '1.0.0' } }],
      queries: [],
      schemas: [
        { data: { message: { collectionName: 'events', id: 'product-created', version: '2.0.0' } } },
        { data: { message: { collectionName: 'events', id: 'product-created', version: '1.0.0' } } },
        { data: { message: { collectionName: 'commands', id: 'create-product', version: '1.0.0' } } },
      ],
    } as any;

    const pagesOf = (entries: string[], res = ownResource) =>
      (applyCustomSidebar(spec([{ title: 'X', pages: entries }]), sections, res, context)[0] as NavNode).pages;

    it("resolves this resource's own specification by filename", () => {
      expect(pagesOf(['[[spec|openapi.yml]]'])).toEqual([
        {
          type: 'item',
          title: 'Catalog API',
          leftIcon: '/icons/openapi-black.svg',
          href: '/base/docs/domains/Catalog/1.0.0/spec/openapi',
        },
      ]);
    });

    it("resolves another resource's specification by id, type-qualified id, and pinned version", () => {
      const expected = {
        type: 'item',
        title: 'Product events',
        leftIcon: '/icons/asyncapi-black.svg',
        href: '/base/docs/services/product-api/1.0.0/asyncapi/events',
      };
      expect(pagesOf(['[[spec|product-api/events.yaml]]'])).toEqual([expected]);
      expect(pagesOf(['[[spec|service/product-api/events.yaml]]'])).toEqual([expected]);
      expect(pagesOf(['[[spec|service/product-api@1.0.0/events.yaml]]'])).toEqual([expected]);
      expect(pagesOf(['[[spec|product-api/schema]]'])).toEqual([
        {
          type: 'item',
          title: 'Product GraphQL',
          leftIcon: '/icons/graphql-black.svg',
          href: '/base/docs/services/product-api/1.0.0/graphql/schema',
        },
      ]);
    });

    it('fails clearly when a spec cannot be found', () => {
      expect(() => pagesOf(['[[spec|nope.yml]]'])).toThrow(/"Catalog" has no specification file "nope.yml"/);
      expect(() => pagesOf(['[[spec|missing-service/openapi.yml]]'])).toThrow(/resource "missing-service" not found/);
      expect(() => pagesOf(['[[spec|service/product-api@9.9.9/events.yaml]]'])).toThrow(/resource "product-api" not found/);
      expect(() => pagesOf(['[[spec|widget/thing/openapi.yml]]'])).toThrow(/Unknown resource type "widget"/);
      expect(() => pagesOf(['[[spec|openapi.yml]]'], resource)).toThrow(/resource not found/);
    });

    it("resolves a message's schema page by id, type-qualified id, and pinned version", () => {
      expect(pagesOf(['[[schema|product-created]]'])).toEqual([
        { type: 'item', title: 'Product Created schema', href: '/base/schemas/events/product-created/2.0.0' },
      ]);
      expect(pagesOf(['[[schema|event/product-created@1.0.0]]'])).toEqual([
        { type: 'item', title: 'Product Created schema', href: '/base/schemas/events/product-created/1.0.0' },
      ]);
      expect(pagesOf(['[[schema|command/create-product]]'])).toEqual([
        { type: 'item', title: 'Create Product schema', href: '/base/schemas/commands/create-product/1.0.0' },
      ]);
    });

    it('fails clearly when a schema cannot be found', () => {
      expect(() => pagesOf(['[[schema|nope]]'])).toThrow(/message "nope" not found/);
      expect(() => pagesOf(['[[schema|product-created@3.0.0]]'])).toThrow(/"product-created" v3.0.0 has no schema/);
      expect(() => pagesOf(['[[schema|widget/thing]]'])).toThrow(/Unknown message type "widget"/);
    });
  });

  it('fails the build with a helpful message for unknown or unprefixed sections', () => {
    expect(() => applyCustomSidebar(spec(['$nope']), sections, resource)).toThrow(
      /Unknown section "\$nope" in sidebar \(domains\/Catalog\/sidebar\.json\)\. Available sections for this resource: \$quick-reference, \$owners/
    );
    expect(() => applyCustomSidebar(spec(['owners']), sections, resource)).toThrow(/did you mean "\$owners"/);
  });

  it('fails the build when a doc ref does not resolve, listing the available docs', () => {
    const resourceDocs = [
      {
        data: {
          resourceCollection: 'domains',
          resourceId: 'Catalog',
          resourceVersion: '1.0.0',
          type: 'guides',
          id: 'sla',
          title: 'SLA',
        },
      },
    ] as any;
    expect(() =>
      applyCustomSidebar(spec([{ title: 'X', pages: ['[[doc|guides/missing]]'] }]), sections, resource, { resourceDocs })
    ).toThrow(/has no documentation page "guides\/missing"\. Available: guides\/sla\./);
    expect(() => applyCustomSidebar(spec([{ title: 'X', pages: ['[[doc|guides/anything]]'] }]), sections, resource)).toThrow(
      /has no documentation pages/
    );
  });

  it('fails the build when pinning a historical version of a latest-only collection', () => {
    const context = {
      services: [{ collection: 'services', data: { id: 'orders', name: 'Orders', version: '2.0.0' } }],
    } as any;
    expect(() =>
      applyCustomSidebar(spec([{ title: 'X', pages: ['[[service|orders@1.0.0]]'] }]), sections, resource, context)
    ).toThrow(/only the latest version \(2\.0\.0\) of a service can be referenced/);
    // Pinning the latest version is fine, and unknown ids keep the silent resource-ref contract.
    const [group] = applyCustomSidebar(
      spec([{ title: 'X', pages: ['[[service|orders@2.0.0]]', '[[service|ghost@1.0.0]]'] }]),
      sections,
      resource,
      context
    ) as NavNode[];
    expect(group.pages).toEqual(['service:orders:2.0.0', 'service:ghost:1.0.0']);
  });

  it('fails the build for pages it cannot resolve', () => {
    expect(() => applyCustomSidebar(spec([{ title: 'X', pages: ['owners'] }]), sections, resource)).toThrow(
      /Invalid page "owners"/
    );
    expect(() => applyCustomSidebar(spec([{ title: 'X', pages: ['[[widget|Thing]]'] }]), sections, resource)).toThrow(
      /Unknown resource type "widget"/
    );
    expect(() => applyCustomSidebar(spec([{ title: 'X', pages: ['[[doc|sla]]'] }]), sections, resource)).toThrow(
      /Expected "\[\[doc\|<type>\/<id>\]\]"/
    );
  });
});

describe('indexSidebarsByFolder / getSidebarForResource', () => {
  it('matches a resource to the sidebar.json in its own folder', () => {
    const byFolder = indexSidebarsByFolder([
      { filePath: 'domains/Catalog/sidebar.json', data: { sections: ['$owners'] } },
      { filePath: 'domains/Catalog/versioned/0.0.1/sidebar.json', data: { sections: [] } },
    ] as any);

    expect(getSidebarForResource(byFolder, { filePath: 'domains/Catalog/index.mdx' })).toMatchObject({
      sections: ['$owners'],
      sourcePath: 'domains/Catalog/sidebar.json',
    });
    expect(getSidebarForResource(byFolder, { filePath: 'domains/Catalog/versioned/0.0.1/index.mdx' })).toMatchObject({
      sections: [],
    });
    expect(getSidebarForResource(byFolder, { filePath: 'domains/Orders/index.mdx' })).toBeUndefined();
    expect(getSidebarForResource(byFolder, {})).toBeUndefined();
  });

  it("versioned copies inherit the resource folder's sidebar unless their folder has its own", () => {
    const byFolder = indexSidebarsByFolder([
      { filePath: 'events/OrderCreated/sidebar.json', data: { sections: ['$producers'] } },
      { filePath: 'events/OrderCreated/versioned/0.0.1/sidebar.json', data: { sections: ['$owners'] } },
    ] as any);

    // No sidebar of its own → inherits the resource folder's.
    expect(getSidebarForResource(byFolder, { filePath: 'events/OrderCreated/versioned/1.0.0/index.mdx' })).toMatchObject({
      sections: ['$producers'],
    });
    // Its own file wins over inheritance.
    expect(getSidebarForResource(byFolder, { filePath: 'events/OrderCreated/versioned/0.0.1/index.mdx' })).toMatchObject({
      sections: ['$owners'],
    });
    // Unrelated versioned resources inherit nothing.
    expect(getSidebarForResource(byFolder, { filePath: 'events/OrderPlaced/versioned/1.0.0/index.mdx' })).toBeUndefined();
  });
});
