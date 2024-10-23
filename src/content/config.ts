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

const pointer = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
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
const ownerReference = z.union([reference('users'), reference('teams')]);

const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  version: z.string(),
  badges: z.array(badge).optional(),
  owners: z.array(ownerReference).optional(),
  schemaPath: z.string().optional(),
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
  pathToFile: z.string().optional(),
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
  type: 'content',
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

const queries = defineCollection({
  type: 'content',
  schema: z
    .object({
      producers: z.array(reference('services')).optional(),
      consumers: z.array(reference('services')).optional(),
    })
    .merge(baseSchema),
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
    ownedDomains: z.array(reference('domains')).optional(),
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
  users,
  teams,
  domains,
  flows,
  pages,
  changelogs,
};
