// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
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

const render = (schema: any) => {
  act(() => {
    root.render(createElement(JSONSchemaViewer, { schema, expand: true, search: false }));
  });
};

const selectVariant = (index: number) => {
  const selector = container.querySelector<HTMLSelectElement>('select');
  act(() => {
    selector!.value = String(index);
    selector!.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

describe('JSONSchemaViewer variants', () => {
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

  it('names the expand toggle of a nested property after the property', () => {
    act(() => {
      root.render(createElement(JSONSchemaViewer, { schema: constraintOnlyVariantSchema, expand: false, search: false }));
    });

    const toggle = container.querySelector('.property-toggle');
    expect(toggle?.getAttribute('aria-label')).toBe('Toggle detail');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('JSONSchemaViewer additionalProperties', () => {
  const typedMapSchema = {
    type: 'object',
    properties: {
      fields: {
        type: 'object',
        additionalProperties: { $ref: '#/$defs/FieldSpec' },
      },
    },
    additionalProperties: false,
    $defs: {
      FieldSpec: {
        type: 'object',
        properties: { type: { type: 'string' }, optional: { type: 'boolean' } },
      },
    },
  };

  it('shows a property whose additionalProperties is a $ref as a map of that definition', () => {
    render(typedMapSchema);

    expect(container.textContent).toContain('map<string, FieldSpec>');
  });

  it('lets the reader expand a typed map to see the properties of its values', () => {
    render(typedMapSchema);

    const toggle = container.querySelector('[aria-label="Toggle fields"]');
    expect(toggle).not.toBeNull();
    expect(container.textContent).toContain('[key: string]');
    expect(container.textContent).toContain('optional');
  });

  it('tells the reader the root object does not allow additional properties', () => {
    render(typedMapSchema);

    expect(container.textContent).toContain('Additional properties: not allowed');
  });

  it('tells the reader a nested object does not allow additional properties', () => {
    render({
      type: 'object',
      properties: {
        address: { type: 'object', properties: { street: { type: 'string' } }, additionalProperties: false },
      },
    });

    expect(container.textContent).toContain('Additional properties: not allowed');
  });

  it('does not mark objects that allow additional properties as closed', () => {
    render({
      type: 'object',
      properties: { address: { type: 'object', properties: { street: { type: 'string' } } } },
      additionalProperties: true,
    });

    expect(container.textContent).not.toContain('not allowed');
  });

  it('shows the value type of a map of primitives without an expand toggle', () => {
    render({
      type: 'object',
      properties: { labels: { type: 'object', additionalProperties: { type: 'string' } } },
    });

    expect(container.textContent).toContain('map<string, string>');
    expect(container.querySelector('[aria-label="Toggle labels"]')).toBeNull();
  });

  it('renders the value schema of a root schema that is only a map', () => {
    render({
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: { price: { type: 'number' } },
      },
    });

    expect(container.textContent).toContain('[key: string]');
    expect(container.textContent).toContain('price');
    expect(container.textContent).not.toContain('Schema does not contain any properties');
  });

  it('renders a recursive map without overflowing the stack', () => {
    render({
      type: 'object',
      properties: { tree: { $ref: '#/$defs/Node' } },
      $defs: {
        Node: {
          type: 'object',
          properties: { name: { type: 'string' } },
          additionalProperties: { $ref: '#/$defs/Node' },
        },
      },
    });

    expect(container.textContent).toContain('tree');
    expect(container.textContent).toContain('circular');
  });

  it('shows the item type of a map whose values are arrays', () => {
    render({
      type: 'object',
      properties: { tags: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } } },
    });

    expect(container.textContent).toContain('map<string, array[string]>');
  });

  it('keeps null in the label of a nullable map', () => {
    render({
      type: 'object',
      properties: { labels: { type: ['object', 'null'], additionalProperties: { type: 'string' } } },
    });

    expect(container.textContent).toContain('map<string, string> | null');
  });

  it('shows a map of plain values next to the named properties of an object', () => {
    render({
      type: 'object',
      properties: {
        totals: { type: 'object', properties: { id: { type: 'string' } }, additionalProperties: { type: 'number' } },
      },
    });

    expect(container.textContent).toContain('[key: string]number');
  });

  it('keeps the other types of a map that also accepts a primitive', () => {
    render({
      type: 'object',
      properties: { value: { type: ['object', 'string'], additionalProperties: { type: 'number' } } },
    });

    expect(container.textContent).toContain('map<string, number> | string');
  });

  it('renders the value schema of maps inside an array', () => {
    render({
      type: 'object',
      properties: {
        batches: {
          type: 'array',
          items: { type: 'object', additionalProperties: { type: 'object', properties: { price: { type: 'number' } } } },
        },
      },
    });

    expect(container.querySelector('[aria-label="Toggle batches"]')).not.toBeNull();
    expect(container.textContent).toContain('array[map<string, object>]');
    expect(container.textContent).toContain('price');
  });

  it('tells the reader array items do not allow additional properties', () => {
    render({
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: { type: 'object', properties: { sku: { type: 'string' } }, additionalProperties: false },
        },
      },
    });

    expect(container.textContent).toContain('Additional properties: not allowed');
  });

  it('renders the value schema of a root array of maps', () => {
    render({
      type: 'array',
      items: { type: 'object', additionalProperties: { type: 'object', properties: { price: { type: 'number' } } } },
    });

    expect(container.textContent).toContain('[key: string]');
    expect(container.textContent).toContain('price');
    expect(container.textContent).not.toContain('This array contains items of type');
  });

  it('renders the map value and closed note of the selected root variant', () => {
    render({
      oneOf: [
        { title: 'Closed', type: 'object', properties: { id: { type: 'string' } }, additionalProperties: false },
        { title: 'Map', type: 'object', additionalProperties: { type: 'object', properties: { price: { type: 'number' } } } },
      ],
    });

    expect(container.textContent).toContain('Additional properties: not allowed');
    expect(container.textContent).not.toContain('price');

    selectVariant(1);

    expect(container.textContent).not.toContain('not allowed');
    expect(container.textContent).toContain('[key: string]');
    expect(container.textContent).toContain('price');
  });

  it('renders the map value and closed note of the selected variant of a property', () => {
    render({
      type: 'object',
      properties: {
        payload: {
          oneOf: [
            { title: 'Closed', type: 'object', properties: { id: { type: 'string' } }, additionalProperties: false },
            { title: 'Map', type: 'object', additionalProperties: { type: 'object', properties: { price: { type: 'number' } } } },
          ],
        },
      },
    });

    expect(container.textContent).toContain('Additional properties: not allowed');

    selectVariant(1);

    expect(container.textContent).toContain('price');
  });

  it('renders the map value of the selected variant of array items', () => {
    render({
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            oneOf: [
              {
                title: 'Map',
                type: 'object',
                additionalProperties: { type: 'object', properties: { price: { type: 'number' } } },
              },
            ],
          },
        },
      },
    });

    expect(container.textContent).toContain('price');
  });

  it('keeps additionalProperties from an allOf schema', () => {
    render({
      type: 'object',
      properties: {
        fields: {
          allOf: [{ description: 'Field specs' }],
          type: 'object',
          additionalProperties: { $ref: '#/$defs/FieldSpec' },
        },
        closed: {
          allOf: [{ type: 'object', properties: { id: { type: 'string' } }, additionalProperties: false }],
        },
      },
      $defs: { FieldSpec: { type: 'object', properties: { optional: { type: 'boolean' } } } },
    });

    expect(container.textContent).toContain('map<string, FieldSpec>');
    expect(container.textContent).toContain('optional');
    expect(container.textContent).toContain('Additional properties: not allowed');
  });

  it('resolves a $ref map value on a schema with oneOf', () => {
    render({
      type: 'object',
      properties: {
        fields: {
          oneOf: [{ title: 'A', type: 'object' }],
          additionalProperties: { $ref: '#/$defs/FieldSpec' },
        },
      },
      $defs: { FieldSpec: { type: 'object', properties: { optional: { type: 'boolean' } } } },
    });

    expect(container.textContent).toContain('FieldSpec');
    expect(container.textContent).toContain('optional');
  });
});

