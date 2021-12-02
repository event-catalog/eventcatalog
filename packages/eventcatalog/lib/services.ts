import fs from 'fs'
import path from 'path'
import { serialize } from 'next-mdx-remote/serialize'
import { readMarkdownFile } from '@/lib/file-reader'
import { MarkdownFile, Service } from '../types/index'
import { getAllEvents, getAllEventsThatPublishAndSubscribeToService } from '@/lib/events';

const projectDir = process.env.PROJECT_DIR || path.join(process.cwd(), 'examples/basic')

const buildService = (eventFrontMatter:any): Service => {
  const { id, name, summary, owners = [] } = eventFrontMatter
  return { id, name, summary, owners }
}

export const getAllServices = (): Service[] => {
  const projectDir = process.env.PROJECT_DIR || path.join(process.cwd(), 'examples/basic')
  const folders = fs.readdirSync(path.join(projectDir, 'services'))
  const services =  folders.map((folder) => readMarkdownFile(path.join(projectDir, 'services', folder, 'index.md')))
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

export const getAllServicesByOwnerId = async (ownerId): Service[] => {
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

  const serviceDirectory = path.join(projectDir, 'services', serviceName)
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
