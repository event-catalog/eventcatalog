import { getAllServices, getAllServicesByOwnerId, getServiceByName } from '../services'

import path from 'path'
import fs from 'fs'

let PROJECT_DIR: any

describe('services', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR
    process.env.PROJECT_DIR = path.join(__dirname, 'assets')
  })

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR
  })

  describe('getAllServices', () => {
    it('gets all the services (in the PROJECT_DIR services dir)', async () => {
      const services = await getAllServices()

      expect(services).toEqual([
        {
          id: 'Email Platform',
          name: 'Email Platform',
          summary:
            'Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS\n',
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
          publishes: [
            {
              name: 'EmailSent',
              version: '0.0.1',
              summary: 'Tells us when an email has been sent\n',
              producers: ['Email Platform'],
              consumers: [],
              owners: ['dboyne', 'mSmith'],
            },
          ],
          subscribes: [],
        },
      ])
    })
  })

  describe('getAllServicesByOwnerId', () => {
    it('returns empty array when no owner is found', async () => {
      const services = await getAllServicesByOwnerId('made-up-user')
      expect(services).toEqual([])
    })

    it('returns all the services for a given owner id', async () => {
      const services = await getAllServicesByOwnerId('dboyne')

      expect(services).toEqual([
        {
          id: 'Email Platform',
          name: 'Email Platform',
          summary:
            'Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS\n',
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
          publishes: [
            {
              name: 'EmailSent',
              version: '0.0.1',
              summary: 'Tells us when an email has been sent\n',
              producers: ['Email Platform'],
              consumers: [],
              owners: ['dboyne', 'mSmith'],
            },
          ],
          subscribes: [],
        },
      ])
    })
  })

  describe('getServiceByName', () => {
    it('returns an event and markdown by the given event name', async () => {
      const { service, markdown } = await getServiceByName('Email Platform')

      expect(service).toEqual({
        id: 'Email Platform',
        name: 'Email Platform',
        summary:
          'Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS\n',
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
        publishes: [
          {
            name: 'EmailSent',
            version: '0.0.1',
            summary: 'Tells us when an email has been sent\n',
            producers: ['Email Platform'],
            consumers: [],
            owners: ['dboyne', 'mSmith'],
          },
        ],
        subscribes: [],
      })

      //@ts-ignore
      expect(markdown.content).toMatchMarkdown('# Testing')
      expect(markdown.lastModifiedDate).toEqual('2021/12/9')
    })

    it('returns undefined when not being able to find an service', async () => {
      const data = await getServiceByName('ServiceThatDoesNotExist')
      expect(data).toEqual(undefined)
    })
  })
})
