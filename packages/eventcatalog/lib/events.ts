import type { Event, Service } from '@eventcatalog/types';
import compareVersions from 'compare-versions';
import * as Diff from 'diff';
import fs from 'fs';
import { serialize } from 'next-mdx-remote/serialize';
import path from 'path';
import { MarkdownFile } from '@/types/index';
import { getLastModifiedDateOfFile, getSchemaFromDir, readMarkdownFile } from '@/lib/file-reader';
import { getAllDomains, getAllEventsFromDomains } from './domains';
import { extentionToLanguageMap } from './file-reader';
import { getAllServices, hydrateEventProducersAndConsumers } from './services';

const parseEventFrontMatterIntoEvent = (eventFrontMatter: any): Event => {
  const {
    name,
    version,
    summary,
    domain = null,
    producers = [],
    consumers = [],
    owners = [],
    externalLinks = [],
    badges = [],
    tags = [],
  } = eventFrontMatter;
  return {
    name,
    version,
    summary,
    domain,
    producerNames: producers,
    consumerNames: consumers,
    owners,
    externalLinks,
    badges,
    tags,
  };
};

const versionsForEvents = (pathToEvent) => {
  const versionsDir = path.join(pathToEvent, 'versioned');

  if (fs.existsSync(versionsDir)) {
    const files = fs.readdirSync(versionsDir);
    return files.sort(compareVersions).reverse();
  }

  return [];
};

export const getLogsForEvent = ({ eventName, domain }: { eventName: string; domain?: string }) => {
  let eventsDir = path.join(process.env.PROJECT_DIR, 'events');

  if (domain) {
    eventsDir = path.join(process.env.PROJECT_DIR, 'domains', domain, 'events');
  }

  const historicVersions = versionsForEvents(path.join(eventsDir, eventName));

  const allVersions = historicVersions.map((version) => ({
    version,
    pathToDir: path.join(eventsDir, eventName, 'versioned', version),
  }));

  // Get the latest version
  const { data: { version: latestVersion } = {} } = readMarkdownFile(path.join(eventsDir, eventName, 'index.md'));

  // Add the current version to the list
  allVersions.unshift({ version: latestVersion, pathToDir: path.join(eventsDir, eventName) });

  const versions = allVersions.reduce((diffs, versionData, index) => {
    const hasVersionToCompareToo = !!allVersions[index + 1];
    const previousVersionData = allVersions[index + 1];

    // Check if both files have the schema to compare against...
    if (hasVersionToCompareToo) {
      const { version, pathToDir } = versionData;
      const { version: previousVersion, pathToDir: previousVersionPathToDir } = previousVersionData;
      const schema = getSchemaFromDir(pathToDir);
      const previousSchema = getSchemaFromDir(previousVersionPathToDir);
      let changelog = null;

      try {
        const { content } = readMarkdownFile(path.join(previousVersionPathToDir, 'changelog.md'));
        changelog = content;
      } catch (error) {
        // nothing found it's OK.
        console.log('No changelog found');
      }

      const comparision = {
        versions: [previousVersion, version],
        changelog: {
          content: changelog,
        },
        value:
          schema && previousSchema
            ? Diff.createTwoFilesPatch(
                `schema.${schema.extension} (${previousVersion})`,
                `schema.${previousSchema.extension} (${version})`,
                previousSchema.snippet,
                schema.snippet
              )
            : null,
      };

      diffs.push(comparision);
    }

    return diffs;
  }, []);

  const parseChangeLogs = versions.map(async (version) => {
    if (version.changelog.content) {
      const mdxSource = await serialize(version.changelog.content);
      return {
        ...version,
        changelog: {
          ...version.changelog,
          source: mdxSource,
        },
      };
    }
    return version;
  });

  const values = Promise.all(parseChangeLogs);

  return values;
};

const getEventExamplesFromDir = (pathToExamples) => {
  let examples;

  // Get examples for directory
  try {
    const files = fs.readdirSync(pathToExamples);
    examples = files.map((filename) => {
      const content = fs.readFileSync(path.join(pathToExamples, filename), {
        encoding: 'utf-8',
      });

      const extension = filename.split('.').pop();

      return {
        name: filename,
        snippet: content,
        langugage: extentionToLanguageMap[extension] || extension,
      };
    });
  } catch (error) {
    examples = [];
  }

  return examples;
};

export const getEventByPath = (eventDir: string, hydrateWithProducersAndConsumers?: boolean): Event => {
  const { data } = readMarkdownFile(path.join(eventDir, 'index.md'));
  const historicVersions = versionsForEvents(path.join(eventDir));

  const event = parseEventFrontMatterIntoEvent(data);

  if (hydrateWithProducersAndConsumers) {
    const services = getAllServices();
    const consumersAndProducersAsServices = hydrateEventProducersAndConsumers(event, services);
    return {
      ...event,
      historicVersions,
      ...consumersAndProducersAsServices,
    };
  }

  return {
    ...event,
    historicVersions,
  };
};

