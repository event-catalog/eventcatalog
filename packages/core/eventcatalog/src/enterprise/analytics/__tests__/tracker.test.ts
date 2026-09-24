import { describe, it, expect } from 'vitest';
import { extractPageProperties, AnalyticsManager } from '../tracker';

describe('extractPageProperties', () => {
  it('extracts service doc page properties', () => {
    const result = extractPageProperties('/docs/services/OrderService/1.0.0');
    expect(result).toEqual({
      url: '/docs/services/OrderService/1.0.0',
      section: 'docs',
      resource_type: 'service',
      resource_id: 'OrderService',
      resource_version: '1.0.0',
    });
  });

  it('extracts event doc page properties', () => {
    const result = extractPageProperties('/docs/events/OrderCreated/2.1.0');
    expect(result).toEqual({
      url: '/docs/events/OrderCreated/2.1.0',
      section: 'docs',
      resource_type: 'event',
      resource_id: 'OrderCreated',
      resource_version: '2.1.0',
    });
  });

  it('extracts visualiser page properties', () => {
    const result = extractPageProperties('/visualiser/services/OrderService/1.0.0');
    expect(result).toEqual({
      url: '/visualiser/services/OrderService/1.0.0',
      section: 'visualiser',
      resource_type: 'service',
      resource_id: 'OrderService',
      resource_version: '1.0.0',
    });
  });

  it('extracts discover page properties', () => {
    const result = extractPageProperties('/discover/events');
    expect(result).toEqual({
      url: '/discover/events',
      section: 'discover',
      resource_type: 'event',
    });
  });

  it('extracts directory page properties', () => {
    const result = extractPageProperties('/directory/users');
    expect(result).toEqual({
      url: '/directory/users',
      section: 'directory',
    });
  });

  it('extracts schemas page properties', () => {
    const result = extractPageProperties('/schemas/explorer');
    expect(result).toEqual({
      url: '/schemas/explorer',
      section: 'schemas',
    });
  });

  it('extracts home page properties', () => {
    const result = extractPageProperties('/');
    expect(result).toEqual({
      url: '/',
      section: 'home',
    });
  });

  it('extracts custom docs page properties', () => {
    const result = extractPageProperties('/docs/custom/guides/getting-started');
    expect(result).toEqual({
      url: '/docs/custom/guides/getting-started',
      section: 'custom-docs',
    });
  });

  it('handles command pages', () => {
    const result = extractPageProperties('/docs/commands/CreateOrder/1.0.0');
    expect(result).toEqual({
      url: '/docs/commands/CreateOrder/1.0.0',
      section: 'docs',
      resource_type: 'command',
      resource_id: 'CreateOrder',
      resource_version: '1.0.0',
    });
  });

  it('handles domain pages', () => {
    const result = extractPageProperties('/docs/domains/Payment/1.0.0');
    expect(result).toEqual({
      url: '/docs/domains/Payment/1.0.0',
      section: 'docs',
      resource_type: 'domain',
      resource_id: 'Payment',
      resource_version: '1.0.0',
    });
  });

  it('handles URL-encoded resource IDs', () => {
    const result = extractPageProperties('/docs/services/Order%20Service/1.0.0');
    expect(result).toEqual({
      url: '/docs/services/Order%20Service/1.0.0',
      section: 'docs',
      resource_type: 'service',
      resource_id: 'Order Service',
      resource_version: '1.0.0',
    });
  });

  it('handles unknown pages', () => {
    const result = extractPageProperties('/some/unknown/page');
    expect(result).toEqual({
      url: '/some/unknown/page',
      section: 'other',
    });
  });
});

describe('AnalyticsManager', () => {
  it('calls track on all registered adapters', () => {
    const manager = new AnalyticsManager();
    const calls: string[] = [];

    manager.register({
      name: 'test1',
      track: (event) => calls.push(`test1:${event}`),
      pageView: () => {},
    });
    manager.register({
      name: 'test2',
      track: (event) => calls.push(`test2:${event}`),
      pageView: () => {},
    });

    manager.track('catalog.page.view', { section: 'docs' });

    expect(calls).toEqual(['test1:catalog.page.view', 'test2:catalog.page.view']);
  });

  it('calls pageView on all registered adapters', () => {
    const manager = new AnalyticsManager();
    const calls: string[] = [];

    manager.register({
      name: 'test1',
      track: () => {},
      pageView: (url) => calls.push(`test1:${url}`),
    });

    manager.pageView('/docs/services/OrderService/1.0.0', { section: 'docs' });

    expect(calls).toEqual(['test1:/docs/services/OrderService/1.0.0']);
  });

  it('silently catches adapter errors', () => {
    const manager = new AnalyticsManager();
    const calls: string[] = [];

    manager.register({
      name: 'broken',
      track: () => {
        throw new Error('broken');
      },
      pageView: () => {},
    });
    manager.register({
      name: 'working',
      track: (event) => calls.push(event),
      pageView: () => {},
    });

    manager.track('test.event');

    expect(calls).toEqual(['test.event']);
  });

  it('logs events when debug is enabled', () => {
    const manager = new AnalyticsManager({ debug: true });
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => logs.push(args[0]);

    manager.track('test.event', { key: 'value' });
    manager.pageView('/test', { section: 'docs' });

    console.log = originalLog;

    expect(logs).toContain('[EventCatalog Analytics] track: test.event');
    expect(logs).toContain('[EventCatalog Analytics] pageView: /test');
  });
});
