import path from 'path';
import {
  getAllDomains,
  getAllDomainsByOwnerId,
  getAllEventsFromDomains,
  getAllServicesFromDomains,
  getDomainByName,
} from '../domains';

let PROJECT_DIR: any;

describe('domains lib', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR;
    process.env.PROJECT_DIR = path.join(__dirname, 'assets');
  });

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR;
  });

  describe('getAllEventsFromDomains', () => {
    it('returns all the events within every domain folder in the catalog', async () => {
      const events = await getAllEventsFromDomains();
      expect(events).toEqual([
        {
          name: 'UserCreated',
          version: '0.0.1',
          summary: 'Holds information about when the user has been created.\n',
          domain: 'User',
          producerNames: ['Application API'],
          consumerNames: ['Customer Portal'],
          owners: ['dboyne', 'mSmith'],
          externalLinks: [],
          tags: [],
          historicVersions: [],
          badges: [
            {
              content: 'New!',
              backgroundColor: 'blue',
              textColor: 'blue',
            },
          ],
        },
        {
          name: 'UserRemoved',
          version: '0.0.1',
          summary: 'Holds information about when the user has been removed.\n',
          domain: 'User',
          producerNames: ['Application API'],
          consumerNames: ['Customer Portal'],
          owners: ['dboyne', 'mSmith'],
          externalLinks: [],
          tags: [],
          historicVersions: [],
          badges: [],
        },
      ]);
    });
  });
  describe('getAllServicesFromDomains', () => {
    it('returns all the services within every domain folder in the catalog', async () => {
      const services = await getAllServicesFromDomains();

      expect(services).toEqual([
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

  describe('getDomainByName', () => {
    it('returns domain information for a given domain name', async () => {
      const { domain, markdown } = await getDomainByName({ domainName: 'User' });

      expect(domain).toEqual({
        name: 'User',
        summary: 'User Domain\n',
        owners: ['dboyne', 'mSmith'],
        tags: [],
        externalLinks: [],
        badges: [
          {
            content: 'New!',
            backgroundColor: 'blue',
            textColor: 'blue',
          },
        ],
        events: [
          {
            name: 'UserCreated',
            version: '0.0.1',
            summary: 'Holds information about when the user has been created.\n',
            domain: 'User',
            producerNames: ['Application API'],
            consumerNames: ['Customer Portal'],
            owners: ['dboyne', 'mSmith'],
            externalLinks: [],
            tags: [],
            historicVersions: [],
            badges: [
              {
                content: 'New!',
                backgroundColor: 'blue',
                textColor: 'blue',
              },
            ],
            producers: [
              {
                name: 'Application API',
              },
            ],
            consumers: [
              {
                name: 'Customer Portal',
              },
            ],
          },
          {
            name: 'UserRemoved',
            version: '0.0.1',
            summary: 'Holds information about when the user has been removed.\n',
            domain: 'User',
            producerNames: ['Application API'],
            consumerNames: ['Customer Portal'],
            owners: ['dboyne', 'mSmith'],
            externalLinks: [],
            tags: [],
            historicVersions: [],
            badges: [],
            producers: [
              {
                name: 'Application API',
              },
            ],
            consumers: [
              {
                name: 'Customer Portal',
              },
            ],
          },
        ],
        services: [
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
        ],
      });
      // @ts-ignore
      expect(markdown.content).toMatchMarkdown('# Testing');
    });
  });

  describe('getAllDomains', () => {
    it('returns all domains within the catalog', async () => {
      const domains = await getAllDomains();
      const data = domains.map((item) => item.domain);

      expect(data).toEqual([
        {
          name: 'User',
          summary: 'User Domain\n',
          owners: ['dboyne', 'mSmith'],
          tags: [],
          externalLinks: [],
          badges: [
            {
              content: 'New!',
              backgroundColor: 'blue',
              textColor: 'blue',
            },
          ],
          events: [
            {
              name: 'UserCreated',
              version: '0.0.1',
              summary: 'Holds information about when the user has been created.\n',
              domain: 'User',
              producerNames: ['Application API'],
              consumerNames: ['Customer Portal'],
              owners: ['dboyne', 'mSmith'],
              externalLinks: [],
              tags: [],
              historicVersions: [],
              badges: [
                {
                  content: 'New!',
                  backgroundColor: 'blue',
                  textColor: 'blue',
                },
              ],
              producers: [
                {
                  name: 'Application API',
                },
              ],
              consumers: [
                {
                  name: 'Customer Portal',
                },
              ],
            },
            {
              name: 'UserRemoved',
              version: '0.0.1',
              summary: 'Holds information about when the user has been removed.\n',
              domain: 'User',
              producerNames: ['Application API'],
              consumerNames: ['Customer Portal'],
              owners: ['dboyne', 'mSmith'],
              externalLinks: [],
              historicVersions: [],
              tags: [],
              badges: [],
              producers: [
                {
                  name: 'Application API',
                },
              ],
              consumers: [
                {
                  name: 'Customer Portal',
                },
              ],
            },
          ],
          services: [
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
          ],
        },
      ]);
    });
  });

  describe('getAllDomainsByOwnerId', () => {
    it('returns empty array when no owner is found', async () => {
      const domains = await getAllDomainsByOwnerId('made-up-user');
      expect(domains).toEqual([]);
    });

    it('returns all the domains for a given owner id', async () => {
      const domains = await getAllDomainsByOwnerId('dboyne');

      expect(domains).toEqual([
        {
          name: 'User',
          summary: 'User Domain\n',
          owners: ['dboyne', 'mSmith'],
          tags: [],
          externalLinks: [],
          badges: [
            {
              content: 'New!',
              backgroundColor: 'blue',
              textColor: 'blue',
            },
          ],
          events: [
            {
              name: 'UserCreated',
              version: '0.0.1',
              summary: 'Holds information about when the user has been created.\n',
              domain: 'User',
              producerNames: ['Application API'],
              consumerNames: ['Customer Portal'],
              owners: ['dboyne', 'mSmith'],
              externalLinks: [],
              tags: [],
              historicVersions: [],
              badges: [
                {
                  content: 'New!',
                  backgroundColor: 'blue',
                  textColor: 'blue',
                },
              ],
              producers: [
                {
                  name: 'Application API',
                },
              ],
              consumers: [
                {
                  name: 'Customer Portal',
                },
              ],
            },
            {
              name: 'UserRemoved',
              version: '0.0.1',
              summary: 'Holds information about when the user has been removed.\n',
              domain: 'User',
              producerNames: ['Application API'],
              consumerNames: ['Customer Portal'],
              owners: ['dboyne', 'mSmith'],
              externalLinks: [],
              tags: [],
              historicVersions: [],
              badges: [],
              producers: [
                {
                  name: 'Application API',
                },
              ],
              consumers: [
                {
                  name: 'Customer Portal',
                },
              ],
            },
          ],
          services: [
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
          ],
        },
      ]);
    });
  });
});
