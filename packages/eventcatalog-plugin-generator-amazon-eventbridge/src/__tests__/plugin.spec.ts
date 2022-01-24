/* eslint-disable no-unused-vars */
/* eslint-disable no-promise-executor-return */
// @ts-nocheck
import utils from '@eventcatalog/utils';

import path from 'path';
import fs from 'fs-extra';
import plugin from '../index';

import awsClientSchemasMocks from './assets/aws-mock-responses/client-schemas';
import awsEventBridgeMocks from './assets/aws-mock-responses/client-eventbridge';
import eventSnapshots from './assets/event-markdown-snapshot';

import { PluginOptions, SchemaTypes } from '../types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchMarkdown(expect: string): R;
    }
  }
}

let PROJECT_DIR: any;

// @aws-sdk/client-schemas mocks
const mockListSchemas = jest.fn(() => awsClientSchemasMocks.listSchemas);
const mockExportSchema = jest.fn(() => awsClientSchemasMocks.exportSchema);
const mockDescribeSchema = jest.fn(() => awsClientSchemasMocks.describeSchemas);

// @aws-sdk/client-eventbridge mocks
const mockListRules = jest.fn(() => awsEventBridgeMocks.listRules);
const mockListTargetsByRule = jest.fn(() => awsEventBridgeMocks.listTargetsForRules);

jest.mock('@aws-sdk/client-eventbridge', () => ({
  ...jest.requireActual('@aws-sdk/client-eventbridge'),
  EventBridge: jest.fn(() => ({
    listRules: mockListRules,
    listTargetsByRule: mockListTargetsByRule,
  })),
}));

jest.mock('@aws-sdk/client-schemas', () => ({
  ...jest.requireActual('@aws-sdk/client-schemas'),
  Schemas: jest.fn(() => ({
    listSchemas: mockListSchemas,
    exportSchema: mockExportSchema,
    describeSchema: mockDescribeSchema,
  })),
}));

const pluginOptions: PluginOptions = {
  credentials: {
    secretAccessKey: 'some-secret',
    accessKeyId: 'access-key',
  },
  region: 'eu-west-1',
  eventBusName: 'test-event-bus',
  registryName: 'discovered-schemas',
};

