import { getMDXComponentsByName } from '@utils/markdown';

describe('markdown', () => {
  describe('getMDXComponentsByName', () => {
    it('takes given markdown and returns the components and their props', () => {
      const markdown = `
        <SchemaViewer id="test" />
        <SchemaViewer id="test2" />
        `;
      const components = getMDXComponentsByName(markdown, 'SchemaViewer');
      console.log('components', components);
      expect(components).toEqual([{ id: 'test' }, { id: 'test2' }]);
    });
  });
});
