import { z } from 'astro/zod';

/** A reference to a versioned resource in the catalog (the latest version unless one is given) */
export const pointer = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
});
