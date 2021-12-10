import fs from 'fs';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import type { Service, Event } from '@eventcatalogtest/types';
import compareVersions from 'compare-versions';
import { MarkdownFile } from '@/types/index';

import { extentionToLanguageMap } from './file-reader';

import { getLastModifiedDateOfFile, getSchemaFromDir, readMarkdownFile } from '@/lib/file-reader';

// https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/AVAILABLE_LANGUAGES_HLJS.MD

const parseEventFrontMatterIntoEvent = (eventFrontMatter: any): Event => {
  const { name, version, summary, producers = [], consumers = [], owners = [] } = eventFrontMatter;
  return { name, version, summary, producers, consumers, owners };
};

const versionsForEvents = (pathToEvent) => {
  const versionsDir = path.join(pathToEvent, 'versions');

  if (fs.existsSync(versionsDir)) {
    const files = fs.readdirSync(versionsDir);
    return files.sort(compareVersions).reverse();
  }

  return [];
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
        langugage: extentionToLanguageMap[extension],
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

export const getEventByName = async (
  eventName: string,
  version?: string
): Promise<{ event: Event; markdown: MarkdownFile }> => {
  const eventsDir = path.join(process.env.PROJECT_DIR, 'events');
  const eventDirectory = path.join(eventsDir, eventName);
  let versionDirectory = null;

  if (version) {
    versionDirectory = path.join(eventsDir, eventName, 'versions', version);
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
      const serviceSubscribesToEvent = event.consumers.some((id) => id === service.id);
      const servicePublishesEvent = event.producers.some((id) => id === service.id);

      return {
        publishes: servicePublishesEvent ? data.publishes.concat(event) : data.publishes,
        subscribes: serviceSubscribesToEvent ? data.subscribes.concat(event) : data.subscribes,
      };
    },
    { publishes: [], subscribes: [] }
  );

  return relationshipsBetweenEvents;
};
