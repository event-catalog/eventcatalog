// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import SchemaDetailsPanel from '../SchemaDetailsPanel';
import type { SchemaItem } from '../types';

// The test config aliases `@eventcatalog` to the catalog config, so the visualiser package can't load here.
vi.mock('../SchemaGraph', () => ({ default: () => null }));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const message: SchemaItem = {
  collection: 'events',
  data: { id: 'order-created', name: 'Order Created', version: '1.0.0' },
  schemaContent: JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } } }),
  schemaExtension: 'json',
};

const renderedExamples = <div data-testid="rendered-examples">Create an order with the SDK</div>;

const panel = (
  <SchemaDetailsPanel
    message={message}
    availableVersions={[message]}
    selectedVersion="1.0.0"
    onVersionChange={() => {}}
    renderedExamples={renderedExamples}
  />
);

const roots: Root[] = [];
function render(element: React.ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(element));
  return container;
}

afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.innerHTML = '';
});

describe('SchemaDetailsPanel', () => {
  // Astro moves island slots that are missing from the server HTML into a <template>.
  // Any island script inside that template never runs, which stops every island on the page hydrating.
  it('includes the server-rendered examples in the server HTML when another tab is active', () => {
    const html = renderToString(panel);

    expect(html).toContain('Create an order with the SDK');
  });

  it('shows the server-rendered examples only while the examples tab is selected', () => {
    const container = render(panel);
    const examples = container.querySelector<HTMLElement>('[data-testid="rendered-examples"]')!;

    expect(examples.closest<HTMLElement>('[hidden]')).not.toBeNull();

    const examplesTab = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Examples')!;
    act(() => examplesTab.click());

    expect(container.querySelector('[data-testid="rendered-examples"]')).toBe(examples);
    expect(examples.closest<HTMLElement>('[hidden]')).toBeNull();
  });
});
