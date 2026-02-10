import { z } from 'zod';
import { baseSchema, pointerSchema } from './common';

export const serviceSchema = z
  .object({
    sends: z.array(pointerSchema).optional(),
    receives: z.array(pointerSchema).optional(),
    entities: z.array(pointerSchema).optional(),
    writesTo: z.array(pointerSchema).optional(),
    readsFrom: z.array(pointerSchema).optional(),
  })
  .merge(baseSchema);
