import fs from 'fs';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import { Service, Event } from '@eventcatalog/types';
import { readMarkdownFile, getLastModifiedDateOfFile } from '@/lib/file-reader';
import { MarkdownFile } from '../types/index';

import { getAllEvents, getAllEventsThatHaveRelationshipWithService } from '@/lib/events';
import { getAllServicesFromDomains } from '@/lib/domains';

const buildService = (eventFrontMatter: any): Service => {
  const { name, summary, domain = null, owners = [], repository = {}, tags = [], externalLinks = [] } = eventFrontMatter;
  return { name, summary, domain, owners, repository, tags, externalLinks };
};

export const getServiceByPath = (serviceDirPath: string): Service => {
  const { data } = readMarkdownFile(path.join(serviceDirPath, 'index.md'));
  return buildService(data);
};

export const getAllServicesFromPath = (serviceDir: string): Service[] => {
  if (!fs.existsSync(serviceDir)) return [];
  const folders = fs.readdirSync(serviceDir);
  const events = getAllEvents();
  const services = folders.map((folder) => getServiceByPath(path.join(serviceDir, folder)));

  // // @ts-ignore
  return services.map((service) => ({
    ...service,
    ...getAllEventsThatHaveRelationshipWithService(service, events),
  }));
};

export const getAllServices = (): Service[] => {
  const allServicesFromDomainFolders = getAllServicesFromDomains();
  const servicesWithoutDomains = getAllServicesFromPath(path.join(process.env.PROJECT_DIR, 'services'));

  const services = [...allServicesFromDomainFolders, ...servicesWithoutDomains];
  const sortedServices = services.sort((a, b) => a.name.localeCompare(b.name));
  return sortedServices;
};

export const getAllServicesByOwnerId = async (ownerId): Promise<Service[]> => {
  const services = await getAllServices();
  const servicesOwnedByUser = services.filter((service) => service.owners.some((id) => id === ownerId));
  return servicesOwnedByUser.map((service) => ({
    ...service,
  }));
};

export const getServiceByName = async ({
  serviceName,
  domain = null,
}: {
  serviceName: string;
  domain?: string;
}): Promise<{ service: Service; markdown: MarkdownFile }> => {
  try {
    let servicesDir = path.join(process.env.PROJECT_DIR, 'services');

    if (domain) {
      servicesDir = path.join(process.env.PROJECT_DIR, 'domains', domain, 'services');
    }

    const serviceDirectory = path.join(servicesDir, serviceName);
    const { data, content } = readMarkdownFile(path.join(serviceDirectory, `index.md`));
    const service = buildService(data);

    const events = getAllEvents();

    const mdxSource = await serialize(content);

    return {
      // @ts-ignore
      service: {
        ...service,
        domain,
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

export const hydrateEventProducersAndConsumers = (
  event: Event,
  services: Service[]
): { producers: Service[]; consumers: Service[] } => {
  const findServiceByName = (name) => services.find((service) => service.name === name);

  const producers = event.producerNames.map((name) => findServiceByName(name)).filter((service) => !!service);
  const consumers = event.consumerNames.map((name) => findServiceByName(name)).filter((service) => !!service);

  return {
    producers: producers.length > 0 ? producers : [],
    consumers: consumers.length > 0 ? consumers : [],
  };
};