export const getAllEventsFromPath = (eventsDir: string, hydrateEvents?: boolean): Event[] => {
  if (!fs.existsSync(eventsDir)) return [];
  const folders = fs.readdirSync(eventsDir);
  return folders.map((folder) => getEventByPath(path.join(eventsDir, folder), hydrateEvents));
};

export const getAllEvents = ({ hydrateEvents }: { hydrateEvents?: boolean } = {}): Event[] => {
  const allEventsFromDomainFolders = getAllEventsFromDomains(hydrateEvents);
  const eventsWithoutDomains = getAllEventsFromPath(path.join(process.env.PROJECT_DIR, 'events'), hydrateEvents);

  const events = [...eventsWithoutDomains, ...allEventsFromDomainFolders];
  const sortedEvents = events.sort((a, b) => a.name.localeCompare(b.name));

  return sortedEvents;
};

export const getAllOwners = async (): Promise<string[]> => {
  const allDomains = await getAllDomains();
  const allEvents = getAllEvents();
  const allServices = getAllServices();
  const allOwnersInDomains = allDomains.reduce((owners, file) => owners.concat(file.domain.owners), []);
  const allOwnersInEvents = allEvents.reduce((owners, event) => owners.concat(event.owners), []);
  const allOwnersInServices = allServices.reduce((owners, service) => owners.concat(service.owners), []);
  const allOwnersDocumented = [].concat(allOwnersInDomains, allOwnersInEvents, allOwnersInServices);
  // @ts-ignore
  return [...new Set(allOwnersDocumented)];
};

export const getAllEventsAndVersionsFlattened = () => {
  const allEvents = getAllEvents();
  return allEvents.reduce((eventsWithVersionsFlattened: any, event: Event) => {
    // eventsWithVersionsFlattened.push({ eventName: event.name, version: event.version })

    if (event.historicVersions) {
      event.historicVersions.forEach((version) =>
        eventsWithVersionsFlattened.push({ eventName: event.name, version, domain: event.domain })
      );
    }

    return eventsWithVersionsFlattened;
  }, []);
};

export const getEventByName = async ({
  eventName,
  version,
  domain,
}: {
  eventName: string;
  version?: string;
  domain?: string;
}): Promise<{ event: Event; markdown: MarkdownFile }> => {
  let eventsDir = path.join(process.env.PROJECT_DIR, 'events');

  if (domain) {
    eventsDir = path.join(process.env.PROJECT_DIR, 'domains', domain, 'events');
  }

  const eventDirectory = path.join(eventsDir, eventName);
  let versionDirectory = null;

  if (version) {
    versionDirectory = path.join(eventsDir, eventName, 'versioned', version);
  }

  const directoryToLoadForEvent = version ? versionDirectory : eventDirectory;

  try {
    const { data, content } = readMarkdownFile(path.join(directoryToLoadForEvent, `index.md`));
    const event = parseEventFrontMatterIntoEvent(data);
    const services = getAllServices();
    const consumersAndProducersAsServices = hydrateEventProducersAndConsumers(event, services);

    const mdxSource = await serialize(content);

    return {
      event: {
        ...event,
        ...consumersAndProducersAsServices,
        domain: domain || null,
        historicVersions: versionsForEvents(eventDirectory),
        schema: getSchemaFromDir(directoryToLoadForEvent),
        examples: getEventExamplesFromDir(path.join(directoryToLoadForEvent, `examples`)),
      },
      markdown: {
        content,
        source: mdxSource,
        lastModifiedDate: getLastModifiedDateOfFile(path.join(directoryToLoadForEvent, `index.md`)),
      },
    };
  } catch (error) {
    console.log(error);
    console.log('Failed to get event by name', eventName);
    return Promise.reject();
  }
};

export const getUniqueServicesNamesFromEvents = (events: Event[]) => {
  const allConsumersAndProducers = events.reduce((domains, event) => {
    const { consumerNames = [], producerNames = [] } = event;
    return domains.concat(consumerNames).concat(producerNames);
  }, []);

  const data = allConsumersAndProducers.map((service) => service);

  // @ts-ignore
  return [...new Set(data)];
};

export const getAllEventsByOwnerId = async (ownerId) => {
  const events = await getAllEvents();
  return events.filter(({ owners = [] }) => owners.some((id) => id === ownerId));
};

export const getAllEventsThatHaveRelationshipWithService = (
  service: Service,
  events: Event[]
): { publishes: Event[]; subscribes: Event[] } => {
  const relationshipsBetweenEvents = events.reduce(
    (data, event) => {
      const serviceSubscribesToEvent = event.consumerNames.some((id) => id === service.name);
      const servicePublishesEvent = event.producerNames.some((id) => id === service.name);

      return {
        publishes: servicePublishesEvent ? data.publishes.concat(event) : data.publishes,
        subscribes: serviceSubscribesToEvent ? data.subscribes.concat(event) : data.subscribes,
      };
    },
    { publishes: [], subscribes: [] }
  );

  return relationshipsBetweenEvents;
};
