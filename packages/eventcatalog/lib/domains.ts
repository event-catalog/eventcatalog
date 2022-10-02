import type { Event } from '@eventcatalog/types';
import { Domain } from '@eventcatalog/types';
import fs from 'fs';
import { serialize } from 'next-mdx-remote/serialize';
import path from 'path';
import { getLastModifiedDateOfFile, readMarkdownFile } from '@/lib/file-reader';
import { MarkdownFile } from '../types/index';
import { getAllEventsFromPath } from './events';
import { getAllServicesFromPath } from './services';

const buildDomain = (domainFrontMatter: any): Domain => {
  const { name, summary, owners = [], tags = [], externalLinks = [], badges = [] } = domainFrontMatter;
  return { name, summary, owners, tags, externalLinks, badges };
};

export const getUniqueDomainNamesFromEvents = (events: Event[]) => {
  const allDomains = events.filter((event) => !!event.domain).map((event) => event.domain);
  // @ts-ignore
  return [...new Set(allDomains)];
};

export const getAllDomainsByOwnerId = async (ownerId): Promise<Domain[]> => {
  const domainsWithMarkdown = await getAllDomains();

  const domains = domainsWithMarkdown.map((item) => item.domain);
  const domainsOwnedByUser = domains.filter((domain) => domain.owners.some((id) => id === ownerId));
  return domainsOwnedByUser.map((domain) => ({
    ...domain,
  }));
};

export const getAllEventsFromDomains = (hydrate?: boolean) => {
  const domainsDir = path.join(process.env.PROJECT_DIR, 'domains');

  if (!fs.existsSync(domainsDir)) return [];

  const domains = fs.readdirSync(domainsDir);

  return domains.reduce((allEventsFromDomains, domainFolder) => {
    const domainDir = path.join(domainsDir, domainFolder);
    const eventsForDomainDir = path.join(domainDir, 'events');
    const domainHasEvents = fs.existsSync(eventsForDomainDir);

    if (domainHasEvents) {
      const domainEvents = getAllEventsFromPath(eventsForDomainDir, hydrate);

      // Add domains onto events
      const eventsWithDomain = domainEvents.map((event) => ({ ...event, domain: domainFolder }));

      return [...allEventsFromDomains, ...eventsWithDomain];
    }

    return allEventsFromDomains;
  }, []);
};

export const getAllServicesFromDomains = () => {
  const domainsDir = path.join(process.env.PROJECT_DIR, 'domains');
  if (!fs.existsSync(domainsDir)) return [];
  const domains = fs.readdirSync(domainsDir);

  return domains.reduce((allServicesFromDomains, domainFolder) => {
    const domainDir = path.join(domainsDir, domainFolder);
    const servicesForDomainDir = path.join(domainDir, 'services');
    const domainHasServices = fs.existsSync(servicesForDomainDir);

    if (domainHasServices) {
      const domainServices = getAllServicesFromPath(servicesForDomainDir);

      // Add domains onto events
      const eventsWithDomain = domainServices.map((event) => ({ ...event, domain: domainFolder }));

      return [...allServicesFromDomains, ...eventsWithDomain];
    }

    return allServicesFromDomains;
  }, []);
};

export const getDomainByName = async ({
  domainName,
}: {
  domainName: string;
}): Promise<{ domain: Domain; markdown: MarkdownFile }> => {
  try {
    const domainsDir = path.join(process.env.PROJECT_DIR, 'domains');
    const domainDirectory = path.join(domainsDir, domainName);

    const { data, content } = readMarkdownFile(path.join(domainDirectory, `index.md`));
    const domain = buildDomain(data);

    const mdxSource = await serialize(content);

    const eventsForDomain = getAllEventsFromPath(path.join(domainDirectory, 'events'), true).map((event) => ({
      ...event,
      domain: domainName,
    }));

    const servicesForDomain = getAllServicesFromPath(path.join(domainDirectory, 'services')).map((service) => ({
      ...service,
      domain: domainName,
    }));

    return {
      // @ts-ignore
      domain: {
        ...domain,
        events: eventsForDomain,
        services: servicesForDomain,
      },
      markdown: {
        content,
        lastModifiedDate: getLastModifiedDateOfFile(path.join(domainDirectory, `index.md`)),
        source: mdxSource,
      },
    };
  } catch (error) {
    console.log('Failed to get domain by name', domainName);
    return Promise.reject();
  }
};

export const getDomainByPath = async (domainDirectory: string): Promise<{ domain: Domain; markdown: MarkdownFile }> => {
  const { data, content } = readMarkdownFile(path.join(domainDirectory, `index.md`));
  const domain = buildDomain(data);

  const mdxSource = await serialize(content);

  const eventsForDomain = getAllEventsFromPath(path.join(domainDirectory, 'events'), true).map((event) => ({
    ...event,
    domain: domain.name,
  }));
  const servicesForDomain = getAllServicesFromPath(path.join(domainDirectory, 'services')).map((service) => ({
    ...service,
    domain: domain.name,
  }));

  return {
    // @ts-ignore
    domain: {
      ...domain,
      events: eventsForDomain,
      services: servicesForDomain,
    },
    markdown: {
      content,
      lastModifiedDate: getLastModifiedDateOfFile(path.join(domainDirectory, `index.md`)),
      source: mdxSource,
    },
  };
};

export const getAllDomainsFromPath = async (domainsDir: string) => {
  if (!fs.existsSync(domainsDir)) return [];
  const folders = fs.readdirSync(domainsDir);
  const allDomains = folders.map((folder) => getDomainByPath(path.join(domainsDir, folder)));
  return Promise.all(allDomains);
};

export const getAllDomains = () => getAllDomainsFromPath(path.join(process.env.PROJECT_DIR, 'domains'));
