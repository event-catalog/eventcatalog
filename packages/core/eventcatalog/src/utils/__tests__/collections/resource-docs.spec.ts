import type { ContentCollectionKey } from 'astro:content';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getGroupedResourceDocsByType,
  getResourceDocCategories,
  getResourceDocs,
  getResourceDocsForResource,
} from '@utils/collections/resource-docs';

const mockDomains = [
  {
    collection: 'domains',
    data: { id: 'Payments', version: '1.0.0', hidden: false },
  },
  {
    collection: 'domains',
    data: { id: 'Payments', version: '0.9.0', hidden: false },
  },
];

const mockServices = [
  {
    collection: 'services',
    data: { id: 'BillingService', version: '2.0.0', hidden: false },
  },
  {
    collection: 'services',
    data: { id: 'BillingService', version: '1.0.0', hidden: false },
  },
];

const mockEvents = [
  {
    collection: 'events',
    data: { id: 'InvoiceIssued', version: '3.0.0', hidden: false },
  },
];

const mockResourceDocs = [
  {
    id: 'domains/Payments/docs/runbooks/10-incident.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/docs/runbooks/10-incident.mdx',
    data: { id: 'incident', type: 'runbooks', version: '1.0.0', order: 2, title: 'Incident Handling' },
  },
  {
    id: 'domains/Payments/docs/runbooks/versioned/0.9.0/10-incident.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/docs/runbooks/versioned/0.9.0/10-incident.mdx',
    data: { id: 'incident', type: 'runbooks', version: '0.9.0', order: 2, title: 'Incident Handling' },
  },
  {
    id: 'domains/Payments/docs/runbooks/1-playbook.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/docs/runbooks/1-playbook.mdx',
    data: { id: 'playbook', type: 'runbooks', version: '1.0.0', title: 'Playbook' },
  },
  {
    id: 'domains/Payments/docs/runbooks/checklist.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/docs/runbooks/checklist.mdx',
    data: { id: 'checklist', type: 'runbooks', version: '1.0.0', title: 'Checklist' },
  },
  {
    id: 'domains/Payments/docs/incident-retrospective.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/docs/incident-retrospective.mdx',
    data: { id: 'incident-retrospective', version: '1.0.0', title: 'Incident Retrospective Template' },
  },
  {
    id: 'domains/Payments/versioned/0.9.0/docs/runbooks/legacy-ops.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/versioned/0.9.0/docs/runbooks/legacy-ops.mdx',
    data: { id: 'legacy-ops', type: 'runbooks', version: '1.0.0', title: 'Legacy Operations' },
  },
  {
    id: 'domains/Payments/services/BillingService/docs/guides/on-call.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/services/BillingService/docs/guides/on-call.mdx',
    data: { id: 'on-call', type: 'guides', version: '1.0.0', title: 'On-call Guide' },
  },
  {
    id: 'domains/Payments/services/BillingService/events/InvoiceIssued/docs/reference/payload.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/services/BillingService/events/InvoiceIssued/docs/reference/payload.mdx',
    data: { id: 'payload', type: 'references', version: '1.0.0', title: 'Payload Contract' },
  },
  {
    id: 'domains/Unknown/docs/runbooks/ignored.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Unknown/docs/runbooks/ignored.mdx',
    data: { id: 'ignored', type: 'runbooks', version: '1.0.0', title: 'Ignored' },
  },
  {
    id: 'domains/Payments/docs/runbooks/hidden.mdx',
    collection: 'resourceDocs',
    filePath: 'domains/Payments/docs/runbooks/hidden.mdx',
    data: { id: 'hidden', type: 'runbooks', version: '1.0.0', title: 'Hidden', hidden: true },
  },
];

