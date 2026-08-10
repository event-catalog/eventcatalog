import { z } from 'zod';
import type { Index } from './index-types';

export type IndexValidationIssue = {
  path: (string | number)[];
  message: string;
};

export class InvalidIndexError extends Error {
  readonly issues: IndexValidationIssue[];

  constructor(issues: IndexValidationIssue[]) {
    super(
      [
        'Invalid federation index',
        ...issues.map(({ path, message }) => `${path.length ? path.join('.') : '<root>'}: ${message}`),
      ].join('\n')
    );
    this.name = 'InvalidIndexError';
    this.issues = issues;
  }
}

const nonEmptyString = z.string().min(1);
const contentHash = z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Expected a full sha256 digest');

const ResourcePointerSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString.optional(),
    type: nonEmptyString.optional(),
  })
  .strict();

const ChannelPointerSchema = ResourcePointerSchema.extend({
  label: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
});

const TriggerPointerSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString.optional(),
    condition: z.string().optional(),
  })
  .strict();

const SendsPointerSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString.optional(),
    fields: z.array(z.string()).optional(),
    to: z.array(ChannelPointerSchema).optional(),
    group: z.string().optional(),
  })
  .strict();

const ReceivesPointerSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString.optional(),
    fields: z.array(z.string()).optional(),
    from: z.array(ChannelPointerSchema).optional(),
    group: z.string().optional(),
    triggers: z.array(TriggerPointerSchema).optional(),
  })
  .strict();

const SystemRelationshipPointerSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString.optional(),
    label: z.string().optional(),
  })
  .strict();

const SystemActorRelationshipSchema = z
  .object({
    id: nonEmptyString,
    name: z.string().optional(),
    label: z.string().optional(),
    direction: z.enum(['inbound', 'outbound']).optional(),
  })
  .strict();

const IndexSchemaPointerSchema = z
  .object({
    id: z.string().optional(),
    ref: z.string().optional(),
    path: z.string().optional(),
    name: z.string().optional(),
    format: z.string().optional(),
    environments: z.array(z.string()).optional(),
    default: z.boolean().optional(),
    hash: contentHash.optional(),
  })
  .strict();

const IndexSpecificationSchema = z
  .object({
    type: z.enum(['openapi', 'asyncapi', 'graphql']),
    path: nonEmptyString,
    name: z.string().optional(),
    hash: contentHash.optional(),
  })
  .strict();

const IndexSidecarSchema = z
  .object({
    path: nonEmptyString,
    hash: contentHash.optional(),
  })
  .strict();

const IndexAssetSchema = z
  .object({
    path: nonEmptyString,
    hash: contentHash.optional(),
  })
  .strict();

const IndexReferenceSchema = ResourcePointerSchema.extend({
  kind: z.enum(['agent', 'container', 'data-product', 'flow', 'message', 'service']),
});

const AdrPointerSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString.optional(),
  })
  .strict();

const AdrResourcePointerSchema = AdrPointerSchema.extend({
  type: z.enum([
    'agent',
    'service',
    'event',
    'command',
    'query',
    'flow',
    'channel',
    'domain',
    'system',
    'user',
    'team',
    'container',
    'entity',
    'diagram',
    'data-product',
  ]),
});

const DataProductOutputPointerSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString.optional(),
    contract: z
      .object({
        path: nonEmptyString,
        name: nonEmptyString,
        type: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const UserMemberSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    avatarUrl: z.string().optional(),
    role: z.string().optional(),
    hidden: z.boolean().optional(),
    source: z
      .object({
        provider: nonEmptyString,
        id: z.string().optional(),
        url: z.string().optional(),
      })
      .strict()
      .optional(),
    readOnly: z.boolean().optional(),
    email: z.string().optional(),
    slackDirectMessageUrl: z.string().optional(),
    markdown: z.string(),
  })
  .passthrough();

const IndexResourceSchema = z
  .object({
    type: z.enum([
      'adr',
      'agent',
      'command',
      'container',
      'data-product',
      'diagram',
      'domain',
      'entity',
      'event',
      'flow',
      'query',
      'service',
      'system',
      'team',
      'user',
    ]),
    id: nonEmptyString,
    version: nonEmptyString.optional(),
    name: nonEmptyString,
    contentPath: nonEmptyString,
    contentHash: contentHash.optional(),
    draft: z.union([z.boolean(), z.object({ title: z.string().optional(), message: z.string().optional() }).strict()]).optional(),
    deprecated: z
      .union([z.boolean(), z.object({ date: z.string().optional(), message: z.string().optional() }).strict()])
      .optional(),
    owners: z.array(z.string()).optional(),
    diagrams: z.array(ResourcePointerSchema).optional(),
    schemas: z.array(IndexSchemaPointerSchema).optional(),
    specifications: z.array(IndexSpecificationSchema).optional(),
    sidecars: z.array(IndexSidecarSchema).optional(),
    container_type: z
      .enum(['database', 'cache', 'objectStore', 'searchIndex', 'dataWarehouse', 'dataLake', 'externalSaaS', 'other'])
      .optional(),
    references: z.array(IndexReferenceSchema).optional(),
    sends: z.array(SendsPointerSchema).optional(),
    receives: z.array(ReceivesPointerSchema).optional(),
    services: z.array(ResourcePointerSchema).optional(),
    agents: z.array(ResourcePointerSchema).optional(),
    domains: z.array(ResourcePointerSchema).optional(),
    systems: z.array(ResourcePointerSchema).optional(),
    entities: z.array(ResourcePointerSchema).optional(),
    dataProducts: z.array(ResourcePointerSchema).optional(),
    flows: z.array(ResourcePointerSchema).optional(),
    writesTo: z.array(ResourcePointerSchema).optional(),
    readsFrom: z.array(ResourcePointerSchema).optional(),
    containers: z.array(ResourcePointerSchema).optional(),
    relationships: z.array(SystemRelationshipPointerSchema).optional(),
    actors: z.array(SystemActorRelationshipSchema).optional(),
    inputs: z.array(ResourcePointerSchema).optional(),
    outputs: z.array(DataProductOutputPointerSchema).optional(),
    status: z.enum(['proposed', 'accepted', 'rejected', 'deprecated', 'superseded']).optional(),
    appliesTo: z.array(AdrResourcePointerSchema).optional(),
    supersedes: z.array(AdrPointerSchema).optional(),
    supersededBy: z.array(AdrPointerSchema).optional(),
    amends: z.array(AdrPointerSchema).optional(),
    amendedBy: z.array(AdrPointerSchema).optional(),
    related: z.array(AdrPointerSchema).optional(),
    members: z.union([z.array(z.string()), z.array(UserMemberSchema)]).optional(),
  })
  .strict();

export const FederationIndexSchema = z
  .object({
    indexVersion: z.literal(1),
    source: nonEmptyString,
    commit: nonEmptyString,
    resources: z.array(IndexResourceSchema),
    assets: z.array(IndexAssetSchema).optional(),
  })
  .strict();

export const parseIndex = (input: unknown): Index => {
  const result = FederationIndexSchema.safeParse(input);

  if (!result.success) {
    throw new InvalidIndexError(
      result.error.issues.map((issue) => ({
        path: issue.path.map((segment) => (typeof segment === 'symbol' ? segment.toString() : segment)),
        message: issue.message,
      }))
    );
  }

  return result.data;
};
