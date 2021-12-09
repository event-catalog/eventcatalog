import {
  getAllEvents,
  getEventByName,
  getUniqueServicesNamesFromEvents,
  getAllEventsByOwnerId,
  getAllEventsThatHaveRelationshipWithService,
} from '../events'

import path from 'path'
import fs from 'fs'

let PROJECT_DIR: any

describe('events lib', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR
    process.env.PROJECT_DIR = path.join(__dirname, 'assets')
  })

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR
  })

  describe('getEventByName', () => {
    it('returns an event and markdown by the given event name', async () => {
      const { event, markdown } = await getEventByName('AddedItemToCart')

      expect(event).toEqual({
        name: 'AddedItemToCart',
        version: '0.0.1',
        summary:
          'Holds information about the cusomer and product when they add an item to the cart.\n',
        producers: ['Shopping API', 'Application API'],
        consumers: ['Customer Portal'],
        owners: ['dboyne', 'mSmith'],
        schema: null,
        examples: [],
      })

      //@ts-ignore
      expect(markdown.content).toMatchMarkdown('# Testing')
      expect(markdown.lastModifiedDate).toEqual('2021/12/8')
    })

    it('returns the schema and examples of the event as empty if no schema or examples are found', async () => {
      const { event } = await getEventByName('AddedItemToCart')

      expect(event.schema).toEqual(null)
      expect(event.examples).toEqual([])
    })

    it('returns the schema if there is a `schema` file is found in directory of the event', async () => {
      const { event } = await getEventByName('EventWithSchemaAndExamples')

      const schema = `{
            "some-schema": true,
            "does-not-really-matter-what-content-is-in-this-file": true
        }`

      //@ts-ignore
      expect(event.schema.snippet).toMatchMarkdown(schema)
      expect(event.schema.language).toEqual('json')
    })

    it('returns all event examples (files) when examples directory is found within the event folder', async () => {
      const { event } = await getEventByName('EventWithSchemaAndExamples')

      const example1 = event.examples[0]
      const example2 = event.examples[1]

      const example1File = fs.readFileSync(
        path.join(
          process.env.PROJECT_DIR,
          'events',
          'EventWithSchemaAndExamples',
          'examples',
          'Basic.cs'
        ),
        { encoding: 'utf-8' }
      )
      const example2File = fs.readFileSync(
        path.join(
          process.env.PROJECT_DIR,
          'events',
          'EventWithSchemaAndExamples',
          'examples',
          'Basic.js'
        ),
        { encoding: 'utf-8' }
      )

      expect(event.examples).toHaveLength(2)

      expect(example1.name).toEqual('Basic.cs')
      expect(example1.langugage).toEqual('csharp')
      expect(example1.snippet).toEqual(example1File)

      expect(example2.name).toEqual('Basic.js')
      expect(example2.langugage).toEqual('javascript')
      expect(example2.snippet).toEqual(example2File)
    })

    it('returns undefined when not being able to find an event', async () => {
      const data = await getEventByName('EventThatDoesNotExist')
      expect(data).toEqual(undefined)
    })
  })

  describe('getAllEvents', () => {
    it('gets all the events (in the PROJECT_DIR events dir)', async () => {
      const events = await getAllEvents()

      expect(events).toEqual([
        {
          name: 'AddedItemToCart',
          version: '0.0.1',
          summary:
            'Holds information about the cusomer and product when they add an item to the cart.\n',
          producers: ['Shopping API', 'Application API'],
          consumers: ['Customer Portal'],
          owners: ['dboyne', 'mSmith'],
        },
        {
          name: 'EmailSent',
          version: '0.0.1',
          summary: 'Tells us when an email has been sent\n',
          producers: ['Email Platform'],
          consumers: [],
          owners: ['dboyne', 'mSmith'],
        },
        {
          name: 'EventWithSchemaAndExamples',
          version: '0.0.1',
          summary: 'Example event with schema and examples\n',
          producers: [],
          consumers: [],
          owners: [],
        },
      ])
    })
  })

  describe('getUniqueServicesNamesFromEvents', () => {
    it('returns an empty array when no services can be found in the array of events', () => {
      const events = [
        { name: 'Testing', version: '1.0.0' },
        { name: 'Testing', version: '2.0.0' },
      ]

      const result = getUniqueServicesNamesFromEvents(events)

      expect(result).toEqual([])
    })

    it('takes an array of events and only returns unique service names', () => {
      const events = [
        {
          name: 'Testing',
          version: '1.0.0',
          consumers: ['Service 1', 'Service 2'],
          producers: ['Service 3'],
        },
        {
          name: 'Testing',
          version: '2.0.0',
          consumers: ['Service 2', 'Service 3'],
          producers: ['Service 4'],
        },
        { name: 'Testing', version: '3.0.0', consumers: ['Service 3', 'Service 4'] },
      ]

      const result = getUniqueServicesNamesFromEvents(events)

      expect(result).toEqual(['Service 1', 'Service 2', 'Service 3', 'Service 4'])
    })
  })

  describe('getAllEventsByOwnerId', () => {
    it('returns empty array when no owner is found', async () => {
      const events = await getAllEventsByOwnerId('made-up-user')
      expect(events).toEqual([])
    })

    it('returns all the events for a given owner id', async () => {
      const events = await getAllEventsByOwnerId('dboyne')

      expect(events).toEqual([
        {
          name: 'AddedItemToCart',
          version: '0.0.1',
          summary:
            'Holds information about the cusomer and product when they add an item to the cart.\n',
          producers: ['Shopping API', 'Application API'],
          consumers: ['Customer Portal'],
          owners: ['dboyne', 'mSmith'],
        },
        {
          name: 'EmailSent',
          version: '0.0.1',
          summary: 'Tells us when an email has been sent\n',
          producers: ['Email Platform'],
          consumers: [],
          owners: ['dboyne', 'mSmith'],
        },
      ])
    })
  })

  describe('getAllEventsThatHaveRelationshipWithService', () => {
    it('returns the relationships between events for a given service', () => {
      const events = [
        {
          name: 'AddedItemToCart',
          version: '0.0.1',
          summary:
            'Holds information about the cusomer and product when they add an item to the cart.\n',
          producers: ['Shopping API', 'My Service'],
          consumers: ['Customer Portal'],
          owners: ['dboyne', 'mSmith'],
        },
      ]

      const service = {
        id: 'My Service',
        name: 'My Service',
        summary: 'Test Service',
      }

      const result = getAllEventsThatHaveRelationshipWithService(service, events)

      expect(result).toEqual({
        publishes: [
          {
            name: 'AddedItemToCart',
            version: '0.0.1',
            summary:
              'Holds information about the cusomer and product when they add an item to the cart.\n',
            producers: ['Shopping API', 'My Service'],
            consumers: ['Customer Portal'],
            owners: ['dboyne', 'mSmith'],
          },
        ],
        subscribes: [],
      })
    })

    it('if no relationships for given service and events can be found then empty arrays are returned', () => {
      const events = [
        {
          name: 'AddedItemToCart',
          version: '0.0.1',
          summary:
            'Holds information about the cusomer and product when they add an item to the cart.\n',
          producers: ['Shopping API', 'Service'],
          consumers: ['Customer Portal'],
          owners: ['dboyne', 'mSmith'],
        },
      ]

      const service = {
        id: 'My Other Service That Has No Consumers or Anything',
        name: 'My Other Service That Has No Consumers or Anything',
        summary: 'Test Service',
      }

      const result = getAllEventsThatHaveRelationshipWithService(service, events)

      expect(result).toEqual({ publishes: [], subscribes: [] })
    })
  })
})
