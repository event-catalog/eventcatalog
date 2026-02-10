import { z } from 'zod';
import { baseSchema, pointerSchema } from './common';

const parameterSchema = z.object({
  enum: z.array(z.string()).optional(),
  default: z.string().optional(),
  examples: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const channelSchema = z
  .object({
    address: z.string().optional(),
    protocols: z.array(z.string()).optional(),
    parameters: z.record(parameterSchema).optional(),
    messages: z.array(z.object({ collection: z.string(), name: z.string(), ...pointerSchema.shape })).optional(),
  })
  .merge(baseSchema);
