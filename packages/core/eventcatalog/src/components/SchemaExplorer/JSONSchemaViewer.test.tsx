// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JSONSchemaViewer from './JSONSchemaViewer';

const constraintOnlyVariantSchema = {
  type: 'object',
  properties: {
    detail: { $ref: '#/$defs/detail' },
  },
  $defs: {
    detail: {
      type: 'object',
      properties: {
        data: { $ref: '#/$defs/data' },
      },
    },
    data: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        customerId: { type: 'string' },
        correlationId: { type: 'string' },
      },
      required: ['correlationId'],
      oneOf: [
        {
          title: 'Authenticated user',
          required: ['userId'],
          not: { required: ['customerId'] },
        },
        {
          title: 'Customer account',
          required: ['customerId'],
          not: { required: ['userId'] },
        },
      ],
    },
  },
};

describe('JSONSchemaViewer variants', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders parent properties selected by constraint-only oneOf branches', () => {
    act(() => {
      root.render(createElement(JSONSchemaViewer, { schema: constraintOnlyVariantSchema, expand: true, search: false }));
    });

    expect(container.textContent).toContain('Authenticated user');
    expect(container.textContent).toContain('userId');
    expect(container.textContent).not.toContain('customerId');
    expect(container.textContent).toContain('correlationId');

    const selector = container.querySelector<HTMLSelectElement>('select');
    expect(selector).not.toBeNull();

    act(() => {
      selector!.value = '1';
      selector!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('customerId');
    expect(container.textContent).not.toContain('userId');
    expect(container.textContent).toContain('correlationId');
  });

  it('applies constraint-only oneOf branches at the schema root', () => {
    const rootSchema = constraintOnlyVariantSchema.$defs.data;

    act(() => {
      root.render(createElement(JSONSchemaViewer, { schema: rootSchema, expand: true, search: false }));
    });

    expect(container.textContent).toContain('userId');
    expect(container.textContent).not.toContain('customerId');
    expect(container.textContent).toContain('correlationId');
  });

  it('does not render array item parent properties twice when variants are present', () => {
    const arraySchema = {
      type: 'object',
      properties: {
        identities: {
          type: 'array',
          items: constraintOnlyVariantSchema.$defs.data,
        },
      },
    };

    act(() => {
      root.render(createElement(JSONSchemaViewer, { schema: arraySchema, expand: true, search: false }));
    });

    expect(container.textContent?.match(/userId/g)).toHaveLength(1);
    expect(container.textContent).not.toContain('customerId');
    expect(container.textContent?.match(/correlationId/g)).toHaveLength(1);
  });
});
