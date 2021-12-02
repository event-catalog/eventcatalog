import fs from 'fs'
import path from 'path'
import { serialize } from 'next-mdx-remote/serialize'

import { Event, Service, MarkdownFile } from '@/types/index'

const projectDir = process.env.PROJECT_DIR || path.join(process.cwd(), 'examples/basic')

import { getLastModifiedDateOfFile, getSchemaFromDir, readMarkdownFile } from '@/lib/file-reader';

// https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/AVAILABLE_LANGUAGES_HLJS.MD
const extentionToLanguageMap = {
  cs: 'csharp',
  js: 'javascript',
  json: 'json',
  yml: 'yml',
  java: 'java',
}

const parseEventFrontMatterIntoEvent = (eventFrontMatter:any): Event => {
  const { name, version, summary, producers = [], consumers = [], domains = [], owners = [] } = eventFrontMatter
  return { name, version, summary, producers, consumers, domains, owners }
}


export const getAllEvents = (): Event[] => {
  const folders = fs.readdirSync(path.join(projectDir, 'events'))
  return folders.map((folder) => {
    const { data } = readMarkdownFile(path.join(projectDir, 'events', folder, 'index.md'))
    return parseEventFrontMatterIntoEvent(data);
  })
}


export const getEventByName = async (eventName): Promise<{ event: Event, markdown: MarkdownFile}> => {
  
  const eventDirectory = path.join(projectDir, 'events', eventName)
  const { data, content } = readMarkdownFile(path.join(eventDirectory, `index.md`));
  const event = parseEventFrontMatterIntoEvent(data);

  const mdxSource = await serialize(content)

  return {
    event: {
      ...event,
      schema: getSchemaFromDir(eventDirectory),
      examples: getEventExamplesFromDir(path.join(eventDirectory, `examples`)),
    },
    markdown: {
      content,
      source: mdxSource,
      lastModifiedDate: getLastModifiedDateOfFile(path.join(eventDirectory, `index.md`)),
    },
  }
}

export const getAllDomainsFromEvents = (events: Event[]) => {
  return events.reduce((domains, event) => {
    return domains.concat(event.domains)
  }, [])
}

export const getAllServicesNamesFromEvents = (events: Event[]) => {
  const allConsumersAndProducers = events.reduce((domains, event) => {
    const { consumers = [], producers = [] } = event;
    return domains.concat(consumers).concat(producers)
  }, [])

  return allConsumersAndProducers.map((service) => service)
}

export const getEventExamplesFromDir = (pathToExamples) => {
  let examples

  // Get examples for directory
  try {
    const files = fs.readdirSync(pathToExamples)
    examples = files.map((filename) => {
      const content = fs.readFileSync(path.join(pathToExamples, filename), {
        encoding: 'utf-8',
      })

      const extension = filename.split('.').pop()

      return {
        name: filename,
        snippet: content,
        langugage: extentionToLanguageMap[extension],
      }
    })
  } catch (error) {
    examples = []
  }

  return examples
}

export const getAllEventsByOwnerId = async (ownerId) => {
  const events = await getAllEvents()
  return events.filter(({ owners = []}) => owners.some((id) => id === ownerId))
}


export const getAllEventsThatPublishAndSubscribeToService = (service: Service, events: Event[]): { publishes: Event[], subscribes: Event[]} => {

  const relationshipsBetweenEvents = events.reduce((data, event) => {

    const serviceSubscribesToEvent = event.consumers.some((id) => id === service.id)
    const servicePublishesEvent = event.producers.some((id) => id === service.id)

    return {
       publishes: servicePublishesEvent ? data.publishes.concat(event) : data.publishes,
       subscribes: serviceSubscribesToEvent ? data.subscribes.concat(event) : data.subscribes,
    }
  }, { publishes: [], subscribes: []})


  return relationshipsBetweenEvents;

}