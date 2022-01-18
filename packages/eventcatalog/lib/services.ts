import fs from 'fs';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import { Service } from '@eventcatalog/types';
import { readMarkdownFile, getLastModifiedDateOfFile } from '@/lib/file-reader';
import { MarkdownFile } from '../types/index';

import { getAllEvents, getAllEventsThatHaveRelationshipWithService } from '@/lib/events';

const buildService = (eventFrontMatter: any): Service => {
  const { name, summary, owners = [], repository = {}, tags = [], externalLinks = [] } = eventFrontMatter;
  return { name, summary, owners, repository, tags, externalLinks };
};

export const getAllServices = (): Service[] => {
  const servicesDir = path.join(process.env.PROJECT_DIR, 'services');

  const folders = fs.readdirSync(servicesDir);
  const services = folders.map((folder) => readMarkdownFile(path.join(servicesDir, folder, 'index.md')));
  const events = getAllEvents();

  const parsedServices = services.map((frontMatter) => buildService(frontMatter.data));

  // @ts-ignore
  return parsedServices.map((service) => ({
    ...service,
    ...getAllEventsThatHaveRelationshipWithService(service, events),
  }));
};

export const getAllServicesByOwnerId = async (ownerId): Promise<Service[]> => {
  const services = await getAllServices();
  const servicesOwnedByUser = services.filter((service) => service.owners.some((id) => id === ownerId));
  return servicesOwnedByUser.map((service) => ({
    ...service,
  }));
};

export const getServiceByName = async (serviceName): Promise<{ service: Service; markdown: MarkdownFile }> => {
  try {
    const servicesDir = path.join(process.env.PROJECT_DIR, 'services');
    const serviceDirectory = path.join(servicesDir, serviceName);
    const { data, content } = readMarkdownFile(path.join(serviceDirectory, `index.md`));
    const service = buildService(data);

    const events = getAllEvents();

    const mdxSource = await serialize(content);

    return {
      // @ts-ignore
      service: {
        ...service,
        ...getAllEventsThatHaveRelationshipWithService(service, events),
      },
      markdown: {
        content,
        lastModifiedDate: getLastModifiedDateOfFile(path.join(serviceDirectory, `index.md`)),
        source: mdxSource,
      },
    };
  } catch (error) {
    console.log('Failed to get service by name', serviceName);
    return Promise.reject();
  }
};
