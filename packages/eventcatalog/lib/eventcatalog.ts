import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { serialize } from 'next-mdx-remote/serialize'

export const getAllEvents = () => {
  const projectDir = process.env.PROJECT_DIR || process.cwd()

  const folders = fs.readdirSync(path.join(projectDir, 'events'))
  const files = folders.map((folder) =>
    fs.readFileSync(path.join(projectDir, 'events', folder, 'index.md'), {
      encoding: 'utf-8',
    })
  )

  return files.map((file) => matter(file).data)
}

export const getAllServices = () => {
  const projectDir = process.env.PROJECT_DIR || process.cwd()

  const folders = fs.readdirSync(path.join(projectDir, 'services'))
  const files = folders.map((folder) =>
    fs.readFileSync(path.join(projectDir, 'services', folder, 'index.md'), {
      encoding: 'utf-8',
    })
  )

  return files.map((file) => matter(file))
}

export const getServiceBySlug = async (slug) => {

  const services = getAllServices();
  const service = services.find(service => service.data.slug === slug);

  const { data, content } = service;

  const mdxSource = await serialize(content)

  return {
    ...data,
    content,
    source: mdxSource,
    lastModifiedDate: '2000'
  }
}

export const getAllEventsThatPublishAndSubscribeToService = async (serviceId: string) => {
  const events = await getAllEvents();

  return events.reduce((relationships, event) => {

    const isProducerOfEvent = event.producers.some(id => id === serviceId);
    const isConsumerOfEvent = event.consumers.some(id => id === serviceId);

    return {
      listOfEventsServicePublishes: isProducerOfEvent ? relationships.listOfEventsServicePublishes.concat([event.name]) : relationships.listOfEventsServicePublishes,
      listOfEventsServiceSubscribesTo: isConsumerOfEvent ? relationships.listOfEventsServiceSubscribesTo.concat([event.name]) : relationships.listOfEventsServiceSubscribesTo,
    }
  }, { listOfEventsServicePublishes: [], listOfEventsServiceSubscribesTo: [] });
}

export const getEventById = async (eventName) => {

  const projectDir = process.env.PROJECT_DIR || process.cwd()

  const eventDirectory = path.join(projectDir, 'events', eventName)

  const eventMarkdownFile = fs.readFileSync(path.join(eventDirectory, `index.md`), 'utf8')
  const { data, content } = matter(eventMarkdownFile)

  const stats = fs.statSync(path.join(eventDirectory, `index.md`))
  const lastModifiedDate = new Date(stats.mtime)

  const schemaRaw = fs.readFileSync(path.join(eventDirectory, `schema.json`), 'utf8')
  const schema = JSON.parse(schemaRaw)

  const mdxSource = await serialize(content)

  return {
    event: eventName,
    schema,
    ...data,
    content,
    source: mdxSource,
    lastModifiedDate: `${lastModifiedDate.getFullYear()}/${
      lastModifiedDate.getMonth() + 1
    }/${lastModifiedDate.getDate()}`,
  }
}

export const getAllDomainsFromEvents = (events) => {
  return events.reduce((domains, event) => {
    return domains.concat(event.domains)
  }, [])
}

export const getAllServicesFromEvents = (events) => {

  const allConsumersAndProducers = events.reduce((domains, event) => {
    return domains.concat(event.consumers).concat(event.producers)
  }, [])

  return allConsumersAndProducers.map((service) => service)

}