describe('JSONSchemaViewer self-references', () => {
  it('renders a schema that refers to itself through properties without overflowing the stack', () => {
    render({
      type: 'object',
      properties: { root: { $ref: '#/$defs/Category' } },
      $defs: {
        Category: {
          type: 'object',
          properties: { name: { type: 'string' }, parent: { $ref: '#/$defs/Category' } },
        },
      },
    });

    expect(container.textContent).toContain('parent');
    expect(container.textContent).toContain('circular');
  });

  it('does not mark a definition used by two sibling properties as circular', () => {
    render({
      type: 'object',
      properties: { billing: { $ref: '#/$defs/Address' }, shipping: { $ref: '#/$defs/Address' } },
      $defs: { Address: { type: 'object', properties: { street: { type: 'string' } } } },
    });

    expect(container.textContent?.match(/street/g)).toHaveLength(2);
    expect(container.textContent).not.toContain('circular');
  });
});

describe('JSONSchemaViewer search', () => {
  it('searches for text that is not a valid regular expression without throwing', () => {
    // jsdom does not implement scrollIntoView, which the search uses to show the current match
    Element.prototype.scrollIntoView = vi.fn();
    onTestFinished(() => {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    act(() => {
      root.render(
        createElement(JSONSchemaViewer, {
          schema: { type: 'object', additionalProperties: { type: 'object', properties: { price: { type: 'number' } } } },
          expand: true,
        })
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[placeholder="Search properties..."]')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;

    expect(() =>
      act(() => {
        setValue.call(input, '[key');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })
    ).not.toThrow();
    expect(container.textContent).toContain('1 of 1 match');
  });
});
