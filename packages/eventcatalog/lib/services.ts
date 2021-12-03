import fs from 'fs'
import path from 'path'
import { serialize } from 'next-mdx-remote/serialize'
import { readMarkdownFile } from '@/lib/file-reader'
import { MarkdownFile } from '../types/index'
import config from '../eventcatalog.config';

import { Service } from '@eventcatalogtest/types'

import { getAllEvents, getAllEventsThatPublishAndSubscribeToService } from '@/lib/events';

const servicesDir = config.servicesDir || path.join(process.cwd(), 'services');

console.log('servicesDir', servicesDir)

const buildService = (eventFrontMatter:any): Service => {
  const { id, name, summary, owners = [] } = eventFrontMatter
  return { id, name, summary, owners }
}

export const getAllServices = (): Service[] => {
  const folders = fs.readdirSync(servicesDir)
  const services =  folders.map((folder) => readMarkdownFile(path.join(servicesDir, folder, 'index.md')))
  const events = getAllEvents();

  const parsedServices = services.map(frontMatter => buildService(frontMatter.data));

  //@ts-ignore
  return parsedServices.map(service => {
    return {
      ...service,
      ...getAllEventsThatPublishAndSubscribeToService(service, events)
    }
  })
}

export const getAllServicesByOwnerId = async (ownerId): Promise<Service[]> => {
  const services = await getAllServices()
  const servicesOwnedByUser = services.filter((service) =>
    service.owners.some((id) => id === ownerId)
  )
  return servicesOwnedByUser.map((service) => {
    return {
      ...service,
    }
  })
}

export const getServiceByName = async (serviceName): Promise<{ service: Service, markdown: MarkdownFile }> => {

  const serviceDirectory = path.join(servicesDir, serviceName)
  const { data, content } = readMarkdownFile(path.join(serviceDirectory, `index.md`));
  const service = buildService(data);

  const events = getAllEvents();

  const mdxSource = await serialize(content)

  return {
    //@ts-ignore
    service: {
      ...service,
      ...getAllEventsThatPublishAndSubscribeToService(service, events)
    },
    markdown: {
      content,
      lastModifiedDate: '200',
      source: mdxSource,
    },
  }
}
