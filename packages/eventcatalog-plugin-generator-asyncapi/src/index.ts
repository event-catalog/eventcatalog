import chalk from 'chalk';
import type { Event, Service, LoadContext } from '@eventcatalog/types';
import { parse, AsyncAPIDocument } from '@asyncapi/parser';
import fs from 'fs-extra';
import path from 'path';
import frontmatter from 'front-matter';

import type { AsyncAPIPluginOptions } from './types';

import buildMarkdownFile from './markdown-builder';

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument): Service => ({
  name: doc.info().title(),
  summary: doc.info().description() || '',
});

const getAllEventsFromAsyncDoc = (doc: AsyncAPIDocument): Event[] => {
  const channels = doc.channels();
  return Object.keys(channels).reduce((data: any, channelName) => {
    const service = doc.info().title();

    const channel = channels[channelName];
    const operation = channel.hasSubscribe() ? 'subscribe' : 'publish';

    const messages = channel[operation]().messages();

    const eventsFromMessages = messages.map((message) => {
      const messageName = message.extension('x-parser-message-name');
      return {
        name: messageName,
        summary: message.summary(),
        version: doc.info().version(),
        producers: operation === 'subscribe' ? [service] : [],
        consumers: operation === 'publish' ? [service] : [],
      };
    });

    return data.concat(eventsFromMessages);
  }, []);
};

const writeFileToMarkdown = async (dir: string, frontMatterObject: Event | Service) => {
  let customContent;

  const folderPath = path.join(dir, frontMatterObject.name);
  await fs.ensureDir(folderPath);

  const pathToMarkdownFile = path.join(folderPath, 'index.md');

  if (fs.existsSync(pathToMarkdownFile)) {
    const file = fs.readFileSync(pathToMarkdownFile, { encoding: 'utf-8' });
    const { body } = frontmatter(file);
    customContent = body;
  }

  fs.writeFileSync(pathToMarkdownFile, buildMarkdownFile({ frontMatterObject, customContent }));
};

export default async (context: LoadContext, options: AsyncAPIPluginOptions) => {
  const { spec } = options;

  // @ts-ignore
  const eventsDir = path.join(process.env.PROJECT_DIR, 'events');
  // @ts-ignore
  const servicesDir = path.join(process.env.PROJECT_DIR, 'services');

  let asyncAPIFile;

  if (!spec) {
    throw new Error('No file provided in plugin.');
  }

  try {
    asyncAPIFile = fs.readFileSync(spec, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to read file with provided path`);
  }

  const doc = await parse(asyncAPIFile);

  const service = getServiceFromAsyncDoc(doc);
  const events = getAllEventsFromAsyncDoc(doc);

  // write service
  await writeFileToMarkdown(servicesDir, service);

  const eventFiles = events.map(async (event: any) => {
    await writeFileToMarkdown(eventsDir, event);
  });

  // Just 1 for now
  const serviceCount = 1;

  // write all events to folders
  Promise.all(eventFiles);

  console.log(
    chalk.green(`
Succesfully parsed AsyncAPI document: Events ${events.length}, Services: ${serviceCount}
    `)
  );
};
