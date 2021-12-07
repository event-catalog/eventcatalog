import { buildEventMarkdownFile, buildServiceMarkdownFile } from '../markdown-builder'

describe('markdown-builder', () => {
  describe('buildEventMarkdownFile', () => {
    it('takes the given event and returns the correct frontmatter and markdown', () => {
      const event = {
        name: 'Test Event',
        summary: 'My test event',
        version: '1.0',
        consumers: ['Application API'],
        producers: ['Customer Portal'],
      }
      const result = buildEventMarkdownFile(event)

      expect(result).toEqual(`---
name: 'Test Event'
summary: 'My test event'
version: '1.0'
consumers:
    - 'Application API'
producers:
    - 'Customer Portal'
---
<Mermaid />`)
    })
  })

  describe('buildServiceMarkdownFile', () => {
    it('takes the given service and returns the correct frontmatter and markdown', () => {
      const service = {
        id: 'Test Service',
        name: 'Test Service',
        summary: 'My service',
        version: '1.0',
      }
      const result = buildServiceMarkdownFile(service)

      expect(result).toEqual(`---
id: 'Test Service'
name: 'Test Service'
summary: 'My service'
version: '1.0'
---
<Mermaid />`)
    })
  })
})
