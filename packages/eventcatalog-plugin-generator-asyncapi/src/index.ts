import chalk from 'chalk';
import type { Event, Service, LoadContext } from '@eventcatalog/types';
import { parse, AsyncAPIDocument } from '@asyncapi/parser';
import fs from 'fs-extra';
import utils from '@eventcatalog/utils';

import type { AsyncAPIPluginOptions } from './types';

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument): Service => ({
  name: doc.info().title(),
  summary: doc.info().description() || '',
});

const getAllEventsFromAsyncDoc = (doc: AsyncAPIDocument, options: AsyncAPIPluginOptions): Event[] => {
  const { externalAsyncAPIUrl } = options;

  const channels = doc.channels();
  return Object.keys(channels).reduce((data: any, channelName) => {
    const service = doc.info().title();

    const channel = channels[channelName];
    const operation = channel.hasSubscribe() ? 'subscribe' : 'publish';

    const messages = channel[operation]().messages();

    const eventsFromMessages = messages.map((message) => {
      const messageName = message.name() || message.extension('x-parser-message-name');
      const schema = message.originalPayload();
      const externalLink = {
        label: `View event in AsyncAPI`,
        url: `${externalAsyncAPIUrl}#message-${messageName}`,
      };

      return {
        name: messageName,
        summary: message.summary(),
        version: doc.info().version(),
        producers: operation === 'subscribe' ? [service] : [],
        consumers: operation === 'publish' ? [service] : [],
        externalLinks: externalAsyncAPIUrl ? [externalLink] : [],
        schema: schema ? JSON.stringify(schema, null, 4) : '',
      };
    });

    return data.concat(eventsFromMessages);
  }, []);
};

const parseAsyncAPIFile = async (pathToFile: string, options: AsyncAPIPluginOptions, copyFrontMatter: boolean) => {
  const { versionEvents = true } = options;

  let asyncAPIFile;

  try {
    asyncAPIFile = fs.readFileSync(pathToFile, 'utf-8');
  } catch (error: any) {
    console.error(error);
    throw new Error(`Failed to read file with provided path`);
  }

  const doc = await parse(asyncAPIFile);

  const service = getServiceFromAsyncDoc(doc);
  const events = getAllEventsFromAsyncDoc(doc, options);

  if (!process.env.PROJECT_DIR) {
    throw new Error('Please provide catalog url (env variable PROJECT_DIR)');
  }

  const { writeServiceToCatalog, writeEventToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

  await writeServiceToCatalog(service, {
    useMarkdownContentFromExistingService: true,
  });

  const eventFiles = events.map(async (event: any) => {
    const { schema, ...eventData } = event;

    await writeEventToCatalog(eventData, {
      useMarkdownContentFromExistingEvent: true,
      versionExistingEvent: versionEvents,
      frontMatterToCopyToNewVersions: {
        // only do consumers and producers if its not the first file.
        consumers: copyFrontMatter,
        producers: copyFrontMatter,
      },
      schema: {
        extension: 'json',
        fileContent: schema,
      },
    });
  });

  // write all events to folders
  Promise.all(eventFiles);

  return {
    generatedEvents: events,
  };
};

export default async (context: LoadContext, options: AsyncAPIPluginOptions) => {
  const { pathToSpec } = options;

  const listOfAsyncAPIFilesToParse = Array.isArray(pathToSpec) ? pathToSpec : [pathToSpec];

  if (listOfAsyncAPIFilesToParse.length === 0 || !pathToSpec) {
    throw new Error('No file provided in plugin.');
  }

  // on first parse of files don't copy any frontmatter over.
  const parsers = listOfAsyncAPIFilesToParse.map((specFile, index) => parseAsyncAPIFile(specFile, options, index !== 0));

  const data = await Promise.all(parsers);
  const totalEvents = data.reduce((sum, { generatedEvents }) => sum + generatedEvents.length, 0);

  console.log(
    chalk.green(`Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`)
  );
};
