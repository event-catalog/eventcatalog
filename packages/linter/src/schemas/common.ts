import { z } from 'zod';

export const badgeSchema = z.object({
  content: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  icon: z.string().optional(),
});

export const ownerReferenceSchema = z
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

export const specificationSchema = z.union([
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
]);

export const repositorySchema = z.object({
  language: z.string().optional(),
  url: z.string().optional(),
});

export const draftSchema = z.union([
  z.boolean(),
  z.object({
    title: z.string().optional(),
    message: z.string(),
  }),
]);

export const deprecatedSchema = z.union([
  z.object({
    message: z.string().optional(),
    date: z.union([z.string(), z.date()]).optional(),
  }),
  z.boolean().optional(),
]);

export const pointerSchema = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
});

export const resourcePointerSchema = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
  type: z.enum(['service', 'event', 'command', 'query', 'flow', 'channel', 'domain', 'user', 'team']),
});

export const channelPointerSchema = z
  .object({
    parameters: z.record(z.string()).optional(),
  })
  .merge(pointerSchema);

export const resourceReferenceSchema = pointerSchema;

export const semverSchema = z.string().refine((version) => {
  // Allow common patterns used in EventCatalog
  if (version === 'latest') return true;

  // Allow x patterns like 0.0.x, 1.x, 2.1.x but not x.x.x
  if (version.includes('.x')) {
    const xPattern = /^\d+(\.\d+)*\.x$/;
    return xPattern.test(version);
  }

  // Allow semver ranges like ^1.0.0, ~1.2.0
  if (version.startsWith('^') || version.startsWith('~')) {
    const rangeVersion = version.substring(1);
    const semverRegex = /^\d+\.\d+\.\d+(-[\w\d-.]+)?(\+[\w\d-.]+)?$/;
    return semverRegex.test(rangeVersion);
  }

  // For strict semver, use a regex that matches the semver spec
  const semverRegex = /^\d+\.\d+\.\d+(-[\w\d-.]+)?(\+[\w\d-.]+)?$/;
  return semverRegex.test(version);
}, 'Invalid semantic version format');

export const sidebarSchema = z
  .object({
    label: z.string().optional(),
    badge: z.string().optional(),
  })
  .optional();

export const stylesSchema = z
  .object({
    icon: z.string().optional(),
    node: z
      .object({
        color: z.string().optional(),
        label: z.string().optional(),
      })
      .optional(),
  })
  .optional();

export const resourceGroupSchema = z
  .array(
    z.object({
      id: z.string().optional(),
      title: z.string().optional(),
      items: z.array(resourcePointerSchema),
      limit: z.number().optional().default(10),
      sidebar: z.boolean().optional().default(true),
    })
  )
  .optional();

export const catalogMetadataSchema = z
  .object({
    path: z.string(),
    filePath: z.string(),
    astroContentFilePath: z.string(),
    publicPath: z.string(),
    type: z.string(),
  })
  .optional();

export const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  version: semverSchema,
  draft: z.union([z.boolean(), z.object({ title: z.string().optional(), message: z.string() })]).optional(),
  badges: z.array(badgeSchema).optional(),
  owners: z.array(ownerReferenceSchema).optional(),
  schemaPath: z.string().optional(),
  sidebar: sidebarSchema,
  repository: repositorySchema.optional(),
  specifications: specificationSchema.optional(),
  hidden: z.boolean().optional(),
  resourceGroups: resourceGroupSchema,
  styles: stylesSchema,
  deprecated: deprecatedSchema.optional(),
  visualiser: z.boolean().optional(),
  versions: z.array(z.string()).optional(),
  latestVersion: z.string().optional(),
  catalog: catalogMetadataSchema,
});
