import { describe, expect, it } from 'vitest';
import { mermaid, parseMermaidMeta, buildControlAttributes } from '../mermaid';

const createTree = (value: string, meta?: string) => ({
  type: 'root',
  children: [{ type: 'code', lang: 'mermaid', meta, value }],
});

const transform = (value: string, meta?: string) => {
  const tree = createTree(value, meta);
  // @ts-ignore - plugin only needs the tree
  mermaid()(tree);
  return tree.children[0] as unknown as { type: string; value: string };
};

describe('remark mermaid plugin', () => {
  describe('parseMermaidMeta', () => {
    it('returns no options when meta is empty', () => {
      expect(parseMermaidMeta(undefined)).toEqual({});
      expect(parseMermaidMeta('')).toEqual({});
    });

    it('parses placement with double or single quotes', () => {
      expect(parseMermaidMeta('placement="top-left"')).toEqual({ placement: 'top-left' });
      expect(parseMermaidMeta("placement='bottom-right'")).toEqual({ placement: 'bottom-right' });
    });

    it('ignores invalid placements', () => {
      expect(parseMermaidMeta('placement="middle"')).toEqual({});
    });

    it('parses actions in JSX or plain form', () => {
      expect(parseMermaidMeta('actions={false}')).toEqual({ actions: false });
      expect(parseMermaidMeta('actions={true}')).toEqual({ actions: true });
      expect(parseMermaidMeta('actions=false')).toEqual({ actions: false });
    });

    it('parses both options together', () => {
      expect(parseMermaidMeta('placement="top-left" actions={true}')).toEqual({ placement: 'top-left', actions: true });
    });
  });

  describe('buildControlAttributes', () => {
    it('returns an empty string when no options are set', () => {
      expect(buildControlAttributes({})).toBe('');
    });

    it('builds data attributes for the set options', () => {
      expect(buildControlAttributes({ placement: 'bottom-left' })).toBe(' data-placement="bottom-left"');
      expect(buildControlAttributes({ actions: false })).toBe(' data-actions="false"');
      expect(buildControlAttributes({ placement: 'top-right', actions: true })).toBe(
        ' data-placement="top-right" data-actions="true"'
      );
    });
  });

  describe('plugin', () => {
    it('converts mermaid code blocks into html with escaped content', () => {
      const node = transform('graph LR\n  A --> B');
      expect(node.type).toBe('html');
      expect(node.value).toContain('class="mermaid');
      expect(node.value).toContain('data-content="graph LR\n  A --&gt; B"');
      expect(node.value).not.toContain('data-placement');
      expect(node.value).not.toContain('data-actions');
    });

    it('adds placement and actions data attributes from the code fence meta', () => {
      const node = transform('graph LR\n  A --> B', 'placement="top-left" actions={false}');
      expect(node.value).toContain('data-placement="top-left"');
      expect(node.value).toContain('data-actions="false"');
    });

    it('leaves non-mermaid code blocks untouched', () => {
      const tree = { type: 'root', children: [{ type: 'code', lang: 'js', value: 'const a = 1;' }] };
      // @ts-ignore
      mermaid()(tree);
      expect(tree.children[0].type).toBe('code');
    });
  });
});
