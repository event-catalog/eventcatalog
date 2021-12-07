import plugin from '../index'
import type { LoadContext, PluginOptions } from '@eventcatalogtest/types'

import path from 'path'
import fs from 'fs-extra'

declare global {
  namespace jest {
    interface Matchers<R> {
      markdownToMatch(expected: string): R
    }
  }
}

let PROJECT_DIR: any

const pluginContext: LoadContext = {
  //@ts-ignore
  eventCatalogConfig: {},
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
    fs.rmdirSync(path.join(__dirname, 'tmp'), { recursive: true })
  })

  describe('plugin', () => {
    it('throws an error when no file has been provided to load within the plugin', async () => {
      //@ts-ignore
      const options: PluginOptions = { file: undefined }

      await expect(plugin(pluginContext, options)).rejects.toThrow('No file provided in plugin.')
    })

    it('throws an error when file has been provided but the file cannot be found', async () => {
      //@ts-ignore
      const options: PluginOptions = { file: path.join(__dirname, 'random-location') }

      await expect(plugin(pluginContext, options)).rejects.toThrow(
        'Failed to read file with provided path'
      )
    })

    it('throws an error when failing to parse AsyncAPI file', async () => {
      const options: PluginOptions = { file: path.join(__dirname, './assets/invalid-asyncapi.yml') }
      await expect(plugin(pluginContext, options)).rejects.toThrow(
        'There were errors validating the AsyncAPI document.'
      )
    })

    it('succesfully takes a valid asyncapi file and creates the expected services and events markdown files from it', async () => {
      const options: PluginOptions = { file: path.join(__dirname, './assets/valid-asyncapi.yml') }
      await plugin(pluginContext, options)

      // just wait for files to be there in time.
      await new Promise((r) => setTimeout(r, 200))

      const generatedEventMarkdownFile = fs.readFileSync(
        // @ts-ignore
        path.join(process.env.PROJECT_DIR, 'events', 'UserSignedUp', 'index.md'),
        { encoding: 'utf-8' }
      )
      const generatedServiceMarkdownFile = fs.readFileSync(
        // @ts-ignore
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
  })
})
