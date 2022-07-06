// @ts-nocheck

import path from 'path';
import fs from 'fs-extra';
import utils from '../index';

const CATALOG_DIRECTORY = path.join(__dirname, './assets/catalog');
const VERSIONED_CATALOG_DIRECTORY = path.join(__dirname, './assets/catalog_version_test');

const {
  getEventFromCatalog,
  getServiceFromCatalog,
  getDomainFromCatalog,
  getAllEventsFromCatalog,
  getAllServicesFromCatalog,
  buildEventMarkdownForCatalog,
  buildServiceMarkdownForCatalog,
  buildDomainMarkdownForCatalog,
  writeServiceToCatalog,
  existsInCatalog,
  writeEventToCatalog,
  writeDomainToCatalog,
} = utils({
  catalogDirectory: CATALOG_DIRECTORY,
});

describe('eventcatalog-utils', () => {
  afterEach(() => {
    try {
      fs.rmdirSync(path.join(CATALOG_DIRECTORY, 'events', 'My New Event'), { recursive: true });
      fs.rmdirSync(path.join(CATALOG_DIRECTORY, 'events', 'My Event That Overrides Content'), { recursive: true });
      fs.rmdirSync(path.join(CATALOG_DIRECTORY, 'events', 'My Versioned Event'), { recursive: true });
      fs.rmdirSync(path.join(CATALOG_DIRECTORY, 'services', 'My New Service'), { recursive: true });
    } catch (error) {
      console.log('Nothing to remove');
    }
  });

  describe('events', () => {
    describe('getEventFromCatalog', () => {
      it('returns the given event name from the catalog', () => {
        const { content, data, raw } = getEventFromCatalog('OrderComplete');

        expect(data).toEqual({
          name: 'OrderComplete',
          version: '0.0.1',
          summary: 'Event represents when an order has been complete. (Delivered and finished)\n',
          producers: ['Orders Service'],
          consumers: ['Data Lake'],
          owners: ['dboyne', 'mSmith'],
        });

        expect(content).toMatchMarkdown('# Testing');
        expect(raw).toBeDefined();
      });

      it('returns null when a given event name does not exist in the catalog', () => {
        const event = getEventFromCatalog('RandomEventThatDoesNotExist');

        expect(event).toEqual(null);
      });
    });

    describe('getAllEventsFromCatalog', () => {
      it('returns all the events in the catalog', () => {
        const events = getAllEventsFromCatalog();

        expect(events).toEqual([
          {
            data: {
              name: 'OrderComplete',
              version: '0.0.1',
              summary: 'Event represents when an order has been complete. (Delivered and finished)\n',
              producers: ['Orders Service'],
              consumers: ['Data Lake'],
              owners: ['dboyne', 'mSmith'],
            },
            content: '\n# Testing',
          },
          {
            data: {
              name: 'OrderCreated',
              version: '0.0.1',
              summary: 'Event represents when an order has been complete. (Delivered and finished)\n',
              producers: ['Orders Service'],
              consumers: ['Data Lake'],
              owners: ['dboyne', 'mSmith'],
            },
            content: '\n# Testing',
          },
        ]);
      });
    });

    describe('buildEventMarkdownForCatalog', () => {
      it('takes a given event and generates the catalog markdown file', () => {
        const event = {
          name: 'MyEvent',
          version: '0.0.1',
          summary: 'This is summary for my event',
          producers: ['Service A'],
          consumers: ['Service B'],
          owners: ['dBoyne'],
        };

        const result = buildEventMarkdownForCatalog(event);

        expect(result).toMatchMarkdown(`
        ---
          name: MyEvent
          version: 0.0.1
          summary: 'This is summary for my event'
          producers:
              - 'Service A'
          consumers:
              - 'Service B'
          owners:
              - dBoyne
        ---
        <Mermaid />`);
      });

      it('takes a given event and markdown content and returns the generated markdown file', () => {
        const event = {
          name: 'MyEvent',
          version: '0.0.1',
          summary: 'This is summary for my event',
          producers: ['Service A'],
          consumers: ['Service B'],
          owners: ['dBoyne'],
        };

        const result = buildEventMarkdownForCatalog(event, { markdownContent: '# Testing' });

        expect(result).toMatchMarkdown(`
        ---
          name: MyEvent
          version: 0.0.1
          summary: 'This is summary for my event'
          producers:
              - 'Service A'
          consumers:
              - 'Service B'
          owners:
              - dBoyne
        ---
        # Testing`);
      });
    });

    describe('versionEvent', () => {
      it('takes a given event name and versions the event', () => {
        const { versionEvent } = utils({ catalogDirectory: VERSIONED_CATALOG_DIRECTORY });

        expect(fs.existsSync(path.join(VERSIONED_CATALOG_DIRECTORY, 'events', 'OrderComplete', 'versioned'))).toEqual(false);

        const { versionedPath } = versionEvent('OrderComplete', { removeOnVersion: false });

        expect(fs.existsSync(versionedPath)).toEqual(true);
        expect(fs.existsSync(path.join(versionedPath, 'index.md'))).toEqual(true);
        expect(fs.existsSync(path.join(versionedPath, 'schema.json'))).toEqual(true);

        // clean up
        fs.rmdirSync(path.join(versionedPath, '../'), { recursive: true });
      });

      it('takes a given event and versions the event, and also removes it from the root event directory if `removeOnVersion` is set to true', () => {
        const { versionEvent } = utils({ catalogDirectory: VERSIONED_CATALOG_DIRECTORY });

        const newEventPath = path.join(VERSIONED_CATALOG_DIRECTORY, 'events', 'EventWithCleanVersion');

        fs.ensureFileSync(path.join(newEventPath, 'index.md'));

        fs.writeFileSync(
          path.join(newEventPath, 'index.md'),
          `---
          name: EventWithCleanVersion
          version: 0.0.1
          summary: |
            Event represents when an order has been complete. (Delivered and finished)
          producers:
              - Orders Service
          consumers:
              - Data Lake
          owners:
              - dboyne
              - mSmith
---`
        );

        expect(fs.existsSync(path.join(VERSIONED_CATALOG_DIRECTORY, 'events', 'EventWithCleanVersion', 'versioned'))).toEqual(
          false
        );

        const { versionedPath } = versionEvent('EventWithCleanVersion', { removeOnVersion: true });

        expect(fs.existsSync(versionedPath)).toEqual(true);
        expect(fs.existsSync(path.join(versionedPath, 'index.md'))).toEqual(true);

        // make sure the event is removed from the root directory
        expect(fs.existsSync(newEventPath, 'index.md'));

        // // clean up
        fs.rmdirSync(path.join(versionedPath, '../'), { recursive: true });
        fs.rmdirSync(newEventPath, { recursive: true });
      });

      it('throws an error when event cannot be found', () => {
        const { versionEvent } = utils({ catalogDirectory: VERSIONED_CATALOG_DIRECTORY });
        expect(() => versionEvent('RandomEvent')).toThrow('Cannot find event "RandomEvent" to version');
      });

      it('throws an when event does not have a version', () => {
        const { versionEvent } = utils({ catalogDirectory: VERSIONED_CATALOG_DIRECTORY });
        expect(() => versionEvent('EventWithoutVersion')).toThrow(
          'Trying to version "EventWithoutVersion" but no \'version\' value found on the event'
        );
      });
    });

    describe('writeEventToCatalog', () => {
      it('should take the given event and write it into the catalog', () => {
        const event = {
          name: 'My New Event',
          summary: 'This is summary for my event',
          owners: ['dBoyne'],
        };

        const { path: eventPath } = writeEventToCatalog(event);

        expect(fs.existsSync(eventPath)).toEqual(true);

        const result = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My New Event'
        summary: 'This is summary for my event'
        owners:
            - dBoyne
        ---
        <Mermaid />`);

        // clean up
        fs.rmdirSync(path.join(eventPath), { recursive: true });
      });

      it('when writing an event with a schema the default markdown includes the schema component', () => {
        const event = {
          name: 'My New Event',
          summary: 'This is summary for my event',
          owners: ['dBoyne'],
        };

        const { path: eventPath } = writeEventToCatalog(event, {
          schema: { extension: 'json', fileContent: JSON.stringify({ test: true }, null, 4) },
        });

        expect(fs.existsSync(eventPath)).toEqual(true);

        const result = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My New Event'
        summary: 'This is summary for my event'
        owners:
            - dBoyne
        ---
        <Mermaid />

        <Schema />
        `);

        // clean up
        fs.rmdirSync(path.join(eventPath), { recursive: true });
      });

      it('when the same event already exists in the catalog, that markdown content is used in the new event', () => {
        const event = {
          name: 'My Event That Already Exists',
          version: '1.0.0',
          summary: 'This is summary for my event',
          owners: ['dBoyne'],
        };

        const { path: eventPath } = writeEventToCatalog(event, {
          useMarkdownContentFromExistingEvent: true,
          markdownContent: '# My Content',
        });
        const result = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
         ---
         name: 'My Event That Already Exists'
         version: 1.0.0
         summary: 'This is summary for my event'
         owners:
             - dBoyne
         ---
         # My Content`);

        const updatedEvent = {
          name: 'My Event That Already Exists',
          version: '1.2.0',
          summary: 'New summary of event',
          producers: ['random'],
          owners: ['dBoyne'],
        };

        const { path: updatedEventPath } = writeEventToCatalog(updatedEvent, { useMarkdownContentFromExistingEvent: true });
        const newFileContents = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

        expect(newFileContents).toMatchMarkdown(`
        ---
        name: 'My Event That Already Exists'
        version: 1.2.0
        summary: 'New summary of event'
        producers:
            - random
        owners:
            - dBoyne
        ---
        # My Content`);

        fs.rmdirSync(path.join(updatedEventPath), { recursive: true });
      });

      it('writes the given event into the catalog and does not copy of existing content if `useMarkdownContentFromExistingEvent` is set to false', () => {
        const event = {
          name: 'My Event That Overrides Content',
          summary: 'This is summary for my event',
          owners: ['dBoyne'],
        };

        const { path: eventPath } = writeEventToCatalog(event, { useMarkdownContentFromExistingEvent: false });

        const result = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Event That Overrides Content'
        summary: 'This is summary for my event'
        owners:
            - dBoyne
        ---
        <Mermaid />`);

        fs.rmdirSync(path.join(eventPath), { recursive: true });
      });

      it('should write event with node graph when the options are set', () => {
        const event = {
          name: 'My Event That Needs a Node Graph',
          summary: 'This is summary for my event',
          owners: ['dBoyne'],
        };

        const { path: eventPath } = writeEventToCatalog(event, {
          renderMermaidDiagram: false,
          renderNodeGraph: true,
        });

        expect(fs.existsSync(eventPath)).toEqual(true);

        const result = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Event That Needs a Node Graph'
        summary: 'This is summary for my event'
        owners:
            - dBoyne
        ---
        <NodeGraph />`);

        // clean up
        fs.rmdirSync(path.join(eventPath), { recursive: true });
      });

      describe('function options', () => {
        it('when given a `schema` the schema is written into the catalog with the event', () => {
          const event = {
            name: 'My New Event',
            summary: 'This is summary for my event',
            owners: ['dBoyne'],
          };

          const { path: eventPath } = writeEventToCatalog(event, {
            schema: { extension: 'json', fileContent: JSON.stringify({ test: true }, null, 4) },
          });

          expect(fs.existsSync(path.join(eventPath, 'schema.json'))).toEqual(true);

          fs.rmdirSync(path.join(eventPath), { recursive: true });
        });

        it('when given a list of `codeExamples` they are written into the catalog with the event', () => {
          const event = {
            name: 'My New Event',
            summary: 'This is summary for my event',
            owners: ['dBoyne'],
          };

          const { path: eventPath } = writeEventToCatalog(event, {
            codeExamples: [
              { fileName: 'example1.js', fileContent: 'const x = () => {}' },
              { fileName: 'example2.js', fileContent: 'const x = () => {}' },
            ],
          });

          expect(fs.existsSync(path.join(eventPath, 'examples', 'example1.js'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'examples', 'example2.js'))).toEqual(true);

          fs.rmdirSync(path.join(eventPath), { recursive: true });
        });

        it('versions the current event in the directory when `versionExistingEvent` is set to true', () => {
          const event = {
            name: 'My Versioned Event',
            version: '1.0.0',
            summary: 'This is summary for my event',
            owners: ['dBoyne'],
          };

          const { path: eventPath } = writeEventToCatalog(event, {
            codeExamples: [
              { fileName: 'example1.js', fileContent: 'const x = () => {}' },
              { fileName: 'example2.js', fileContent: 'const x = () => {}' },
            ],
            schema: { extension: 'json', fileContent: JSON.stringify({ test: true }, null, 4) },
          });

          expect(fs.existsSync(path.join(eventPath, 'versionsed', '1.0.0'))).toEqual(false);

          const updatedEvent = {
            name: 'My Versioned Event',
            version: '1.1.0',
            summary: 'This is summary for my event',
            owners: ['dBoyne'],
          };

          const { path: updatedEventPath } = writeEventToCatalog(updatedEvent, {
            codeExamples: [
              { fileName: 'example1.js', fileContent: 'const x = () => {}' },
              { fileName: 'example2.js', fileContent: 'const x = () => {}' },
            ],
            schema: { extension: 'json', fileContent: JSON.stringify({ test: true }, null, 4) },
            versionExistingEvent: true,
          });

          expect(fs.existsSync(path.join(updatedEventPath, 'versioned', '1.0.0'))).toEqual(true);

          fs.rmdirSync(path.join(updatedEventPath), { recursive: true });
        });

        describe('frontMatterToCopyToNewVersions', () => {
          it('when automatically versioning an event the frontmatter is copied to the new event with any properties specified', () => {
            const event = {
              name: 'My Event That Already Exists',
              version: '1.0.0',
              summary: 'This is summary for my event',
              owners: ['dBoyne', 'anotherUser'],
            };

            const { path: eventPath } = writeEventToCatalog(event, {
              useMarkdownContentFromExistingEvent: true,
              markdownContent: '# My Content',
            });

            const result = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

            expect(result).toMatchMarkdown(`
             ---
             name: 'My Event That Already Exists'
             version: 1.0.0
             summary: 'This is summary for my event'
             owners:
                 - dBoyne
                 - anotherUser
             ---
             # My Content`);

            const updatedEvent = {
              name: 'My Event That Already Exists',
              version: '1.2.0',
              summary: 'New summary of event',
              producers: ['random'],
            };

            const { path: updatedEventPath } = writeEventToCatalog(updatedEvent, {
              useMarkdownContentFromExistingEvent: true,
              frontMatterToCopyToNewVersions: {
                owners: true,
              },
            });

            const newFileContents = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

            expect(newFileContents).toMatchMarkdown(`
            ---
            name: 'My Event That Already Exists'
            version: 1.2.0
            summary: 'New summary of event'
            producers:
                - random
            owners:
                - dBoyne
                - anotherUser
            ---
            # My Content`);

            fs.rmdirSync(path.join(updatedEventPath), { recursive: true });
          });

          it('when automatically versioning an event the frontmatter data is merged with the new event with any properties specified', () => {
            const event = {
              name: 'My Event That Already Exists',
              version: '1.0.0',
              summary: 'This is summary for my event',
              owners: ['dBoyne', 'anotherUser'],
              producers: ['My First Producer'],
            };

            const { path: eventPath } = writeEventToCatalog(event, {
              useMarkdownContentFromExistingEvent: true,
              markdownContent: '# My Content',
            });

            const result = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

            expect(result).toMatchMarkdown(`
             ---
             name: 'My Event That Already Exists'
             version: 1.0.0
             summary: 'This is summary for my event'
             owners:
                 - dBoyne
                 - anotherUser
             producers:
                 - 'My First Producer'    
             ---
             # My Content`);

            const updatedEvent = {
              name: 'My Event That Already Exists',
              version: '1.2.0',
              summary: 'New summary of event',
              producers: ['random'],
            };

            const { path: updatedEventPath } = writeEventToCatalog(updatedEvent, {
              useMarkdownContentFromExistingEvent: true,
              frontMatterToCopyToNewVersions: {
                producers: true,
                owners: true,
              },
            });

            const newFileContents = fs.readFileSync(path.join(eventPath, 'index.md'), 'utf-8');

            expect(newFileContents).toMatchMarkdown(`
            ---
            name: 'My Event That Already Exists'
            version: 1.2.0
            summary: 'New summary of event'
            producers:
                - random
                - 'My First Producer'
            owners:
                - dBoyne
                - anotherUser
            ---
            # My Content`);

            fs.rmdirSync(path.join(updatedEventPath), { recursive: true });
          });
        });
      });
    });

    describe('existsInCatalog (event)', () => {
      it('returns true when a given event exists in the catalog', () => {
        const result = existsInCatalog('OrderComplete', { type: 'event' });
        expect(result).toEqual(true);
      });
      it('returns false when a given event does not exist in the catalog', () => {
        const result = existsInCatalog('RandomEVent', { type: 'event' });
        expect(result).toEqual(false);
      });
    });
  });

  describe('services', () => {
    describe('getServiceFromCatalog', () => {
      it('returns the given sevice name from the catalog', () => {
        const { content, data, raw } = getServiceFromCatalog('Order Service');

        expect(data).toEqual({
          name: 'Order Service',
          summary: 'Event based application that handles processing of orders.\n',
          owners: ['dboyne'],
          repository: {
            language: 'JavaScript',
            url: 'https://github.com/boyney123/pretend-order-service',
          },
        });

        expect(content).toMatchMarkdown('# Testing');

        expect(raw).toBeDefined();
      });

      it('returns null when a given service name does not exist in the catalog', () => {
        const event = getServiceFromCatalog('RandomServiceThatDoesNotExist');

        expect(event).toEqual(null);
      });
    });

    describe('getAllServicesFromCatalog', () => {
      it('returns all the services in the catalog', () => {
        const services = getAllServicesFromCatalog();

        expect(services).toEqual([
          {
            data: {
              name: 'My Service That Already Exists',
              summary: 'This is summary for my service',
              repository: {
                url: 'https://github.com/boyney123/eventcatalog',
                language: 'JavaScript',
              },
              owners: ['dBoyne'],
            },
            content: '# Content already exists',
          },
          {
            data: {
              name: 'Order Service',
              summary: 'Event based application that handles processing of orders.\n',
              owners: ['dboyne'],
              repository: {
                language: 'JavaScript',
                url: 'https://github.com/boyney123/pretend-order-service',
              },
            },
            content: '\n# Testing',
          },
        ]);
      });
    });

    describe('buildServiceMarkdownForCatalog', () => {
      it('takes a given service and generates the catalog markdown file', () => {
        const service = {
          name: 'My Service',
          summary: 'This is summary for my service',
          repository: {
            url: 'https://github.com/boyney123/eventcatalog',
            language: 'JavaScript',
          },
          owners: ['dBoyne'],
        };

        const result = buildServiceMarkdownForCatalog(service);

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Service'
        summary: 'This is summary for my service'
        repository:
            url: 'https://github.com/boyney123/eventcatalog'
            language: JavaScript
        owners:
            - dBoyne
        ---
        <Mermaid />`);
      });

      it('takes a given service and markdown content and returns the generated markdown file', () => {
        const service = {
          name: 'My Service',
          summary: 'This is summary for my service',
          repository: {
            url: 'https://github.com/boyney123/eventcatalog',
            language: 'JavaScript',
          },
          owners: ['dBoyne'],
        };

        const result = buildServiceMarkdownForCatalog(service, { markdownContent: '# Testing' });

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Service'
        summary: 'This is summary for my service'
        repository:
            url: 'https://github.com/boyney123/eventcatalog'
            language: JavaScript
        owners:
            - dBoyne
        ---
        # Testing`);
      });

      it('takes a given service and generates markdown with a node graph', () => {
        const service = {
          name: 'My Service',
          summary: 'This is summary for my service',
          repository: {
            url: 'https://github.com/boyney123/eventcatalog',
            language: 'JavaScript',
          },
          owners: ['dBoyne'],
        };

        const result = buildServiceMarkdownForCatalog(service, {
          renderMermaidDiagram: false,
          renderNodeGraph: true,
        });

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Service'
        summary: 'This is summary for my service'
        repository:
            url: 'https://github.com/boyney123/eventcatalog'
            language: JavaScript
        owners:
            - dBoyne
        ---
        <NodeGraph />`);
      });
    });

    describe('existsInCatalog (service)', () => {
      it('returns true when a given service exists in the catalog', () => {
        const result = existsInCatalog('Order Service', { type: 'service' });
        expect(result).toEqual(true);
      });
      it('returns false when a given service does not exist in the catalog', () => {
        const result = existsInCatalog('RandomService', { type: 'service' });
        expect(result).toEqual(false);
      });
    });

    describe('writeServiceToCatalog', () => {
      it('should take the given service and write it into the catalog', () => {
        const service = {
          name: 'My New Service',
          summary: 'This is summary for my service',
          repository: {
            url: 'https://github.com/boyney123/eventcatalog',
            language: 'JavaScript',
          },
          owners: ['dBoyne'],
        };

        const { path: servicePath } = writeServiceToCatalog(service);

        expect(fs.existsSync(servicePath)).toEqual(true);

        const result = fs.readFileSync(path.join(servicePath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My New Service'
        summary: 'This is summary for my service'
        repository:
            url: 'https://github.com/boyney123/eventcatalog'
            language: JavaScript
        owners:
            - dBoyne
        ---
        <Mermaid />`);

        // clean up
        fs.rmdirSync(path.join(servicePath), { recursive: true });
      });

      it('when the same service already exists in the catalog, that markdown content is used in the new service', () => {
        const service = {
          name: 'My Service That Already Exists',
          summary: 'This is summary for my service',
          repository: {
            url: 'https://github.com/boyney123/eventcatalog',
            language: 'JavaScript',
          },
          owners: ['dBoyne'],
        };

        const { path: servicePath } = writeServiceToCatalog(service, { useMarkdownContentFromExistingService: true });

        // expect(fs.existsSync(servicePath)).toEqual(true);

        const result = fs.readFileSync(path.join(servicePath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Service That Already Exists'
        summary: 'This is summary for my service'
        repository:
            url: 'https://github.com/boyney123/eventcatalog'
            language: JavaScript
        owners:
            - dBoyne
        ---
        # Content already exists`);
      });

      it('writes the given service into the catalog and does not copy of existing content if `useMarkdownContentFromExistingService` is set to false', () => {
        const service = {
          name: 'My Service That Overrides Content',
          summary: 'This is summary for my service',
          repository: {
            url: 'https://github.com/boyney123/eventcatalog',
            language: 'JavaScript',
          },
          owners: ['dBoyne'],
        };

        const { path: servicePath } = writeServiceToCatalog(service, { useMarkdownContentFromExistingService: false });

        // expect(fs.existsSync(servicePath)).toEqual(true);

        const result = fs.readFileSync(path.join(servicePath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Service That Overrides Content'
        summary: 'This is summary for my service'
        repository:
            url: 'https://github.com/boyney123/eventcatalog'
            language: JavaScript
        owners:
            - dBoyne
        ---
        <Mermaid />`);

        fs.rmdirSync(path.join(servicePath), { recursive: true });
      });

      it('throws an error when the given service does not have a name', () => {
        const service = {
          summary: 'This is summary for my service',
          repository: {
            url: 'https://github.com/boyney123/eventcatalog',
            language: 'JavaScript',
          },
          owners: ['dBoyne'],
        };

        expect(() => writeServiceToCatalog(service, { useMarkdownContentFromExistingService: false })).toThrow(
          'No `name` found for given service'
        );
      });
    });
  });

  describe('domains', () => {
    describe('getDomainFromCatalog', () => {
      it('returns the given domain name from the catalog', () => {
        const { content, data, raw } = getDomainFromCatalog('Orders');

        expect(data).toEqual({
          name: 'Orders',
          summary: 'Domain that holds all the order information.\n',
          owners: ['dboyne'],
        });

        expect(content).toMatchMarkdown('# Testing');

        expect(raw).toBeDefined();
      });

      it('returns null when a given service name does not exist in the catalog', () => {
        const event = getDomainFromCatalog('RandomServiceThatDoesNotExist');

        expect(event).toEqual(null);
      });
    });

    describe('buildDomainMarkdownForCatalog', () => {
      it('takes a given domain and generates the catalog domain markdown file', () => {
        const domain = {
          name: 'My Domain',
          summary: 'This is a summary for my domain',
          owners: ['dBoyne'],
        };

        const result = buildDomainMarkdownForCatalog(domain);

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Domain'
        summary: 'This is a summary for my domain'
        owners:
            - dBoyne
        ---
        <Mermaid />`);
      });

      it('takes a given domain and markdown content and returns the generated markdown file', () => {
        const domain = {
          name: 'My Domain',
          summary: 'This is a summary for my domain',
          owners: ['dBoyne'],
        };

        const result = buildDomainMarkdownForCatalog(domain, { markdownContent: '# Testing' });

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Domain'
        summary: 'This is a summary for my domain'
        owners:
            - dBoyne
        ---
        # Testing`);
      });

      it('takes a given domain and generates markdown with a node graph', () => {
        const domain = {
          name: 'My Domain',
          summary: 'This is a summary for my domain',
          owners: ['dBoyne'],
        };

        const result = buildDomainMarkdownForCatalog(domain, {
          renderMermaidDiagram: false,
          renderNodeGraph: true,
        });

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Domain'
        summary: 'This is a summary for my domain'
        owners:
            - dBoyne
        ---
        <NodeGraph />`);
      });
    });

    describe('writeDomainToCatalog', () => {
      it('should take the given domain and write it into the catalog', () => {
        const domain = {
          name: 'My Domain',
          summary: 'This is a summary for my domain',
          owners: ['dBoyne'],
        };

        const { path: domainPath } = writeDomainToCatalog(domain);

        expect(fs.existsSync(domainPath)).toEqual(true);

        const result = fs.readFileSync(path.join(domainPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Domain'
        summary: 'This is a summary for my domain'
        owners:
            - dBoyne
        ---
        <Mermaid />`);

        // clean up
        fs.rmdirSync(path.join(domainPath), { recursive: true });
      });

      it('when the same domain already exists in the catalog, that markdown content is used in the new domain', () => {
        const domain = {
          name: 'My Domain That Already Exists',
          summary: 'This is a summary for my domain',
          owners: ['dBoyne'],
        };

        const { path: domainPath } = writeDomainToCatalog(domain, { useMarkdownContentFromExistingDomain: true });

        // expect(fs.existsSync(domainPath)).toEqual(true);

        const result = fs.readFileSync(path.join(domainPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Domain That Already Exists'
        summary: 'This is a summary for my domain'
        owners:
            - dBoyne
        ---
        # Content already exists`);
      });

      it('writes the given domain into the catalog and does not copy of existing content if `useMarkdownContentFromExistingService` is set to false', () => {
        const domain = {
          name: 'My Domain That Overrides Content',
          summary: 'This is a summary for my domain',
          owners: ['dBoyne'],
        };

        const { path: domainPath } = writeDomainToCatalog(domain, { useMarkdownContentFromExistingDomain: false });

        // expect(fs.existsSync(domainPath)).toEqual(true);

        const result = fs.readFileSync(path.join(domainPath, 'index.md'), 'utf-8');

        expect(result).toMatchMarkdown(`
        ---
        name: 'My Domain That Overrides Content'
        summary: 'This is a summary for my domain'
        owners:
            - dBoyne
        ---
        <Mermaid />`);

        fs.rmdirSync(path.join(domainPath), { recursive: true });
      });

      it('throws an error when the given domain does not have a name', () => {
        const domain = {
          summary: 'This is a summary for my domain',
          owners: ['dBoyne'],
        };

        expect(() => writeDomainToCatalog(domain, { useMarkdownContentFromExistingDomain: false })).toThrow(
          'No `name` found for given domain'
        );
      });
    });
  });
});
