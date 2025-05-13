import { z, defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { v4 as uuidv4 } from 'uuid';
import { badge, ownerReference } from './content.config-shared-collections';

// Enterprise Collections
import { chatPromptsSchema, customPagesSchema } from './enterprise/collections';

export const projectDirBase = (() => {
  if (process.platform === 'win32') {
    const projectDirPath = process.env.PROJECT_DIR!.replace(/\\/g, '/');
    return projectDirPath.startsWith('/') ? projectDirPath : `/${projectDirPath}`;
  }
  return process.env.PROJECT_DIR;
})();

const pages = defineCollection({
  loader: glob({
    pattern: ['**/pages/*.(md|mdx)'],
    base: projectDirBase,
  }),
  schema: z
    .object({
      id: z.string(),
    })
    .optional(),
});

const pointer = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
});

const channelPointer = z
  .object({
    parameters: z.record(z.string()).optional(),
  })
  .merge(pointer);

const resourcePointer = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
  type: z.enum(['service', 'event', 'command', 'query', 'flow', 'channel', 'domain', 'user', 'team']),
});

const changelogs = defineCollection({
  loader: glob({
    pattern: ['**/changelog.(md|mdx)'],
    base: projectDirBase,
  }),
  schema: z.object({
    createdAt: z.date().optional(),
    badges: z.array(badge).optional(),
    // Used by eventcatalog
    version: z.string().optional(),
    versions: z.array(z.string()).optional(),
    latestVersion: z.string().optional(),
    catalog: z
      .object({
        path: z.string(),
        absoluteFilePath: z.string(),
        astroContentFilePath: z.string(),
        filePath: z.string(),
        publicPath: z.string(),
        type: z.string(),
      })
      .optional(),
  }),
});

