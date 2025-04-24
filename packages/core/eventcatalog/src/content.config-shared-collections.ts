import { z } from 'astro:content';

// Shared schemas used across multiple files
export const badge = z.object({
  content: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  icon: z.string().optional(),
});

// Create a union type for owners
export const ownerReference = z
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
