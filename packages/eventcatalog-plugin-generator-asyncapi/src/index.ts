import chalk from 'chalk';
import type { Event, Service, LoadContext, Domain } from '@eventcatalog/types';
import { parse, AsyncAPIDocument } from '@asyncapi/parser';
import fs from 'fs-extra';
import path from 'path';
import utils from '@eventcatalog/utils';
import merge from 'lodash.merge';

import type { AsyncAPIPluginOptions } from './types';

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument): Service => ({
  name: doc.info().title(),
  summary: doc.info().description() || '',
});

const getAllEventsFromAsyncDoc = (doc: AsyncAPIDocument, options: AsyncAPIPluginOptions): Event[] => {
  const { externalAsyncAPIUrl } = options;

  const channels = doc.channels();

  const allMessages = Object.keys(channels).reduce((data: any, channelName) => {
    const service = doc.info().title();

    const channel = channels[channelName];
    const operation = channel.hasSubscribe() ? 'subscribe' : 'publish';

    const messages = channel[operation]().messages();

    const eventsFromMessages = messages.map((message) => {
      let messageName = message.name() || message.extension('x-parser-message-name');

      // If no name can be found from the message, and AsyncAPI defaults to "anonymous" value, try get the name from the payload itself
      if (messageName.includes('anonymous-')) {
        messageName = message.payload().uid() || messageName;
      }

      const schema = message.originalPayload();
      const externalLink = {
        label: `View event in AsyncAPI`,
        url: `${externalAsyncAPIUrl}#message-${messageName}`,
      };

      return {
        name: messageName,
        summary: message.summary(),
        version: doc.info().version(),
        producers: operation === 'publish' ? [service] : [],
        consumers: operation === 'subscribe' ? [service] : [],
        externalLinks: externalAsyncAPIUrl ? [externalLink] : [],
        schema: schema ? JSON.stringify(schema, null, 4) : '',
        badges: [],
      };
    });

    return data.concat(eventsFromMessages);
  }, []);

  // the same service can be the producer and consumer of events, check and merge any matchs.
  const uniqueMessages = allMessages.reduce((acc: any, message: any) => {
    const messageAlreadyDefined = acc.findIndex((m: any) => m.name === message.name);

    if (messageAlreadyDefined > -1) {
      acc[messageAlreadyDefined] = merge(acc[messageAlreadyDefined], message);
    } else {
      acc.push(message);
    }
    return acc;
  }, []);

  return uniqueMessages;
};

const parseAsyncAPIFile = async (pathToFile: string, options: AsyncAPIPluginOptions, copyFrontMatter: boolean) => {
  const {
    versionEvents = true,
    renderMermaidDiagram = false,
    renderNodeGraph = true,
    domainName = '',
    domainSummary = '',
  } = options;

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

  if (domainName) {
    const { writeDomainToCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

    const domain: Domain = {
      name: domainName,
      summary: domainSummary,
    };

    await writeDomainToCatalog(domain, {
      useMarkdownContentFromExistingDomain: true,
      renderMermaidDiagram,
      renderNodeGraph,
    });
  }

  const { writeServiceToCatalog, writeEventToCatalog } = utils({
    catalogDirectory: domainName ? path.join(process.env.PROJECT_DIR, 'domains', domainName) : process.env.PROJECT_DIR,
  });

  await writeServiceToCatalog(service, {
    useMarkdownContentFromExistingService: true,
    renderMermaidDiagram,
    renderNodeGraph,
  });

  const eventFiles = events.map(async (event: any) => {
    const { schema, ...eventData } = event;

    await writeEventToCatalog(eventData, {
      useMarkdownContentFromExistingEvent: true,
      versionExistingEvent: versionEvents,
      renderMermaidDiagram,
      renderNodeGraph,
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
