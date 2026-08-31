import { getMDXComponentsByName, parseMdxBooleanProp } from '@utils/markdown';

describe('markdown', () => {
  describe('getMDXComponentsByName', () => {
    it('takes given markdown and returns the components and their props', () => {
      const markdown = `
        <SchemaViewer id="test" />
        <SchemaViewer id="test2" />
        <SchemaViewer/>
        `;
      const components = getMDXComponentsByName(markdown, 'SchemaViewer');
      expect(components).toEqual([{ id: 'test' }, { id: 'test2' }, {}]);
    });

    it('ignores components inside fenced code blocks and inline code', () => {
      const markdown = [
        '<ArchitectureGraph id="real" />',
        '```mdx',
        '<ArchitectureGraph id="example" />',
        '```',
        '~~~',
        '<ArchitectureGraph id="tilde-example" />',
        '~~~',
        'Use `<ArchitectureGraph id="inline" />` to embed the graph.',
      ].join('\n');
      const components = getMDXComponentsByName(markdown, 'ArchitectureGraph');
      expect(components).toEqual([{ id: 'real' }]);
    });
  });

  describe('parseMdxBooleanProp', () => {
    it('parses boolean and string boolean MDX props with defaults', () => {
      expect(parseMdxBooleanProp(undefined, true)).toBe(true);
      expect(parseMdxBooleanProp(undefined, false)).toBe(false);
      expect(parseMdxBooleanProp(true, false)).toBe(true);
      expect(parseMdxBooleanProp(false, true)).toBe(false);
      expect(parseMdxBooleanProp('true', false)).toBe(true);
      expect(parseMdxBooleanProp('false', true)).toBe(false);
    });
  });
});
