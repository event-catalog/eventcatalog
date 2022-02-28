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
          externalLinks: [
            {
              label: 'AsyncAPI Specification',
              url: 'https://studio.asyncapi.com/#schema-lightMeasuredPayload',
            },
          ],
          name: 'Basket Service',
          owners: ['mSmith'],
          publishes: [],
          repository: {
            language: 'JavaScript',
            url: 'https://github.com/boyney123/pretend-basket-service',
          },
          subscribes: [],
          domain: null,
          summary: 'CRUD based API to handle Basket interactions for users of the shopping website.\n',
          tags: [],
        },
        {
          name: 'Email Platform',
          summary: 'Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS\n',
          owners: ['dboyne'],
          domain: null,
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
              externalLinks: [],
              historicVersions: [],
              domain: null,
              owners: ['dboyne', 'mSmith'],
            },
          ],
          subscribes: [],
          externalLinks: [],
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
              domain: null,
              externalLinks: [],
              owners: ['dboyne', 'mSmith'],
            },
          ],
          subscribes: [],
          externalLinks: [],
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
            domain: null,
            externalLinks: [],
            owners: ['dboyne', 'mSmith'],
          },
        ],
        subscribes: [],
        externalLinks: [],
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
        });

        // @ts-ignore
        expect(markdown.content).toMatchMarkdown('# Testing');
      });
    });
  });
});
