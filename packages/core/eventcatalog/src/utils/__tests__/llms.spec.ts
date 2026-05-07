import { filterMarkdownForAgents, filterMarkdownForAudience } from '@utils/llms';

describe('llms', () => {
  describe('filterMarkdownForAudience', () => {
    it('keeps agent visibility content and removes human visibility content for markdown endpoints', () => {
      const markdown = `---
id: OrderCreated
---

# Order Created

<Visibility for="humans">
Click the **Create order** button in the UI.
</Visibility>

Shared content.

<Visibility for="agents">
Call \`POST /orders\` with a valid order payload.
</Visibility>
`;

      expect(filterMarkdownForAgents(markdown)).toBe(`---
id: OrderCreated
---

# Order Created

Shared content.

Call \`POST /orders\` with a valid order payload.`);
    });

    it('supports single quoted and expression quoted visibility props', () => {
      const markdown = `<Visibility for='agents'>
Agent content
</Visibility>

<Visibility for={"humans"}>
Human content
</Visibility>`;

      expect(filterMarkdownForAudience(markdown, 'humans')).toBe('Human content');
    });

    it('does not change markdown when no visibility components are present', () => {
      const markdown = `# Plain docs

Content with source formatting preserved.

`;

      expect(filterMarkdownForAgents(markdown)).toBe(markdown);
    });
  });
});
