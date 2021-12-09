import { buildMarkdownFile } from '../markdown-builder'

describe('markdown-builder', () => {
  describe('buildMarkdownFile', () => {
    it('takes the given front matter object and returns the correct frontmatter and markdown', () => {
      const event = {
        name: 'Test Event',
        summary: 'My test event',
        version: '1.0',
        consumers: ['Application API'],
        producers: ['Customer Portal'],
      }
      const result = buildMarkdownFile({ frontMatterObject: event })

      expect(result).toMatchMarkdown(`
        ---
        name: 'Test Event'
        summary: 'My test event'
        version: '1.0'
        consumers:
            - 'Application API'
        producers:
            - 'Customer Portal'
        ---
        <Mermaid />
      `)
    })

    it('uses the `customContent` when its provided and does not generate default markdown body content', () => {
      const event = {
        name: 'Test Event',
        summary: 'My test event',
        version: '1.0',
        consumers: ['Application API'],
        producers: ['Customer Portal'],
      }
      const result = buildMarkdownFile({
        frontMatterObject: event,
        customContent: '# My custom content',
      })

      expect(result).toMatchMarkdown(`
        ---
        name: 'Test Event'
        summary: 'My test event'
        version: '1.0'
        consumers:
            - 'Application API'
        producers:
            - 'Customer Portal'
        ---
        # My custom content
      `)
    })
  })
})
