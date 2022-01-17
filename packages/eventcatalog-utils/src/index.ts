import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { Event } from '@eventcatalog/types';
import buildMarkdownFile from './markdown-builder';

interface options {
  catalogDirectory: string;
}

const parseEventFrontMatterIntoEvent = (eventFrontMatter: any): Event => {
  const { name, version, summary, producers = [], consumers = [], owners = [] } = eventFrontMatter;
  return { name, version, summary, producers, consumers, owners };
};

const readMarkdownFile = (pathToFile: string) => {
  const file = fs.readFileSync(pathToFile, {
    encoding: 'utf-8',
  });
  return matter(file);
};

export const getAllEventsFromCatalog =
  ({ catalogDirectory }: options) =>
  () => {
    const eventsDir = path.join(catalogDirectory, 'events');
    const folders = fs.readdirSync(eventsDir);
    const events = folders.map((folder) => getEventFromCatalog({ catalogDirectory })(folder));
    return events.filter((event) => event !== null);
  };

export const buildEventMarkdownForCatalog =
  () =>
  (event: Event, { markdownContent }: any = {}) =>
    buildMarkdownFile({ frontMatterObject: event, customContent: markdownContent });
export const buildServiceMarkdownForCatalog =
  () =>
  (event: Event, { markdownContent }: any = {}) =>
    buildMarkdownFile({ frontMatterObject: event, customContent: markdownContent });

export const getAllServicesFromCatalog =
  ({ catalogDirectory }: options) =>
  (): any[] => {
    const servicesDir = path.join(catalogDirectory, 'services');
    const folders = fs.readdirSync(servicesDir);
    return folders.map((folder) => getServiceFromCatalog({ catalogDirectory })(folder));
  };

export const getEventFromCatalog =
  ({ catalogDirectory }: options) =>
  (eventName: string) => {
    try {
      // Read the directory to get the stuff we need.
      const event = readMarkdownFile(path.join(catalogDirectory, 'events', eventName, 'index.md'));
      return {
        data: parseEventFrontMatterIntoEvent(event.data),
        content: event.content,
      };
    } catch (error) {
      return null;
    }
  };

export const getServiceFromCatalog =
  ({ catalogDirectory }: options) =>
  (seriveName: string) => {
    try {
      // Read the directory to get the stuff we need.
      const event = readMarkdownFile(
        path.join(catalogDirectory, 'services', seriveName, 'index.md')
      );
      return {
        data: event.data,
        content: event.content,
      };
    } catch (error) {
      return null;
    }
  };

export const versionEvent =
  ({ catalogDirectory }: options) =>
  (eventName: string, { removeOnVersion = true } = {}) => {
    const eventPath = path.join(catalogDirectory, 'events', eventName);
    const versionedPath = path.join(catalogDirectory, 'events', eventName, 'versioned');

    if (!fs.existsSync(eventPath)) throw new Error(`Cannot find event "${eventName}" to version`);

    const event = readMarkdownFile(path.join(eventPath, 'index.md'));

    const { data: { version } = {} } = event;

    if (!version)
      throw new Error(`Trying to version "${eventName}" but no 'version' value found on the event`);

    fs.copySync(eventPath, path.join(eventPath, '../tmp', eventName));
    if (fs.existsSync(path.join(eventPath, '../tmp', eventName, 'versioned'))) {
      fs.rmdirSync(path.join(eventPath, '../tmp', eventName, 'versioned'), { recursive: true });
    }
    fs.moveSync(path.join(eventPath, '../tmp', eventName), path.join(versionedPath, version), {
      overwrite: true,
    });
    fs.rmdirSync(path.join(eventPath, '../tmp'), { recursive: true });

    if (removeOnVersion) {
      fs.copySync(
        path.join(eventPath, 'versioned'),
        path.join(eventPath, '../tmp', eventName, 'versioned')
      );
      fs.rmdirSync(path.join(eventPath), { recursive: true });
      fs.moveSync(
        path.join(eventPath, '../tmp', eventName, 'versioned'),
        path.join(eventPath, 'versioned'),
        { overwrite: true }
      );
      fs.rmdirSync(path.join(eventPath, '../tmp'), { recursive: true });
    }

    return {
      version,
      versionedPath: path.join(versionedPath, version),
      event,
    };
  };

const utils = ({ catalogDirectory }: options) => ({
  getEventFromCatalog: getEventFromCatalog({ catalogDirectory }),
  getAllEventsFromCatalog: getAllEventsFromCatalog({ catalogDirectory }),
  buildEventMarkdownForCatalog: buildEventMarkdownForCatalog(),

  getServiceFromCatalog: getServiceFromCatalog({ catalogDirectory }),
  getAllServicesFromCatalog: getAllServicesFromCatalog({ catalogDirectory }),
  buildServiceMarkdownForCatalog: buildServiceMarkdownForCatalog(),

  versionEvent: versionEvent({ catalogDirectory }),
});

export default utils;
