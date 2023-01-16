/* eslint-disable no-unused-vars */
/* eslint-disable no-promise-executor-return */
// @ts-nocheck
import type { LoadContext } from '@eventcatalog/types';
import utils from '@eventcatalog/utils';

import path from 'path';
import fs from 'fs-extra';
import YAML from 'yamljs';
import plugin from '../index';

import type { AsyncAPIPluginOptions } from '../types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchMarkdown(expect: string): R;
    }
  }
}

let PROJECT_DIR: any;

const pluginContext: LoadContext = {
  eventCatalogConfig: {},
};

// eslint-disable-next-line import/prefer-default-export
export const buildMarkdownFile = (frontmatterObject: any, markdown: string) => `---
${YAML.stringify(frontmatterObject)}---
${markdown}`;

describe('eventcatalog-plugin-generator-asyncapi', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR;
    process.env.PROJECT_DIR = path.join(__dirname, 'tmp');
  });

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR;
  });

  afterEach(() => {
    try {
      fs.rmdirSync(path.join(__dirname, 'tmp'), { recursive: true });
    } catch (error) {
      console.log('Nothing to remove');
    }
  });

  describe('plugin', () => {
    it('throws an error when no file has been provided to load within the plugin', async () => {
      const options: AsyncAPIPluginOptions = { pathToSpec: undefined };

      await expect(plugin(pluginContext, options)).rejects.toThrow('No file provided in plugin.');
    });

    it('throws an error when file has been provided but the file cannot be found', async () => {
      const options: AsyncAPIPluginOptions = { pathToSpec: path.join(__dirname, 'random-location') };

      await expect(plugin(pluginContext, options)).rejects.toThrow('Failed to read file with provided path');
    });

    it('throws an error when failing to parse AsyncAPI file', async () => {
      const options: AsyncAPIPluginOptions = {
        pathToSpec: path.join(__dirname, './assets/invalid-asyncapi.yml'),
      };
      await expect(plugin(pluginContext, options)).rejects.toThrow('There were errors validating the AsyncAPI document.');
    });

    it('successfully takes a valid asyncapi file and creates the expected services and events markdown files from it', async () => {
      const options: AsyncAPIPluginOptions = {
        pathToSpec: path.join(__dirname, './assets/valid-asyncapi.yml'),
      };

      await plugin(pluginContext, options);

      // just wait for files to be there in time.
      await new Promise((r) => setTimeout(r, 200));

      const { getEventFromCatalog, getServiceFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

      const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
      const { raw: serviceFile } = getServiceFromCatalog('Account Service');

      expect(eventFile).toMatchMarkdown(`
        ---
          name: UserSignedUp
          summary: null
          version: 1.0.0
          producers:
              - 'Account Service'
          consumers: []
          externalLinks: []
          badges: []
        ---

        <NodeGraph />
        <Schema />
        `);

      expect(serviceFile).toMatchMarkdown(
        `---
          name: 'Account Service'
          summary: 'This service is in charge of processing user signups'
          ---

          <NodeGraph />`
      );
    });

    describe('multiple asyncapi files', () => {
      it('successfully takes multiple valid asyncapi files and creates the expected services and events markdown files from it', async () => {
        const options: AsyncAPIPluginOptions = {
          pathToSpec: [
            path.join(__dirname, './assets/valid-asyncapi.yml'),
            path.join(__dirname, './assets/valid-asyncapi-2.yml'),
          ],
        };

        await plugin(pluginContext, options);

        // just wait for files to be there in time.
        await new Promise((r) => setTimeout(r, 200));

        const { getEventFromCatalog, getServiceFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

        const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
        const { raw: serviceFile } = getServiceFromCatalog('Account Service');
        const { raw: userServiceFile } = getServiceFromCatalog('Users Service');

        expect(eventFile).toMatchMarkdown(`
          ---
            name: UserSignedUp
            summary: null
            version: 1.0.0
            producers:
              - 'Users Service'
              - 'Account Service'
            consumers: []
            externalLinks: []
            badges: []
          ---
  
          <NodeGraph />
          <Schema />
          `);

        expect(serviceFile).toMatchMarkdown(
          `---
            name: 'Account Service'
            summary: 'This service is in charge of processing user signups'
            ---
  
            <NodeGraph />`
        );
        expect(userServiceFile).toMatchMarkdown(
          `---
            name: 'Users Service'
            summary: 'This service is in charge of users'
            ---
  
            <NodeGraph />`
        );
      });
    });

    describe('plugin options', () => {
      describe('versionEvents', () => {
        it('when versionEvents is true, all previous matching events will be versioned before writing the event to the catalog', async () => {
          const options: AsyncAPIPluginOptions = {
            pathToSpec: path.join(__dirname, './assets/valid-asyncapi.yml'),
            versionEvents: true,
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { path: eventPath } = await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
          });

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          // Check the version has been set
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'schema.json'))).toEqual(true);

          expect(fs.existsSync(path.join(eventPath, 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'schema.json'))).toEqual(true);

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers:
                  - 'Account Service'
              consumers: []
              externalLinks: []
              badges: []
            ---

            <NodeGraph />
            <Schema />
            `);
        });

        it('when versionEvents is true and the events and services already have markdown content, that content is used for the new events and services being created', async () => {
          const options: AsyncAPIPluginOptions = {
            pathToSpec: path.join(__dirname, './assets/valid-asyncapi.yml'),
            versionEvents: true,
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
            markdownContent: '# Content that already exists',
          });

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers:
                  - 'Account Service'
              consumers: []
              externalLinks: []
              badges: []
            ---
            # Content that already exists
            `);
        });

        it('when versionEvents is false, all previous matching events will be overriden', async () => {
          const options: AsyncAPIPluginOptions = {
            pathToSpec: path.join(__dirname, './assets/valid-asyncapi.yml'),
            versionEvents: false,
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { path: eventPath } = await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
          });

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          // Check the version has been set
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'index.md'))).toEqual(false);
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'schema.json'))).toEqual(false);

          expect(fs.existsSync(path.join(eventPath, 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'schema.json'))).toEqual(true);

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers:
                  - 'Account Service'
              consumers: []
              externalLinks: []
              badges: []
            ---

            <NodeGraph />
            <Schema />
            `);
        });
      });

      describe('includeLinkToAsyncAPIDoc', () => {
        it('when includeLinkToAsyncAPIDoc is set, an external link will be added in the event', async () => {
          const options: AsyncAPIPluginOptions = {
            pathToSpec: path.join(__dirname, './assets/valid-asyncapi.yml'),
            externalAsyncAPIUrl: 'https://eventcatalog.dev/events',
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { path: eventPath } = await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
          });

          console.log('eventPath', eventPath);

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          // Check the file has been created
          expect(fs.existsSync(path.join(eventPath, 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'schema.json'))).toEqual(true);

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers:
                  - 'Account Service'
              consumers: []
              externalLinks:
                  - {label: 'View event in AsyncAPI', url: 'https://eventcatalog.dev/events#message-UserSignedUp'}
              badges: []
            ---

            <NodeGraph />
            <Schema />
            `);
        });
      });

      describe('Custom graph templating', () => {
        it('when options are set Mermaid is ignored and Node Graphs are templated', async () => {
          const options: AsyncAPIPluginOptions = {
            pathToSpec: path.join(__dirname, './assets/valid-asyncapi.yml'),
            renderMermaidDiagram: false,
            renderNodeGraph: true,
          };

          await plugin(pluginContext, options);

          // just wait for files to be there in time.
          await new Promise((r) => setTimeout(r, 200));

          const { getEventFromCatalog, getServiceFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
          const { raw: serviceFile } = getServiceFromCatalog('Account Service');

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers:
                  - 'Account Service'
              consumers: []
              externalLinks: []
              badges: []
            ---

            <NodeGraph />
            <Schema />
            `);

          expect(serviceFile).toMatchMarkdown(
            `---
            name: 'Account Service'
            summary: 'This service is in charge of processing user signups'
            ---

            <NodeGraph />`
          );
        });
      });

      describe('In domain AsyncAPI parsing', () => {
        it('Creates a domain with contained services and events when domain options are set', async () => {
          const options: AsyncAPIPluginOptions = {
            pathToSpec: path.join(__dirname, './assets/valid-asyncapi.yml'),
            renderMermaidDiagram: false,
            renderNodeGraph: true,
            domainName: 'My Domain',
            domainSummary: 'A summary of my domain.',
          };

          await plugin(pluginContext, options);

          // just wait for files to be there in time.
          await new Promise((r) => setTimeout(r, 200));

          const { getDomainFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          const { getEventFromCatalog, getServiceFromCatalog } = utils({
            catalogDirectory: path.join(process.env.PROJECT_DIR, 'domains', options.domainName),
          });

          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
          const { raw: serviceFile } = getServiceFromCatalog('Account Service');
          const { raw: domainFile } = getDomainFromCatalog('My Domain');

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers:
                  - 'Account Service'
              consumers: []
              externalLinks: []
              badges: []
            ---

            <NodeGraph />
            <Schema />
            `);

          expect(serviceFile).toMatchMarkdown(
            `---
            name: 'Account Service'
            summary: 'This service is in charge of processing user signups'
            ---

            <NodeGraph />`
          );

          expect(domainFile).toMatchMarkdown(`
            ---
            name: 'My Domain'
            summary: 'A summary of my domain.'
            ---

            <NodeGraph />
          `);
        });
      });
    });

    describe('asyncapi service that is both producer and consumer', () => {
      it('writes the event with the same producer and consumer', async () => {
        const options: AsyncAPIPluginOptions = {
          pathToSpec: [path.join(__dirname, './assets/producer-and-consumer.yml')],
        };

        await plugin(pluginContext, options);

        // just wait for files to be there in time.
        await new Promise((r) => setTimeout(r, 200));

        const { getEventFromCatalog, getServiceFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

        const { raw: eventFile } = getEventFromCatalog('deliveryEvent');

        const { raw: serviceFile } = getServiceFromCatalog('ResultsDataService');

        expect(eventFile).toMatchMarkdown(`
        ---
        name: deliveryEvent
        summary: null
        version: 1.0.0
        producers:
            - ResultsDataService
        consumers:
            - ResultsDataService
        externalLinks: []
        badges: []
        ---
        <NodeGraph />
        <Schema />
          `);

        expect(serviceFile).toMatchMarkdown(`
        ---
        name: ResultsDataService
        summary: 'Results API'
        ---
        <NodeGraph /> `);
      });
    });
  });
});
