// @ts-nocheck

import path from 'path';
import fs from 'fs-extra';
import utils from '../index';

const CATALOG_DIRECTORY = path.join(__dirname, './assets/catalog');
const VERSIONED_CATALOG_DIRECTORY = path.join(__dirname, './assets/catalog_version_test');

const {
  getEventFromCatalog,
  getServiceFromCatalog,
  getAllEventsFromCatalog,
  getAllServicesFromCatalog,
  buildEventMarkdownForCatalog,
  buildServiceMarkdownForCatalog,
} = utils({
  catalogDirectory: CATALOG_DIRECTORY,
});

describe('eventcatalog-utils', () => {
  describe('events', () => {
    describe('getEventFromCatalog', () => {
      it('returns the given event name from the catalog', () => {
        const { content, data } = getEventFromCatalog('OrderComplete');

        expect(data).toEqual({
          name: 'OrderComplete',
          version: '0.0.1',
          summary: 'Event represents when an order has been complete. (Delivered and finished)\n',
          producers: ['Orders Service'],
          consumers: ['Data Lake'],
          owners: ['dboyne', 'mSmith'],
        });

        expect(content).toMatchMarkdown('# Testing');
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
            content: '\n# Testing',
            data: {
              name: 'OrderComplete',
              version: '0.0.1',
              summary:
                'Event represents when an order has been complete. (Delivered and finished)\n',
              producers: ['Orders Service'],
              consumers: ['Data Lake'],
              owners: ['dboyne', 'mSmith'],
            },
          },
          {
            content: '\n# Testing',
            data: {
              name: 'OrderCreated',
              version: '0.0.1',
              summary:
                'Event represents when an order has been complete. (Delivered and finished)\n',
              producers: ['Orders Service'],
              consumers: ['Data Lake'],
              owners: ['dboyne', 'mSmith'],
            },
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

        expect(
          fs.existsSync(
            path.join(VERSIONED_CATALOG_DIRECTORY, 'events', 'OrderComplete', 'versioned')
          )
        ).toEqual(false);

        const { versionedPath } = versionEvent('OrderComplete', { removeOnVersion: false });

        expect(fs.existsSync(versionedPath)).toEqual(true);
        expect(fs.existsSync(path.join(versionedPath, 'index.md'))).toEqual(true);
        expect(fs.existsSync(path.join(versionedPath, 'schema.json'))).toEqual(true);

        // clean up
        fs.rmdirSync(path.join(versionedPath, '../'), { recursive: true });
      });

      it('takes a given event and versions the event, and also removes it from the root event directory if `removeOnVersion` is set to true', () => {
        const { versionEvent } = utils({ catalogDirectory: VERSIONED_CATALOG_DIRECTORY });

        const newEventPath = path.join(
          VERSIONED_CATALOG_DIRECTORY,
          'events',
          'EventWithCleanVersion'
        );

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

        expect(
          fs.existsSync(
            path.join(VERSIONED_CATALOG_DIRECTORY, 'events', 'EventWithCleanVersion', 'versioned')
          )
        ).toEqual(false);

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
        expect(() => versionEvent('RandomEvent')).toThrow(
          'Cannot find event "RandomEvent" to version'
        );
      });

      it('throws an when event does not have a version', () => {
        const { versionEvent } = utils({ catalogDirectory: VERSIONED_CATALOG_DIRECTORY });
        expect(() => versionEvent('EventWithoutVersion')).toThrow(
          'Trying to version "EventWithoutVersion" but no \'version\' value found on the event'
        );
      });
    });
  });

  describe('services', () => {
    describe('getServiceFromCatalog', () => {
      it('returns the given sevice name from the catalog', () => {
        const { content, data } = getServiceFromCatalog('Order Service');

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
      });

      it('returns null when a given event name does not exist in the catalog', () => {
        const event = getEventFromCatalog('RandomEventThatDoesNotExist');

        expect(event).toEqual(null);
      });
    });

    describe('getAllServicesFromCatalog', () => {
      it('returns all the services in the catalog', () => {
        const services = getAllServicesFromCatalog();

        expect(services).toEqual([
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
    });
  });
});
