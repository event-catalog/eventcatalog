import { z, defineCollection, reference } from 'astro:content';

const badge = z.object({
  content: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
  }),
});

const changelogs = defineCollection({
  type: 'content',
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
        filePath: z.string(),
        publicPath: z.string(),
        type: z.string(),
      })
      .optional(),
  }),
});

// Create a union type for owners
const ownerReference = z.union([reference('users'), reference('teams')]);

const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  version: z.string(),
  badges: z.array(badge).optional(),
  owners: z.array(ownerReference).optional(),
  schemaPath: z.string().optional(),
  hidden: z.boolean().optional(),
  // Used by eventcatalog
  versions: z.array(z.string()).optional(),
  latestVersion: z.string().optional(),
  catalog: z
    .object({
      path: z.string(),
      filePath: z.string(),
      publicPath: z.string(),
      type: z.string(),
    })
    .optional(),
});

const events = defineCollection({
  type: 'content',
  schema: z
    .object({
      producers: z.array(reference('services')).optional(),
      consumers: z.array(reference('services')).optional(),
    })
    .merge(baseSchema),
});

const commands = defineCollection({
  type: 'content',
  schema: z
    .object({
      producers: z.array(reference('services')).optional(),
      consumers: z.array(reference('services')).optional(),
    })
    .merge(baseSchema),
});

const pointer = z.object({
  id: z.string(),
  version: z.string(),
});

const services = defineCollection({
  type: 'content',
  schema: z
    .object({
      sends: z.array(pointer).optional(),
      receives: z.array(pointer).optional(),
    })
    .merge(baseSchema),
});

const domains = defineCollection({
  type: 'content',
  schema: z
    .object({
      services: z.array(pointer).optional(),
    })
    .merge(baseSchema),
});

const users = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string(),
    role: z.string().optional(),
    hidden: z.boolean().optional(),
    email: z.string().optional(),
    slackDirectMessageUrl: z.string().optional(),
    ownedServices: z.array(reference('services')).optional(),
    ownedEvents: z.array(reference('events')).optional(),
    ownedCommands: z.array(reference('commands')).optional(),
    associatedTeams: z.array(reference('teams')).optional(),
  }),
});

const teams = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    summary: z.string().optional(),
    email: z.string().optional(),
    hidden: z.boolean().optional(),
    slackDirectMessageUrl: z.string().optional(),
    members: z.array(reference('users')).optional(),
    ownedCommands: z.array(reference('commands')).optional(),
    ownedServices: z.array(reference('services')).optional(),
    ownedEvents: z.array(reference('events')).optional(),
  }),
});

export const collections = {
  events,
  commands,
  services,
  users,
  teams,
  domains,
  pages,
  changelogs,
};