describe('eventcatalog-plugin-generator-amazon-eventbridge', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR;
    process.env.PROJECT_DIR = path.join(__dirname, 'tmp');
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    it('creates catalog events, examples and schemas with events from amazon eventbridge schema registry', async () => {
      await plugin({}, pluginOptions);

      // just wait for files to be there in time.
      await new Promise((r) => setTimeout(r, 200));

      const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

      const { raw: eventFile, data: event } = getEventFromCatalog('users@UserCreated');

      // known issue with utils that will default props... replace it for now
      expect(eventFile).toMatchMarkdown(eventSnapshots.userCreated);

      // verify the schema next to the event is the JSONDraft4 from EventBridge
      const expectedSchemaForEvent = JSON.parse(awsClientSchemasMocks.exportSchema.Content);
      const generatedSchemaForEvent = fs.readFileSync(
        path.join(process.env.PROJECT_DIR, 'events', event.name, 'schema.json'),
        'utf-8'
      );
      expect(generatedSchemaForEvent).toEqual(JSON.stringify(expectedSchemaForEvent, null, 4));

      // verify the code examples next to the event is the open-api version of the event
      const expectedCodeExampleForEvent = JSON.parse(awsClientSchemasMocks.describeSchemas.Content);
      const generatedCodeExampleForEvent = fs.readFileSync(
        path.join(process.env.PROJECT_DIR, 'events', event.name, 'examples', 'users@UserCreated-openapi-schema.json'),
        'utf-8'
      );
      expect(generatedCodeExampleForEvent).toEqual(JSON.stringify(expectedCodeExampleForEvent, null, 4));
    });

    describe('when user has existing events in their event catalog', () => {
      it('when the schema versions (from AWS) match the current version of the event in the catalog, the event is overriden and not versioned', async () => {
        const oldEvent = {
          name: 'users@UserCreated',
          version: '1',
          summary: 'Old event from Amazon EventBridge that was created',
        };

        const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
        await writeEventToCatalog(oldEvent, {
          schema: { extension: 'json', fileContent: 'hello' },
        });

        await plugin({}, pluginOptions);

        // just wait for files to be there in time.
        await new Promise((r) => setTimeout(r, 200));

        const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

        const { data: event } = getEventFromCatalog('users@UserCreated');

        expect(event.summary).toEqual('Found on the "test-event-bus" Amazon EventBridge bus.');
      });

      it('when the schema versions (from AWS) do not match the current version of the event, the event in the catalog is versioned and the new event documentation is created', async () => {
        const oldEventFromAWSAlreadyInCatalog = {
          name: 'users@UserCreated',
          version: '0.1',
          summary: 'really old version of this event',
        };

        const eventPath = path.join(process.env.PROJECT_DIR, 'events', 'users@UserCreated');

        const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
        await writeEventToCatalog(oldEventFromAWSAlreadyInCatalog, {
          schema: { extension: 'json', fileContent: 'some-old-schema-example' },
        });

        expect(fs.existsSync(path.join(eventPath, 'versioned'))).toEqual(false);

        await plugin({}, pluginOptions);
        await new Promise((r) => setTimeout(r, 200));

        const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

        const { raw: eventFile } = getEventFromCatalog('users@UserCreated');

        expect(eventFile).toMatchMarkdown(eventSnapshots.userCreated);

        // Check the version has been set
        expect(fs.existsSync(path.join(eventPath, 'versioned', '0.1', 'index.md'))).toEqual(true);
        expect(fs.existsSync(path.join(eventPath, 'versioned', '0.1', 'schema.json'))).toEqual(true);
      });

      it('when new events are created in the catalog the `owners` from the previous version of the event is used in the new event metdata', async () => {
        const oldEventFromAWSAlreadyInCatalog = {
          name: 'users@UserCreated',
          version: '0.1',
          summary: 'really old version of this event',
          owners: ['dboyne', 'tSmith'],
        };

        const eventPath = path.join(process.env.PROJECT_DIR, 'events', 'users@UserCreated');

        const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
        await writeEventToCatalog(oldEventFromAWSAlreadyInCatalog, {
          schema: { extension: 'json', fileContent: 'some-old-schema-example' },
        });

        await plugin({}, pluginOptions);
        await new Promise((r) => setTimeout(r, 200));

        const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

        const { data: newEventData } = getEventFromCatalog('users@UserCreated');

        // Check the version has been set
        expect(fs.existsSync(path.join(eventPath, 'versioned', '0.1', 'index.md'))).toEqual(true);
        expect(fs.existsSync(path.join(eventPath, 'versioned', '0.1', 'schema.json'))).toEqual(true);

        expect(newEventData.version).toEqual('1');
        expect(newEventData.owners).toEqual(['dboyne', 'tSmith']);
      });
    });

    describe('plugin options', () => {
      describe('versionEvents', () => {
        it('when `versionEvents` is set to false, no events will be versioned and everything is overriden', async () => {
          const oldEventFromAWSAlreadyInCatalog = {
            name: 'users@UserCreated',
            version: '0.1',
            summary: 'really old version of this event',
          };

          const eventPath = path.join(process.env.PROJECT_DIR, 'events', 'users@UserCreated');

          const { writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });
          await writeEventToCatalog(oldEventFromAWSAlreadyInCatalog, {
            schema: { extension: 'json', fileContent: 'some-old-schema-example' },
          });

          await plugin({}, { ...pluginOptions, versionEvents: false });
          await new Promise((r) => setTimeout(r, 200));

          const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

          const { raw: eventFile } = getEventFromCatalog('users@UserCreated');

          // Check the version has NOT been set
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.1', 'index.md'))).toEqual(false);
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.1', 'schema.json'))).toEqual(false);

          expect(eventFile).toMatchMarkdown(eventSnapshots.userCreated);
        });
      });

      describe('schemaTypeToRenderToEvent', () => {
        it('when the `schemaTypeToRenderToEvent` is set to `JSONSchemaDraft4` then the schema rendered in the document is the JSON Draft version', async () => {
          await plugin({}, { ...pluginOptions, schemaTypeToRenderToEvent: SchemaTypes.JSONSchemaDraft4 });
          await new Promise((r) => setTimeout(r, 200));

          // verify the schema next to the event is the JSONDraft4 from EventBridge
          const expectedSchemaForEvent = JSON.parse(awsClientSchemasMocks.exportSchema.Content);
          const generatedSchemaForEvent = fs.readFileSync(
            path.join(process.env.PROJECT_DIR, 'events', 'users@UserCreated', 'schema.json'),
            'utf-8'
          );
          expect(generatedSchemaForEvent).toEqual(JSON.stringify(expectedSchemaForEvent, null, 4));
        });

        it('when the `schemaTypeToRenderToEvent` is set to `OpenAPI` then the schema rendered in the document is the OpenAPI version', async () => {
          await plugin({}, { ...pluginOptions, schemaTypeToRenderToEvent: SchemaTypes.OpenAPI });
          await new Promise((r) => setTimeout(r, 200));

          // verify the schema next to the event is the OPEN API one
          const expectedSchemaForEvent = JSON.parse(awsClientSchemasMocks.describeSchemas.Content);
          const generatedSchemaForEvent = fs.readFileSync(
            path.join(process.env.PROJECT_DIR, 'events', 'users@UserCreated', 'schema.json'),
            'utf-8'
          );
          expect(generatedSchemaForEvent).toEqual(JSON.stringify(expectedSchemaForEvent, null, 4));
        });
      });

      it('when events do not have any targets or rules the target and rule diagrams are not rendered in the markdown files', async () => {
        mockExportSchema.mockImplementation(({ SchemaName }) => awsClientSchemasMocks.buildSchema({ eventName: SchemaName }));

        mockDescribeSchema.mockImplementation(({ SchemaName }) =>
          awsClientSchemasMocks.buildOpenAPIResponse({ eventName: SchemaName })
        );

        await plugin({}, pluginOptions);

        // just wait for files to be there in time.
        await new Promise((r) => setTimeout(r, 200));

        const { getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

        const { raw: eventFile } = getEventFromCatalog('users@UserDeleted');

        // known issue with utils that will default props... replace it for now
        expect(eventFile).toMatchMarkdown(eventSnapshots.userDeletedWithNoTargetsOrRules.replace('owners: []', ''));
      });
    });
  });
});
