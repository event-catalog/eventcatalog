import { z } from 'zod';
import { baseSchema } from './common';

const propertySchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  description: z.string().optional(),
  references: z.string().optional(),
  referencesIdentifier: z.string().optional(),
  relationType: z.string().optional(),
});

export const entitySchema = z
  .object({
    aggregateRoot: z.boolean().optional(),
    identifier: z.string().optional(),
    properties: z.array(propertySchema).optional(),
    services: z.array(z.any()).optional(), // reference('services')
    domains: z.array(z.any()).optional(), // reference('domains')
  })
  .merge(baseSchema);
