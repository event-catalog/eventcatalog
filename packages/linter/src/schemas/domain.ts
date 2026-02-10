import { z } from 'zod';
import { baseSchema, pointerSchema } from './common';

export const domainSchema = z
  .object({
    services: z.array(pointerSchema).optional(),
    domains: z.array(pointerSchema).optional(),
    entities: z.array(pointerSchema).optional(),
  })
  .merge(baseSchema);
