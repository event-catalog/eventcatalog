// @ts-nocheck
import plugin from '../index'
import type { LoadContext } from '@eventcatalogtest/types'

import path from 'path'
import fs from 'fs-extra'
import YAML from 'yamljs'

import type { AsyncAPIPluginOptions } from '../types'

declare global {
  namespace jest {
    interface Matchers<R> {
      markdownToMatch(expected: string): R
    }
  }
}

let PROJECT_DIR: any

const pluginContext: LoadContext = {
  eventCatalogConfig: {},
}

export const buildMarkdownFile = (frontmatterObject: any, markdown: string) => {
  return `---
${YAML.stringify(frontmatterObject)}---
${markdown}`
}

describe('eventcatalog-plugin-generator-asyncapi', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR
    process.env.PROJECT_DIR = path.join(__dirname, 'tmp')
  })

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR
  })

  afterEach(() => {
    try {
      fs.rmdirSync(path.join(__dirname, 'tmp'), { recursive: true })
    } catch (error) {
      console.log('Nothing to remove')
    }
  })

  describe('plugin', () => {
    it('throws an error when no file has been provided to load within the plugin', async () => {
      const options: AsyncAPIPluginOptions = { spec: undefined }

      await expect(plugin(pluginContext, options)).rejects.toThrow('No file provided in plugin.')
    })

    it('throws an error when file has been provided but the file cannot be found', async () => {
      const options: AsyncAPIPluginOptions = { spec: path.join(__dirname, 'random-location') }

      await expect(plugin(pluginContext, options)).rejects.toThrow(
        'Failed to read file with provided path'
      )
    })

    it('throws an error when failing to parse AsyncAPI file', async () => {
      const options: AsyncAPIPluginOptions = {
        spec: path.join(__dirname, './assets/invalid-asyncapi.yml'),
      }
      await expect(plugin(pluginContext, options)).rejects.toThrow(
        'There were errors validating the AsyncAPI document.'
      )
    })

    it('succesfully takes a valid asyncapi file and creates the expected services and events markdown files from it', async () => {
      const options: AsyncAPIPluginOptions = {
        spec: path.join(__dirname, './assets/valid-asyncapi.yml'),
      }
      await plugin(pluginContext, options)

      // just wait for files to be there in time.
      await new Promise((r) => setTimeout(r, 200))

      const generatedEventMarkdownFile = fs.readFileSync(
        path.join(process.env.PROJECT_DIR, 'events', 'UserSignedUp', 'index.md'),
        { encoding: 'utf-8' }
      )
      const generatedServiceMarkdownFile = fs.readFileSync(
        path.join(process.env.PROJECT_DIR, 'services', 'Account Service', 'index.md'),
        { encoding: 'utf-8' }
      )

      expect(generatedEventMarkdownFile).markdownToMatch(`
        ---
          name: UserSignedUp
          summary: null
          version: 1.0.0
          producers:
              - 'Account Service'
          consumers: []
        ---

        <Mermaid />`)

      expect(generatedServiceMarkdownFile).markdownToMatch(
        `---
          id: 'Account Service'
          name: 'Account Service'
          summary: 'This service is in charge of processing user signups'
          ---

          <Mermaid />`
      )
    })

    describe('plugin options', () => {
      it('when `merge` is set to true it will overwrite the frontmatter of the markdown files but leave the markdown body as it was', async () => {
        // Setup and write the file there...

        const eventFile = buildMarkdownFile(
          { name: 'UserSignedUp', version: '10.0.0' },
          '# Hello World'
        )

        const serviceFile = buildMarkdownFile(
          { name: 'Account Service', version: '10.0.0' },
          '# Hello World'
        )

        fs.ensureFileSync(path.join(process.env.PROJECT_DIR, 'events', 'UserSignedUp', 'index.md'))
        fs.writeFileSync(
          path.join(process.env.PROJECT_DIR, 'events', 'UserSignedUp', 'index.md'),
          eventFile
        )

        fs.ensureFileSync(
          path.join(process.env.PROJECT_DIR, 'services', 'Account Service', 'index.md')
        )
        fs.writeFileSync(
          path.join(process.env.PROJECT_DIR, 'services', 'Account Service', 'index.md'),
          serviceFile
        )

        const options: AsyncAPIPluginOptions = {
          spec: path.join(__dirname, './assets/valid-asyncapi.yml'),
          merge: true,
        }

        await plugin(pluginContext, options)

        // just wait for files to be there in time.
        await new Promise((r) => setTimeout(r, 200))

        const generatedEventMarkdownFile = fs.readFileSync(
          path.join(process.env.PROJECT_DIR, 'events', 'UserSignedUp', 'index.md'),
          { encoding: 'utf-8' }
        )

        expect(generatedEventMarkdownFile).markdownToMatch(`
        ---
          name: UserSignedUp
          summary: null
          version: 1.0.0
          producers:
              - 'Account Service'
          consumers: []
        ---
        # Hello World
        `)

        const generatedServiceMarkdownFile = fs.readFileSync(
          path.join(process.env.PROJECT_DIR, 'services', 'Account Service', 'index.md'),
          { encoding: 'utf-8' }
        )

        expect(generatedServiceMarkdownFile).markdownToMatch(`
        ---
          id: 'Account Service'
          name: 'Account Service'
          summary: 'This service is in charge of processing user signups'
        ---
        # Hello World
        `)
      })
    })
  })
})
