import fs from 'fs';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import type { Service, Event } from '@eventcatalog/types';
import compareVersions from 'compare-versions';
import * as Diff from 'diff';
import { MarkdownFile } from '@/types/index';

import { extentionToLanguageMap } from './file-reader';

import { getLastModifiedDateOfFile, getSchemaFromDir, readMarkdownFile } from '@/lib/file-reader';
import { getAllServices } from './services';

const parseEventFrontMatterIntoEvent = (eventFrontMatter: any): Event => {
  const { name, version, summary, producers = [], consumers = [], owners = [], externalLinks = [] } = eventFrontMatter;
  return { name, version, summary, producers, consumers, owners, externalLinks };
};

const versionsForEvents = (pathToEvent) => {
  const versionsDir = path.join(pathToEvent, 'versioned');

  if (fs.existsSync(versionsDir)) {
    const files = fs.readdirSync(versionsDir);
    return files.sort(compareVersions).reverse();
  }

  return [];
};

export const getLogsForEvent = (eventName) => {
  const eventsDir = path.join(process.env.PROJECT_DIR, 'events');
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

export const getAllEvents = (): Event[] => {
  const eventsDir = path.join(process.env.PROJECT_DIR, 'events');
  const folders = fs.readdirSync(eventsDir);
  return folders.map((folder) => {
    const { data } = readMarkdownFile(path.join(eventsDir, folder, 'index.md'));
    const historicVersions = versionsForEvents(path.join(eventsDir, folder));
    return {
      ...parseEventFrontMatterIntoEvent(data),
      historicVersions,
    };
  });
};

export const getAllOwners = (): string[] => {
  const allEvents = getAllEvents();
  const allServices = getAllServices();
  const allOwnersInEvents = allEvents.reduce((owners, event) => owners.concat(event.owners), []);
  const allOwnersInServices = allServices.reduce((owners, service) => owners.concat(service.owners), []);
  const allOwnersDocumented = allOwnersInEvents.concat(allOwnersInServices);
  // @ts-ignore
  return [...new Set(allOwnersDocumented)];
};

export const getAllEventsAndVersionsFlattened = () => {
  const allEvents = getAllEvents();
  return allEvents.reduce((eventsWithVersionsFlattened: any, event: Event) => {
    // eventsWithVersionsFlattened.push({ eventName: event.name, version: event.version })

    if (event.historicVersions) {
      event.historicVersions.forEach((version) => eventsWithVersionsFlattened.push({ eventName: event.name, version }));
    }

    return eventsWithVersionsFlattened;
  }, []);
};

export const getEventByName = async (eventName: string, version?: string): Promise<{ event: Event; markdown: MarkdownFile }> => {
  const eventsDir = path.join(process.env.PROJECT_DIR, 'events');
  const eventDirectory = path.join(eventsDir, eventName);
  let versionDirectory = null;

  if (version) {
    versionDirectory = path.join(eventsDir, eventName, 'versioned', version);
  }

  const directoryToLoadForEvent = version ? versionDirectory : eventDirectory;

  try {
    const { data, content } = readMarkdownFile(path.join(directoryToLoadForEvent, `index.md`));
    const event = parseEventFrontMatterIntoEvent(data);

    const mdxSource = await serialize(content);

    return {
      event: {
        ...event,
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
    const { consumers = [], producers = [] } = event;
    return domains.concat(consumers).concat(producers);
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
      const serviceSubscribesToEvent = event.consumers.some((id) => id === service.name);
      const servicePublishesEvent = event.producers.some((id) => id === service.name);

      return {
        publishes: servicePublishesEvent ? data.publishes.concat(event) : data.publishes,
        subscribes: serviceSubscribesToEvent ? data.subscribes.concat(event) : data.subscribes,
      };
    },
    { publishes: [], subscribes: [] }
  );

  return relationshipsBetweenEvents;
};
