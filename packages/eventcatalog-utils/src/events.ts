import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { Event } from '@eventcatalog/types';
import merge from 'deepmerge';
import buildMarkdownFile from './markdown-builder';

import { FunctionInitInterface, WriteEventToCatalogOptions, WriteEventToCatalogResponse } from './types';

import { existsInCatalog } from './index';

const parseEventFrontMatterIntoEvent = (eventFrontMatter: any): Event => {
  const { name, version, summary, producers = [], consumers = [], owners = [] } = eventFrontMatter;
  return { name, version, summary, producers, consumers, owners };
};

const readMarkdownFile = (pathToFile: string) => {
  const file = fs.readFileSync(pathToFile, {
    encoding: 'utf-8',
  });
  return {
    parsed: matter(file),
    raw: file,
  };
};

export const getEventFromCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (eventName: string) => {
    if (!existsInCatalog({ catalogDirectory })(eventName, { type: 'event' })) {
      return null;
    }

    // Read the directory to get the stuff we need.
    const { parsed: parsedEvent, raw } = readMarkdownFile(path.join(catalogDirectory, 'events', eventName, 'index.md'));

    return {
      data: parseEventFrontMatterIntoEvent(parsedEvent.data),
      content: parsedEvent.content,
      raw,
    };
  };

export const getAllEventsFromCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  () => {
    const eventsDir = path.join(catalogDirectory, 'events');
    const folders = fs.readdirSync(eventsDir);
    const events = folders.map((folder) => getEventFromCatalog({ catalogDirectory })(folder));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return events.filter((event) => event !== null).map(({ raw, ...event }: any) => event);
  };

export const buildEventMarkdownForCatalog =
  () =>
  (
    event: Event,
    { markdownContent, includeSchemaComponent, renderMermaidDiagram, renderNodeGraph, defaultFrontMatter = {} }: any = {}
  ) => {
    const frontMatter = merge(event, defaultFrontMatter);
    return buildMarkdownFile({
      frontMatterObject: frontMatter,
      customContent: markdownContent,
      includeSchemaComponent,
      renderMermaidDiagram,
      renderNodeGraph,
    });
  };

export const versionEvent =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (eventName: string, { removeOnVersion = true } = {}) => {
    const eventPath = path.join(catalogDirectory, 'events', eventName);
    const versionedPath = path.join(catalogDirectory, 'events', eventName, 'versioned');

    if (!fs.existsSync(eventPath)) throw new Error(`Cannot find event "${eventName}" to version`);

    const { parsed: parsedEvent, raw } = readMarkdownFile(path.join(eventPath, 'index.md'));

    const { data: { version } = {} } = parsedEvent;

    if (!version) throw new Error(`Trying to version "${eventName}" but no 'version' value found on the event`);

    fs.copySync(eventPath, path.join(eventPath, '../tmp', eventName));

    if (fs.existsSync(path.join(eventPath, '../tmp', eventName, 'versioned'))) {
      fs.rmdirSync(path.join(eventPath, '../tmp', eventName, 'versioned'), { recursive: true });
    }

    fs.moveSync(path.join(eventPath, '../tmp', eventName), path.join(versionedPath, version), {
      overwrite: true,
    });

    fs.rmdirSync(path.join(eventPath, '../tmp'), { recursive: true });

    if (removeOnVersion) {
      fs.copySync(path.join(eventPath, 'versioned'), path.join(eventPath, '../tmp', eventName, 'versioned'));
      fs.rmdirSync(path.join(eventPath), { recursive: true });
      fs.moveSync(path.join(eventPath, '../tmp', eventName, 'versioned'), path.join(eventPath, 'versioned'), { overwrite: true });
      fs.rmdirSync(path.join(eventPath, '../tmp'), { recursive: true });
    }

    return {
      version,
      versionedPath: path.join(versionedPath, version),
      event: parsedEvent,
      raw,
    };
  };

export const writeEventToCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (event: Event, options?: WriteEventToCatalogOptions): WriteEventToCatalogResponse => {
    const { name: eventName } = event;
    const {
      useMarkdownContentFromExistingEvent = true,
      renderMermaidDiagram = true,
      renderNodeGraph = false,
      versionExistingEvent = true,
      schema,
      codeExamples = [],
      markdownContent: setMarkdownContent,
      frontMatterToCopyToNewVersions,
    } = options || {};
    let markdownContent = setMarkdownContent;

    if (!eventName) throw new Error('No `name` found for given event');

    const eventAlreadyInCatalog = existsInCatalog({ catalogDirectory })(eventName, { type: 'event' });

    if (!markdownContent && useMarkdownContentFromExistingEvent && eventAlreadyInCatalog) {
      try {
        const data = getEventFromCatalog({ catalogDirectory })(eventName);
        markdownContent = data?.content ? data?.content : '';
      } catch (error) {
        // TODO: do nothing
        console.log(error);
      }
    }

    let defaultFrontMatterForNewEvent: any = {};

    // Check if we should carry frontmatter from previous event into the new one.
    if (eventAlreadyInCatalog && frontMatterToCopyToNewVersions) {
      const eventFromCatalog = getEventFromCatalog({ catalogDirectory })(eventName);
      defaultFrontMatterForNewEvent = Object.keys(frontMatterToCopyToNewVersions).reduce(
        (defaultValues: any, key: string) =>
          // @ts-ignore
          frontMatterToCopyToNewVersions[key] ? { ...defaultValues, [key]: eventFromCatalog?.data[key] } : defaultValues,
        {}
      );
    }

    if (eventAlreadyInCatalog && versionExistingEvent) {
      versionEvent({ catalogDirectory })(eventName);
    }

    fs.ensureDirSync(path.join(catalogDirectory, 'events', eventName));
    const data = buildEventMarkdownForCatalog()(event, {
      markdownContent,
      renderMermaidDiagram,
      renderNodeGraph,
      includeSchemaComponent: !!schema,
      defaultFrontMatter: defaultFrontMatterForNewEvent,
    });

    fs.writeFileSync(path.join(catalogDirectory, 'events', eventName, 'index.md'), data);

    if (schema && schema.extension && schema.fileContent) {
      fs.writeFileSync(path.join(catalogDirectory, 'events', eventName, `schema.${schema.extension}`), schema.fileContent);
    }

    if (codeExamples.length > 0) {
      fs.ensureDirSync(path.join(catalogDirectory, 'events', eventName, 'examples'));
      codeExamples.forEach((codeExample) => {
        fs.writeFileSync(
          path.join(catalogDirectory, 'events', eventName, 'examples', codeExample.fileName),
          codeExample.fileContent
        );
      });
    }

    return {
      path: path.join(catalogDirectory, 'events', eventName),
    };
  };
