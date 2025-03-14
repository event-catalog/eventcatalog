import { z, defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { v4 as uuidv4 } from 'uuid';

const projectDirBase = (() => {
  if (process.platform === 'win32') {
    const projectDirPath = process.env.PROJECT_DIR!.replace(/\\/g, '/');
    return projectDirPath.startsWith('/') ? projectDirPath : `/${projectDirPath}`;
  }
  return process.env.PROJECT_DIR;
})();

const badge = z.object({
  content: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
});

const pages = defineCollection({
  type: 'content',
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

// Create a union type for owners
const ownerReference = z
  .union([
    // The ID of the user or team
    z.string(),
    // The full object with the ID and collection (keep compatibility with `reference`)
    z.object({
      id: z.string(),
      collection: z.enum(['users', 'teams']),
    }),
  ])
  .transform(
    // This transformation is needed to keep compatibility with `reference`.
    // The utilities `getTeams` and `getUsers` rely on this transformation.
    (lookup) => ({ id: typeof lookup === 'string' ? lookup : lookup.id })
  );

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
    .object({
      openapiPath: z.string().optional(),
      asyncapiPath: z.string().optional(),
    })
    .optional(),
  hidden: z.boolean().optional(),
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
            actor: z
              .object({
                name: z.string(),
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
            if (!data.message && !data.service && !data.actor) return true;
            // Cant have both next_steps and next_steps
            if (data.next_step && data.next_steps) return false;
            // Either message or service or actor must be present, but not all
            return (
              (data.message && !data.service && !data.actor) ||
              (!data.message && data.service) ||
              (data.actor && !data.message && !data.service)
            );
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
    })
    .merge(baseSchema),
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
  ubiquitousLanguages,
};
