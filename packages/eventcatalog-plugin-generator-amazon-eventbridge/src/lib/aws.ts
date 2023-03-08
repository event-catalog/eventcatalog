import { EventBridge, Rule } from '@aws-sdk/client-eventbridge';
import { Arn, ArnFormat } from 'aws-cdk-lib';
import { Schemas, Schemas as SchemaSDK, ExportSchemaCommandOutput, ForbiddenException } from '@aws-sdk/client-schemas';
import { PluginOptions } from '../types';

export interface CustomSchema extends ExportSchemaCommandOutput {
  Content?: any;
  DetailType?: string;
  Source?: string;
  Description?: string;
}

const getSchemas = (schemas: SchemaSDK, registryName: string) => async (): Promise<CustomSchema[]> => {
  // First get all schemas
  const { Schemas: registrySchemas = [] } = await schemas.listSchemas({ RegistryName: registryName });

  const allSchemas = registrySchemas.map(async (registrySchema: any) => {
    let schemaAsJSON: ExportSchemaCommandOutput = { $metadata: {} };

    try {
      // Get the JSON schema
      schemaAsJSON = await schemas.exportSchema({
        RegistryName: registryName,
        SchemaName: registrySchema.SchemaName,
        Type: 'JSONSchemaDraft4',
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        console.warn(error);
      } else {
        throw error;
      }
    }

    // Get the OpenAPI schema
    const schemaAsOpenAPI = await schemas.describeSchema({
      RegistryName: registryName,
      SchemaName: registrySchema.SchemaName,
    });

    const jsonSchema = buildSchema(schemaAsJSON);
    const openAPISchema = buildSchema(schemaAsOpenAPI);

    return {
      ...jsonSchema,
      ...openAPISchema,
      Content: {
        jsonSchema: jsonSchema?.Content,
        openAPISchema: openAPISchema?.Content,
      },
      Type: 'Custom-Merged',
      DetailType: jsonSchema?.Content['x-amazon-events-detail-type'],
      Source: jsonSchema?.Content['x-amazon-events-source'],
    };
  });

  return Promise.all(allSchemas);
};

const buildSchema = (rawSchema: ExportSchemaCommandOutput): CustomSchema => ({
  ...rawSchema,
  Content: JSON.parse(rawSchema.Content || ''),
});

const flattenRules = (busRules: Rule[]) =>
  busRules.reduce((rules: any, rule: any) => {
    const eventPattern = JSON.parse(rule.EventPattern);
    const detailType = eventPattern['detail-type'] || [];

    detailType.forEach((detail: any) => {
      if (!rules[detail]) {
        rules[detail] = { rules: [] };
      }
      rules[detail].rules.push({
        name: rule.Name,
        pattern: JSON.parse(rule.EventPattern),
      });
    });
    return rules;
  }, {});

export const getAWSConsoleUrlForEventBridgeRule = ({
  region,
  eventBusName,
  ruleName,
}: {
  region: string;
  eventBusName: string;
  ruleName: string;
}) => {
  const url = new URL(
    `events/home?region=${region}#/eventbus/${eventBusName}/rules/${ruleName}`,
    `https://${region}.console.aws.amazon.com`
  );
  return url.href;
};

export const getAWSConsoleUrlForEventBridgeRuleMetrics = ({
  region,
  eventBusName,
  ruleName,
}: {
  region: string;
  eventBusName: string;
  ruleName: string;
}) => {
  const query = `*7bAWS*2fEvents*2cEventBusName*2CRuleName*7d*20RuleName*3d*22${ruleName}*22*20EventBusName*3d*22${eventBusName}*22`;
  const url = new URL(
    `cloudwatch/home?region=${region}#metricsV2:graph=~();query=~'${query}`,
    `https://${region}.console.aws.amazon.com`
  );
  return url.href;
};

export const getAWSConsoleUrlForService = ({ region, service }: { region: string; service: string }) => {
  const url = new URL(`${service}/home?region=${region}`, `https://${region}.console.aws.amazon.com`);
  return url.href;
};

const getEventBusRulesAndTargets = (eventbridge: EventBridge, eventBusName: string) => async () => {
  const rulesForEvents = await eventbridge.listRules({ EventBusName: eventBusName, Limit: 100 });
  const rulesByEvent = rulesForEvents.Rules ? flattenRules(rulesForEvents.Rules) : {};

  return Object.keys(rulesByEvent).reduce(async (data, event) => {
    const listOfRulesForEvent = rulesByEvent[event].rules || [];

    const eventTargetsAndRules = listOfRulesForEvent.map(async (rule: any) => {
      const { Targets = [] } = await eventbridge.listTargetsByRule({ Rule: rule.name, EventBusName: eventBusName });
      const targets = Targets.map(({ Arn: arnString = '' }) => {
        const { service, resource, resourceName } = Arn.split(arnString, ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME);
        return { service, resource, resourceName, arn: arnString };
      });
      return { ...rule, targets };
    });

    const eventWithTargetsAndRules = await Promise.all(eventTargetsAndRules);

    return {
      ...(await data),
      [event]: eventWithTargetsAndRules,
    };
  }, {});
};

export default (options: PluginOptions) => {
  const { credentials, registryName, region, eventBusName } = options;

  const schemas = new Schemas({ credentials, region });

  const eventbridge = new EventBridge({ credentials, region });

  return {
    getSchemas: getSchemas(schemas, registryName),
    getEventBusRulesAndTargets: getEventBusRulesAndTargets(eventbridge, eventBusName),
  };
};
