import path from 'path';
import { getAllServices, getAllServicesByOwnerId, getServiceByName } from '../services';

let PROJECT_DIR: any;

describe('services', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR;
    process.env.PROJECT_DIR = path.join(__dirname, 'assets');
  });

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR;
  });

  describe('getAllServices', () => {
    it('gets all the services (in the PROJECT_DIR services dir)', async () => {
      const services = await getAllServices();

      expect(services).toEqual([
        {
          name: 'Basket Service',
          summary: 'CRUD based API to handle Basket interactions for users of the shopping website.\n',
          domain: null,
          owners: ['mSmith'],
          repository: {
            language: 'JavaScript',
            url: 'https://github.com/boyney123/pretend-basket-service',
          },
          tags: [],
          externalLinks: [
            {
              label: 'AsyncAPI Specification',
              url: 'https://studio.asyncapi.com/#schema-lightMeasuredPayload',
            },
          ],
          publishes: [],
          subscribes: [],
          badges: [
            {
              content: 'Extra!',
              backgroundColor: 'green',
              textColor: 'green',
            },
            {
              content: 'Long form',
              backgroundColor: 'yellow',
              textColor: 'red',
            },
          ],
        },
        {
          name: 'Email Platform',
          summary: 'Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS\n',
          domain: null,
          owners: ['dboyne'],
          repository: {
            url: 'https://github.com/boyney123/EmailPlatform',
            language: 'JavaScript',
          },
          tags: [
            {
              label: 'defaultContentType:application/json',
            },
            {
              label: 'Apache 2.0',
              url: 'https://www.apache.org/licenses/LICENSE-2.0',
            },
          ],
          externalLinks: [],
          publishes: [
            {
              name: 'EmailSent',
              version: '0.0.1',
              summary: 'Tells us when an email has been sent\n',
              domain: null,
              producerNames: ['Email Platform'],
              consumerNames: [],
              owners: ['dboyne', 'mSmith'],
              externalLinks: [],
              tags: [],
              historicVersions: [],
              badges: [],
            },
          ],
          subscribes: [],
          badges: [],
        },
        {
          name: 'Payment Service',
          summary: 'Event based application that integrates with Stripe.\n',
          domain: null,
          owners: [],
          repository: {},
          tags: [],
          externalLinks: [],
          publishes: [],
          subscribes: [],
          badges: [],
        },
        {
          name: 'User Service',
          summary: 'CRUD based API to handle User information\n',
          domain: 'User',
          owners: ['mSmith'],
          repository: {
            language: 'JavaScript',
            url: 'https://github.com/boyney123/pretend-basket-service',
          },
          tags: [],
          externalLinks: [
            {
              label: 'AsyncAPI Specification',
              url: 'https://studio.asyncapi.com/#schema-lightMeasuredPayload',
            },
          ],
          publishes: [],
          subscribes: [],
          badges: [
            {
              content: 'New!',
              backgroundColor: 'blue',
              textColor: 'blue',
            },
          ],
        },
      ]);
    });
  });

  describe('getAllServicesByOwnerId', () => {
    it('returns empty array when no owner is found', async () => {
      const services = await getAllServicesByOwnerId('made-up-user');
      expect(services).toEqual([]);
    });

    it('returns all the services for a given owner id', async () => {
      const services = await getAllServicesByOwnerId('dboyne');

      expect(services).toEqual([
        {
          name: 'Email Platform',
          summary: 'Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS\n',
          owners: ['dboyne'],
          repository: {
            url: 'https://github.com/boyney123/EmailPlatform',
            language: 'JavaScript',
          },
          domain: null,
          tags: [
            {
              label: 'defaultContentType:application/json',
            },
            {
              label: 'Apache 2.0',
              url: 'https://www.apache.org/licenses/LICENSE-2.0',
            },
          ],
          publishes: [
            {
              name: 'EmailSent',
              version: '0.0.1',
              summary: 'Tells us when an email has been sent\n',
              producerNames: ['Email Platform'],
              consumerNames: [],
              historicVersions: [],
              badges: [],
              domain: null,
              externalLinks: [],
              tags: [],
              owners: ['dboyne', 'mSmith'],
            },
          ],
          subscribes: [],
          externalLinks: [],
          badges: [],
        },
      ]);
    });
  });

  describe('getServiceByName', () => {
    it('returns an event and markdown by the given event name', async () => {
      const { service, markdown } = await getServiceByName({ serviceName: 'Email Platform' });

      expect(service).toEqual({
        name: 'Email Platform',
        summary: 'Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS\n',
        owners: ['dboyne'],
        domain: null,
        openAPISpec: null,
        asyncAPISpec: null,
        repository: {
          url: 'https://github.com/boyney123/EmailPlatform',
          language: 'JavaScript',
        },
        tags: [
          {
            label: 'defaultContentType:application/json',
          },
          {
            label: 'Apache 2.0',
            url: 'https://www.apache.org/licenses/LICENSE-2.0',
          },
        ],
        publishes: [
          {
            name: 'EmailSent',
            version: '0.0.1',
            summary: 'Tells us when an email has been sent\n',
            producerNames: ['Email Platform'],
            consumerNames: [],
            historicVersions: [],
            badges: [],
            domain: null,
            externalLinks: [],
            owners: ['dboyne', 'mSmith'],
            tags: [],
          },
        ],
        subscribes: [],
        externalLinks: [],
        badges: [],
      });

      // @ts-ignore
      expect(markdown.content).toMatchMarkdown('# Testing');
    });

    describe('services within domains', () => {
      it('returns an event and markdown by the given event name', async () => {
        const { service, markdown } = await getServiceByName({ serviceName: 'User Service', domain: 'User' });

        expect(service).toEqual({
          name: 'User Service',
          summary: 'CRUD based API to handle User information\n',
          domain: 'User',
          owners: ['mSmith'],
          openAPISpec: null,
          asyncAPISpec: null,
          repository: {
            language: 'JavaScript',
            url: 'https://github.com/boyney123/pretend-basket-service',
          },
          tags: [],
          externalLinks: [
            {
              label: 'AsyncAPI Specification',
              url: 'https://studio.asyncapi.com/#schema-lightMeasuredPayload',
            },
          ],
          publishes: [],
          subscribes: [],
          badges: [
            {
              content: 'New!',
              backgroundColor: 'blue',
              textColor: 'blue',
            },
          ],
        });

        // @ts-ignore
        expect(markdown.content).toMatchMarkdown('# Testing');
      });
    });
  });
});