const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  version: z.string(),
  badges: z.array(badge).optional(),
  owners: z.array(ownerReference).optional(),
  schemaPath: z.string().optional(),
  sidebar: z
    .object({
      label: z.string().optional(),
      badge: z.string().optional(),
    })
    .optional(),
  repository: z
    .object({
      language: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  specifications: z
    .union([
      z.object({
        openapiPath: z.string().optional(),
        asyncapiPath: z.string().optional(),
      }),
      z.array(
        z.object({
          type: z.enum(['openapi', 'asyncapi']),
          path: z.string(),
          name: z.string().optional(),
        })
      ),
    ])
    .optional(),
  hidden: z.boolean().optional(),
  resourceGroups: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        items: z.array(resourcePointer),
        limit: z.number().optional().default(10),
        sidebar: z.boolean().optional().default(true),
      })
    )
    .optional(),
  styles: z
    .object({
      icon: z.string().optional(),
      node: z
        .object({
          color: z.string().optional(),
          label: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  deprecated: z
    .union([
      z.object({
        message: z.string().optional(),
        date: z.date().optional(),
      }),
      z.boolean().optional(),
    ])
    .optional(),
  // Used by eventcatalog
  versions: z.array(z.string()).optional(),
  latestVersion: z.string().optional(),
  catalog: z
    .object({
      path: z.string(),
      filePath: z.string(),
      astroContentFilePath: z.string(),
      publicPath: z.string(),
      type: z.string(),
    })
    .optional(),
});

const flowStep = z
  .union([
    // Can be a string or a number just to reference a step
    z.union([z.string(), z.number()]),
    z
      .object({
        id: z.union([z.string(), z.number()]),
        label: z.string().optional(),
      })
      .optional(),
  ])
  .optional();

const flows = defineCollection({
  loader: glob({
    pattern: ['**/flows/*/index.(md|mdx)', '**/flows/*/versioned/*/index.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      steps: z.array(
        z
          .object({
            id: z.union([z.string(), z.number()]),
            type: z.enum(['node', 'message', 'user', 'actor']).optional(),
            title: z.string(),
            summary: z.string().optional(),
            message: pointer.optional(),
            service: pointer.optional(),
            flow: pointer.optional(),
            actor: z
              .object({
                name: z.string(),
              })
              .optional(),
            custom: z
              .object({
                title: z.string(),
                icon: z.string().optional(),
                type: z.string().optional(),
                summary: z.string().optional(),
                url: z.string().url().optional(),
                color: z.string().optional(),
                properties: z.record(z.union([z.string(), z.number()])).optional(),
                height: z.number().optional(),
                menu: z
                  .array(
                    z.object({
                      label: z.string(),
                      url: z.string().url().optional(),
                    })
                  )
                  .optional(),
              })
              .optional(),
            externalSystem: z
              .object({
                name: z.string(),
                summary: z.string().optional(),
                url: z.string().url().optional(),
              })
              .optional(),
            next_step: flowStep,
            next_steps: z.array(flowStep).optional(),
          })
          .refine((data) => {
            // Cant have both next_steps and next_steps
            if (data.next_step && data.next_steps) return false;

            // Either one or non types can be present
            const typesUsed = [data.message, data.service, data.flow, data.actor, data.custom].filter((v) => v).length;
            return typesUsed === 0 || typesUsed === 1;
          })
      ),
    })
    .merge(baseSchema),
});

const events = defineCollection({
  loader: glob({
    pattern: ['**/events/*/index.(md|mdx)', '**/events/*/versioned/*/index.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data, ...rest }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      producers: z.array(reference('services')).optional(),
      consumers: z.array(reference('services')).optional(),
      channels: z.array(channelPointer).optional(),
      // Used by eventcatalog
      messageChannels: z.array(reference('channels')).optional(),
    })
    .merge(baseSchema),
});

const commands = defineCollection({
  loader: glob({
    pattern: ['**/commands/*/index.(md|mdx)', '**/commands/*/versioned/*/index.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      producers: z.array(reference('services')).optional(),
      consumers: z.array(reference('services')).optional(),
      channels: z.array(channelPointer).optional(),
      // Used by eventcatalog
      messageChannels: z.array(reference('channels')).optional(),
    })
    .merge(baseSchema),
});

const queries = defineCollection({
  loader: glob({
    pattern: ['**/queries/*/index.(md|mdx)', '**/queries/*/versioned/*/index.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      producers: z.array(reference('services')).optional(),
      consumers: z.array(reference('services')).optional(),
      channels: z.array(channelPointer).optional(),
      // Used by eventcatalog
      messageChannels: z.array(reference('channels')).optional(),
    })
    .merge(baseSchema),
});

const services = defineCollection({
  loader: glob({
    pattern: [
      'domains/*/services/*/index.(md|mdx)',
      'domains/*/services/*/versioned/*/index.(md|mdx)',
      'services/*/index.(md|mdx)', // ✅ Capture only services markdown files
      'services/*/versioned/*/index.(md|mdx)', // ✅ Capture versioned files inside services
    ],
    base: projectDirBase,
    generateId: ({ data, ...rest }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      sends: z.array(pointer).optional(),
      receives: z.array(pointer).optional(),
      entities: z.array(pointer).optional(),
    })
    .merge(baseSchema),
});

const customPages = defineCollection({
  loader: glob({
    // any number of child folders
    pattern: ['docs/*.(md|mdx)', 'docs/**/*.@(md|mdx)'],
    base: projectDirBase,
  }),
  schema: customPagesSchema,
});

const chatPrompts = defineCollection({
  loader: glob({
    pattern: ['chat-prompts/*.(md|mdx)', 'chat-prompts/**/*.@(md|mdx)'],
    base: projectDirBase,
  }),
  schema: chatPromptsSchema,
});

const domains = defineCollection({
  loader: glob({
    pattern: [
      // ✅ Strictly include only index.md at the expected levels
      'domains/*/index.(md|mdx)',
      'domains/*/versioned/*/index.(md|mdx)',
    ],
    base: projectDirBase,
    generateId: ({ data, ...rest }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      services: z.array(pointer).optional(),
      domains: z.array(pointer).optional(),
      entities: z.array(pointer).optional(),
    })
    .merge(baseSchema),
});

const channels = defineCollection({
  loader: glob({
    pattern: ['**/channels/*/index.(md|mdx)', '**/channels/*/versioned/*/index.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      address: z.string().optional(),
      protocols: z.array(z.string()).optional(),
      parameters: z
        .record(
          z.object({
            enum: z.array(z.string()).optional(),
            default: z.string().optional(),
            examples: z.array(z.string()).optional(),
            description: z.string().optional(),
          })
        )
        .optional(),
      messages: z.array(z.object({ collection: z.string(), name: z.string(), ...pointer.shape })).optional(),
    })
    .merge(baseSchema),
});

const ubiquitousLanguages = defineCollection({
  loader: glob({
    pattern: ['domains/*/ubiquitous-language.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data }) => {
      // File has no id, so we need to generate one
      return uuidv4();
    },
  }),
  schema: z.object({
    dictionary: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          summary: z.string().optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
        })
      )
      .optional(),
  }),
});

const entities = defineCollection({
  loader: glob({
    pattern: ['**/entities/*/index.(md|mdx)', '**/entities/*/versioned/*/index.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data, ...rest }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      aggregateRoot: z.boolean().optional(),
      identifier: z.string().optional(),
      properties: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            required: z.boolean().optional(),
            description: z.string().optional(),
          })
        )
        .optional(),
      services: z.array(reference('services')).optional(),
      domains: z.array(reference('domains')).optional(),
    })

    .merge(baseSchema),
});

const users = defineCollection({
  loader: glob({ pattern: 'users/*.(md|mdx)', base: projectDirBase, generateId: ({ data }) => data.id as string }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string(),
    role: z.string().optional(),
    hidden: z.boolean().optional(),
    email: z.string().optional(),
    slackDirectMessageUrl: z.string().optional(),
    msTeamsDirectMessageUrl: z.string().optional(),
    ownedDomains: z.array(reference('domains')).optional(),
    ownedServices: z.array(reference('services')).optional(),
    ownedEvents: z.array(reference('events')).optional(),
    ownedCommands: z.array(reference('commands')).optional(),
    ownedQueries: z.array(reference('queries')).optional(),
    associatedTeams: z.array(reference('teams')).optional(),
  }),
});

const teams = defineCollection({
  loader: glob({ pattern: 'teams/*.(md|mdx)', base: projectDirBase, generateId: ({ data }) => data.id as string }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    summary: z.string().optional(),
    email: z.string().optional(),
    hidden: z.boolean().optional(),
    slackDirectMessageUrl: z.string().optional(),
    msTeamsDirectMessageUrl: z.string().optional(),
    members: z.array(reference('users')).optional(),
    ownedCommands: z.array(reference('commands')).optional(),
    ownedQueries: z.array(reference('queries')).optional(),
    ownedDomains: z.array(reference('domains')).optional(),
    ownedServices: z.array(reference('services')).optional(),
    ownedEvents: z.array(reference('events')).optional(),
  }),
});

export const collections = {
  events,
  commands,
  queries,
  services,
  channels,
  users,
  teams,
  domains,
  flows,
  pages,
  changelogs,

  // DDD Collections
  ubiquitousLanguages,
  entities,

  // EventCatalog Pro Collections
  customPages,
  chatPrompts,
};
