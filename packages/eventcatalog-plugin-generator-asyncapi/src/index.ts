import chalk from 'chalk'
import type { Event, Service, LoadContext, PluginOptions } from '@eventcatalogtest/types';
import { parse, AsyncAPIDocument } from '@asyncapi/parser'
import fs from 'fs-extra'
import path from 'path'

import { buildEventMarkdownFile, buildServiceMarkdownFile } from './markdown-builder'

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument): Service => {
  return {
    //TODO: do we need id?
    id: doc.info().title(),
    name: doc.info().title(),
    summary: doc.info().description() || ''
  }
}

const getAllEventsFromAsyncDoc = (doc: AsyncAPIDocument): Event[] => {
  const channels = doc.channels()
  return Object.keys(channels).reduce(
    (data: any, channelName) => {
      const service = doc.info().title()

      const channel = channels[channelName]
      const operation = channel.hasSubscribe() ? 'subscribe' : 'publish'

      const messages = channel[operation]().messages()

      const eventsFromMessages = messages.map((message) => {
        const messageName = message.extension('x-parser-message-name')
        return {
          name: messageName,
          summary: message.summary(),
          version: doc.info().version(),
          producers: operation === 'subscribe' ? [service] : [],
          consumers: operation === 'publish' ? [service] : [],
        }
      })

      return data.concat(eventsFromMessages);

    },
    []
  )
}

// TODO: move this into somewhere else
const writeServiceToMarkdown = async (serviceDir: any, service: any) => {
  const serviceFolder = path.join(serviceDir, service.name)
  await fs.ensureDir(serviceFolder)
  fs.writeFileSync(path.join(serviceFolder, 'index.md'), buildServiceMarkdownFile(service))
}

// TODO: move this into somewhere else
const writeEventsToMarkdown = async (eventsDir: string, events: any) => {
  const eventFiles = events.map(async (event: any) => {
    const eventFolder = path.join(eventsDir, event.name);
    await fs.ensureDir(eventFolder)
    fs.writeFileSync(path.join(eventFolder, 'index.md'), buildEventMarkdownFile(event))
  });
  Promise.all(eventFiles);
}

export default async (context: LoadContext, options: PluginOptions) => {

  const { file } = options

  //@ts-ignore
  const eventsDir = path.join(process.env.PROJECT_DIR, 'events')
  //@ts-ignore
  const servicesDir = path.join(process.env.PROJECT_DIR, 'services')

  let asyncAPIFile, doc

  if (!file) {
    throw new Error('No file provided in plugin.')
  }

  try {
    asyncAPIFile = fs.readFileSync(file, 'utf-8')
  } catch (error: any) {
    throw new Error(`Failed to read file with provided path`)
  }

  try {
    doc = await parse(asyncAPIFile)
  } catch (e) {
    throw e
  }

  const service = getServiceFromAsyncDoc(doc)
  const events = getAllEventsFromAsyncDoc(doc)

  await writeServiceToMarkdown(servicesDir, service)
  await writeEventsToMarkdown(eventsDir, events);

  console.log(
    chalk.green(`
Succesfully parsed AsyncAPI document: Events ${events.length}, Services: 1
    `)
  )

}
