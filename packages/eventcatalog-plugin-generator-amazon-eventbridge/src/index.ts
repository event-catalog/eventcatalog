import type { LoadContext, Event } from '@eventcatalog/types';
import utils from '@eventcatalog/utils';
import chalk from 'chalk';
import { PluginOptions, SchemaTypes } from './types';
import AWS, { CustomSchema } from './lib/aws';

import { buildMarkdownForEvent, buildMarkdownForEventWithoutRules } from './markdown';

const buildEventFromEventBridgeSchema = (
  schema: CustomSchema,
  region: string,
  eventBusName: string,
  schemaType: SchemaTypes
): Event => {
  const { SchemaName, DetailType, Source, SchemaVersion, Description, Content } = schema;
  const externalLinks = [];

  if (SchemaName) {
    const url = new URL(
      `events/home?region=${region}#/registries/discovered-schemas/schemas/${SchemaName}`,
      `https://${region}.console.aws.amazon.com`
    );
    externalLinks.push({ label: 'View Schema AWS Console', url: url.href });
  }

  const schemaToUse = schemaType === SchemaTypes.JSONSchemaDraft4 ? Content.jsonSchema : Content.openAPISchema;

  const examples =
    schemaType === SchemaTypes.JSONSchemaDraft4
      ? { fileName: `${SchemaName}-openapi-schema.json`, fileContent: JSON.stringify(Content.openAPISchema, null, 4) }
      : { fileName: `${SchemaName}-json-schema.json`, fileContent: JSON.stringify(Content.jsonSchema, null, 4) };

  return {
    name: SchemaName || `${Source}@${DetailType}`,
    version: SchemaVersion || '',
    summary: Description || `Found on the "${eventBusName}" Amazon EventBridge bus.`,
    externalLinks,
    schema: schemaToUse,
    examples: [examples],
    badges: [],
  };
};

export default async (_: LoadContext, options: PluginOptions) => {
  const { region, eventBusName, schemaTypeToRenderToEvent = SchemaTypes.JSONSchemaDraft4, versionEvents = true } = options;

  if (!process.env.PROJECT_DIR) {
    throw new Error('Please provide catalog url (env variable PROJECT_DIR)');
  }

  const { getSchemas, getEventBusRulesAndTargets } = AWS(options);
  const { writeEventToCatalog, getEventFromCatalog } = utils({ catalogDirectory: process.env.PROJECT_DIR });

  const schemas = await getSchemas();
  const rules: any = await getEventBusRulesAndTargets();

  const events = schemas.map((schema) => ({
    event: buildEventFromEventBridgeSchema(schema, region, eventBusName, schemaTypeToRenderToEvent),
    awsSchema: schema,
  }));

  events.forEach(({ event, awsSchema }) => {
    const { examples, schema, ...eventData } = event;

    const detailType = awsSchema?.DetailType;
    const eventRules = detailType && rules[detailType] ? rules[detailType] : [];

    const matchingEventsAlreadyInCatalog = getEventFromCatalog(eventData.name);

    const versionChangedFromPreviousEvent = matchingEventsAlreadyInCatalog?.data?.version !== eventData.version;

    writeEventToCatalog(eventData, {
      codeExamples: examples,
      schema: {
        extension: 'json',
        fileContent: JSON.stringify(schema, null, 4),
      },
      frontMatterToCopyToNewVersions: {
        owners: true,
      },
      versionExistingEvent: versionEvents && versionChangedFromPreviousEvent,
      useMarkdownContentFromExistingEvent: true,
      markdownContent:
        eventRules.length > 0
          ? buildMarkdownForEvent({ rules: eventRules, eventBusName, eventName: eventData.name, region })
          : buildMarkdownForEventWithoutRules(),
    });
  });

  console.log(
    chalk.green(`  
  Succesfully parsed "${schemas.length}" schemas from "${eventBusName}" event bus. 
  
  Generated ${events.length} events for EventCatalog.
`)
  );
};