const mockResourceDocCategories = [
  {
    id: 'domains/Payments/docs/runbooks/_category_.json',
    collection: 'resourceDocCategories',
    filePath: 'domains/Payments/docs/runbooks/_category_.json',
    data: { label: 'Runbooks (Legacy)', position: 99 },
  },
  {
    id: 'domains/Payments/docs/runbooks/category.json',
    collection: 'resourceDocCategories',
    filePath: 'domains/Payments/docs/runbooks/category.json',
    data: { label: 'Runbooks', position: 2 },
  },
  {
    id: 'domains/Payments/docs/category.json',
    collection: 'resourceDocCategories',
    filePath: 'domains/Payments/docs/category.json',
    data: { label: 'General', position: 1 },
  },
  {
    id: 'domains/Payments/docs/reference/category.json',
    collection: 'resourceDocCategories',
    filePath: 'domains/Payments/docs/reference/category.json',
    data: { label: 'Reference', position: 3 },
  },
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'domains':
          return Promise.resolve(mockDomains as any[]);
        case 'services':
          return Promise.resolve(mockServices as any[]);
        case 'events':
          return Promise.resolve(mockEvents as any[]);
        case 'commands':
        case 'queries':
          return Promise.resolve([]);
        case 'resourceDocs':
          return Promise.resolve(mockResourceDocs as any[]);
        case 'resourceDocCategories':
          return Promise.resolve(mockResourceDocCategories as any[]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('resource-docs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.EVENTCATALOG_SCALE = 'true';
    delete process.env.EVENTCATALOG_STARTER;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('infers resource metadata from file paths and resolves latest/versioned resources', async () => {
    const docs = await getResourceDocs();

    expect(docs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'incident',
            type: 'runbooks',
            resourceCollection: 'domains',
            resourceId: 'Payments',
            resourceVersion: '1.0.0',
            latestVersion: '1.0.0',
            versions: ['1.0.0', '0.9.0'],
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'legacy-ops',
            type: 'runbooks',
            resourceCollection: 'domains',
            resourceId: 'Payments',
            resourceVersion: '0.9.0',
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'on-call',
            type: 'guides',
            resourceCollection: 'services',
            resourceId: 'BillingService',
            resourceVersion: '2.0.0',
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'payload',
            type: 'references',
            resourceCollection: 'events',
            resourceId: 'InvoiceIssued',
            resourceVersion: '3.0.0',
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'incident-retrospective',
            type: 'pages',
            resourceCollection: 'domains',
            resourceId: 'Payments',
            resourceVersion: '1.0.0',
          }),
        }),
      ])
    );

    // Unknown and hidden docs are skipped
    expect(docs.find((doc) => doc.data.id === 'ignored')).toBeUndefined();
    expect(docs.find((doc) => doc.data.id === 'hidden')).toBeUndefined();
  });

  it('returns docs by resource and groups docs by type alphabetically', async () => {
    const docsForDomain = await getResourceDocsForResource('domains', 'Payments', '1.0.0');

    expect(docsForDomain.map((doc) => doc.data.id)).toEqual(
      expect.arrayContaining(['incident', 'playbook', 'checklist', 'incident-retrospective'])
    );
    expect(docsForDomain.find((doc) => doc.data.id === 'legacy-ops')).toBeUndefined();

    const grouped = getGroupedResourceDocsByType(docsForDomain, { latestOnly: true });

    expect(grouped.map((group) => group.type)).toEqual(['pages', 'runbooks']);
    expect(grouped[0].docs.map((doc) => doc.data.id)).toEqual(['incident-retrospective']);
    expect(grouped[1].docs.map((doc) => doc.data.id)).toEqual(['playbook', 'incident', 'checklist']);
    expect(grouped[1].docs.map((doc) => doc.data.version)).toEqual(['1.0.0', '1.0.0', '1.0.0']);
    expect(grouped[1].docs.find((doc) => doc.data.id === 'playbook')?.data.order).toBe(1);
    expect(grouped[1].docs.find((doc) => doc.data.id === 'incident')?.data.order).toBe(2);
  });

  it('applies category metadata and prefers category.json over _category_.json', async () => {
    const categories = await getResourceDocCategories();
    const categoriesForDomain = categories.filter(
      (category) =>
        category.data.resourceCollection === 'domains' &&
        category.data.resourceId === 'Payments' &&
        category.data.resourceVersion === '1.0.0'
    );

    const docsForDomain = await getResourceDocsForResource('domains', 'Payments', '1.0.0');
    const grouped = getGroupedResourceDocsByType(docsForDomain, {
      latestOnly: true,
      categories: categoriesForDomain,
    });

    expect(grouped.map((group) => group.type)).toEqual(['pages', 'runbooks']);
    expect(grouped[0]).toMatchObject({
      type: 'pages',
      label: 'General',
      position: 1,
    });
    expect(grouped[1]).toMatchObject({
      type: 'runbooks',
      label: 'Runbooks',
      position: 2,
    });
  });

  it('matches categories with singular/plural type variants', () => {
    const grouped = getGroupedResourceDocsByType(
      [
        {
          id: '1',
          collection: 'resourceDocs',
          filePath: 'domains/Payments/docs/reference/payload.mdx',
          data: {
            id: 'payload',
            type: 'references',
            version: '1.0.0',
            title: 'Payload Contract',
            resourceCollection: 'domains',
            resourceId: 'Payments',
            resourceVersion: '1.0.0',
            versions: ['1.0.0'],
            latestVersion: '1.0.0',
          },
        } as any,
      ],
      {
        categories: [
          {
            id: 'cat-1',
            collection: 'resourceDocCategories',
            filePath: 'domains/Payments/docs/reference/category.json',
            data: {
              type: 'reference',
              label: 'Reference',
              resourceCollection: 'domains',
              resourceId: 'Payments',
              resourceVersion: '1.0.0',
            },
          } as any,
        ],
      }
    );

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      type: 'references',
      label: 'Reference',
    });
  });
});
