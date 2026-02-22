import { describe, expect, it } from 'vitest';
import { remarkResourceRef } from '../resource-ref';

type MdxElement = {
  type: 'mdxJsxTextElement';
  name: string;
  attributes: Array<{ type: string; name: string; value: string }>;
  children: Array<{ type: string; value: string }>;
};

const createTree = (value: string) => ({
  type: 'root',
  children: [
    {
      type: 'paragraph',
      children: [{ type: 'text', value }],
    },
  ],
});

const getResourceRefs = (node: any, refs: MdxElement[] = []): MdxElement[] => {
  if (node?.type === 'mdxJsxTextElement' && node?.name === 'ResourceRef') {
    refs.push(node as MdxElement);
  }

  if (Array.isArray(node?.children)) {
    node.children.forEach((child: any) => getResourceRefs(child, refs));
  }

  return refs;
};

const getAttributeValue = (node: MdxElement, name: string) => {
  return node.attributes.find((attr) => attr.name === name)?.value;
};

describe('remarkResourceRef', () => {
  it('transforms custom doc references with nested paths', () => {
    const tree = createTree('See [[doc|runbooks/oncall/intro]].');

    remarkResourceRef()(tree);

    const refs = getResourceRefs(tree);

    expect(refs).toHaveLength(1);
    expect(getAttributeValue(refs[0], 'type')).toBe('doc');
    expect(getAttributeValue(refs[0], 'version')).toBeUndefined();
    expect(refs[0].children[0].value).toBe('runbooks/oncall/intro');
  });

  it('preserves @ characters in doc references', () => {
    const tree = createTree('See [[doc|runbooks/oncall@v2]].');

    remarkResourceRef()(tree);

    const refs = getResourceRefs(tree);

    expect(refs).toHaveLength(1);
    expect(getAttributeValue(refs[0], 'type')).toBe('doc');
    expect(getAttributeValue(refs[0], 'version')).toBeUndefined();
    expect(refs[0].children[0].value).toBe('runbooks/oncall@v2');
  });

  it('keeps version parsing for existing resource references', () => {
    const tree = createTree('See [[service|OrdersService@1.2.3]].');

    remarkResourceRef()(tree);

    const refs = getResourceRefs(tree);

    expect(refs).toHaveLength(1);
    expect(getAttributeValue(refs[0], 'type')).toBe('service');
    expect(getAttributeValue(refs[0], 'version')).toBe('1.2.3');
    expect(refs[0].children[0].value).toBe('OrdersService');
  });
});
