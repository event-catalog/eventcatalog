import chalk from 'chalk';
import type { Event, Service, LoadContext, Domain } from '@eventcatalog/types';
import { AsyncAPIDocumentInterface, Parser, MessageInterface, OperationInterface, fromFile } from '@asyncapi/parser';
import fs from 'fs-extra';
import path from 'path';
import utils from '@eventcatalog/utils';
import merge from 'lodash.merge';
// @ts-ignore
import { AvroSchemaParser } from '@asyncapi/avro-schema-parser';
import type { AsyncAPIPluginOptions } from './types';

const getServiceFromAsyncDoc = (doc: AsyncAPIDocumentInterface): Service => ({
  name: doc.info().title(),
  summary: doc.info().description() || '',
});

const getAllEventsFromAsyncDoc = (doc: AsyncAPIDocumentInterface, options: AsyncAPIPluginOptions): Event[] => {
  const { externalAsyncAPIUrl } = options;

  const version = doc.info().version();
  const service = doc.info().title();
  const operations = doc.operations();

  const allMessages = operations.reduce((data: any, op: OperationInterface) => {
    const action = op?.action();
    const messages = op?.messages();

    if (messages === undefined) {
      return data;
    }

    const eventsFromMessages = messages.reduce((messagesData: any, message: MessageInterface, i) => {
      let messageName = message.name();
      if (messageName === undefined) {
        messageName = message.extensions().get('x-parser-message-name')?.value() || `anonymous-message-${i}`;
      }

      // If no name can be found from the message, and AsyncAPI defaults to "anonymous" value, try get the name from the payload itself
      if (messageName.includes('anonymous-')) {
        messageName = message.payload()?.id() || messageName;
      }

      const schema = message.extensions().get('x-parser-original-payload')?.value() || message.payload();
      const externalLink = {
        label: `View event in AsyncAPI`,
        url: `${externalAsyncAPIUrl}#message-${messageName}`,
      };

      const messageData = {
        name: messageName,
        summary: message.summary(),
        version,
        producers: ['send', 'subscribe'].includes(action) ? [service] : [],
        consumers: ['receive', 'publish'].includes(action) ? [service] : [],
        externalLinks: externalAsyncAPIUrl ? [externalLink] : [],
        schema: schema ? JSON.stringify(schema, null, 4) : '',
        badges: [],
      };

      return messagesData.concat([messageData]);
    }, []);

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

const parseAsyncAPIFile = async (pathToFile: string, options: AsyncAPIPluginOptions) => {
  const { domainName = '', domainSummary = '' } = options;

  if (!fs.existsSync(pathToFile)) {
    throw new Error(`Given file does not exist: ${pathToFile}`);
  }

  const parser = new Parser();

  parser.registerSchemaParser(AvroSchemaParser());

  let parsed;
  try {
    parsed = await fromFile(parser, pathToFile).parse();
  } catch (error: any) {
    throw new Error(error);
  }

  if (parsed.document === undefined) {
    console.error(`${chalk.red('ERRORS IN SCHEMA:')} ${pathToFile}`);
    parsed.diagnostics
      .filter((d) => d.severity === 0)
      .forEach((d) =>
        console.error(`${chalk.red(`[${d.code}]`)} ${d.path.join('.')} - ${d.message} - ${pathToFile}:${d.range.start.line}`)
      );
    console.error();

    throw new Error(`Unable to parse the given AsyncAPI document (${pathToFile})`);
  }

  const service = getServiceFromAsyncDoc(parsed.document);
  const events = getAllEventsFromAsyncDoc(parsed.document, options);

  let domain;
  if (domainName) {
    domain = <Domain>{
      name: domainName,
      summary: domainSummary,
    };
  }

  return { service, domain, events };
};

const writeData = async (
  destDir: string,
  service: any,
  events: any,
  options: AsyncAPIPluginOptions,
  copyFrontMatter: boolean,
  domain?: Domain
) => {
  const { versionEvents = true, renderMermaidDiagram = false, renderNodeGraph = true } = options;

  if (domain !== undefined) {
    const { writeDomainToCatalog } = utils({ catalogDirectory: destDir });
    writeDomainToCatalog(domain, {
      useMarkdownContentFromExistingDomain: true,
      renderMermaidDiagram,
      renderNodeGraph,
    });
  }

  const { writeServiceToCatalog, writeEventToCatalog } = utils({
    catalogDirectory: domain ? path.join(destDir, 'domains', domain.name) : destDir,
  });

  writeServiceToCatalog(service, {
    useMarkdownContentFromExistingService: true,
    renderMermaidDiagram,
    renderNodeGraph,
  });

  const eventFiles = events.map(async (event: any) => {
    const { schema, ...eventData } = event;

    writeEventToCatalog(eventData, {
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

    return events.length;
  });

  return Promise.all(eventFiles);
};

const main = async (_: LoadContext, options: AsyncAPIPluginOptions) => {
  if (!process.env.PROJECT_DIR) {
    throw new Error('Please provide catalog url (env variable PROJECT_DIR)');
  }

  const destDir = process.env.PROJECT_DIR;

  const { pathToSpec } = options;

  const listOfAsyncAPIFilesToParse = Array.isArray(pathToSpec) ? pathToSpec : [pathToSpec];

  if (listOfAsyncAPIFilesToParse.length === 0 || !pathToSpec) {
    throw new Error('No file provided in plugin.');
  }

  const data = await Promise.all(listOfAsyncAPIFilesToParse.map((specFile) => parseAsyncAPIFile(specFile, options)));

  data.map((d, index) =>
    writeData(
      destDir,
      d.service,
      d.events,
      options,
      index !== 0, // on first write of files don't copy any frontmatter over.
      d.domain
    )
  );

  const totalEvents = data.reduce((sum: any, { events }: any) => sum + events.length, 0);

  console.log(
    chalk.green(`Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`)
  );
};

export default main;

/**
 * This allows to run this file standalone
 *
 * Requires two environment variables to be set:
 * * PROJECT_DIR - where to store generated files
 * * ASYNCAPI_SCHEMAS - list of asyncapi scehma files (separated by pipe - | ).
 *                      These will be looked for relative to the working dir/this file/PROJECT_DIR, in that order,
 *                        or absolute path (takes precedence).
 *
 * Example of run cmd:
 *
 * PROJECT_DIR="output" ASYNCAPI_SCHEMAS="schema1.yml|schema2.yml" \
 *    ts-node -T packages/eventcatalog-plugin-generator-asyncapi/src/index.ts
 */
if (require.main === module) {
  if (!process.env.PROJECT_DIR) {
    throw new Error('Please provide catalog url (env variable PROJECT_DIR)');
  }

  const destDir = process.env.PROJECT_DIR;

  if (!process.env.ASYNCAPI_SCHEMAS) {
    throw new Error('Please provide asyncapi schema file (env variable ASYNCAPI_SCHEMAS)');
  }

  const schemas = process.env.ASYNCAPI_SCHEMAS.split('|');

  const schemasPaths = schemas.map((f) => {
    const c = [
      f, // absolute path
      path.join(process.cwd(), f), // working dir
      path.join(__dirname, f), // relative to this file
      path.join(destDir, f), // relative to main project
    ];

    const schemaPath = c.find((p) => fs.existsSync(p));

    if (schemaPath === undefined) {
      throw new Error(`Given schema file not found (looked in ${c.join(', ')})`);
    }

    return schemaPath;
  });

  main(<LoadContext>{}, { pathToSpec: schemasPaths, versionEvents: !!process.env.PROJECT_DO_VERSIONS });
}
