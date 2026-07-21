import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema } from './common';

export interface EntityPropertySchema {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  references?: string;
  referencesIdentifier?: string;
  referenceTarget?: 'entity';
  relationType?: string;
  enum?: string[];
  properties?: EntityPropertySchema[];
  items?: {
    type: string;
    properties?: EntityPropertySchema[];
  };
}

const propertySchema: z.ZodType<EntityPropertySchema> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().optional(),
    description: z.string().optional(),
    references: z.string().optional(),
    referencesIdentifier: z.string().optional(),
    referenceTarget: z.literal('entity').optional(),
    relationType: z.string().optional(),
    enum: z.array(z.string()).optional(),
    properties: z.array(propertySchema).optional(),
    items: z
      .object({
        type: z.string(),
        properties: z.array(propertySchema).optional(),
      })
      .optional(),
  })
);

export const entitySchema = z
  .object({
    aggregateRoot: z.boolean().optional(),
    identifier: z.string().optional(),
    properties: z.array(propertySchema).optional(),
    services: z.array(z.any()).optional(), // reference('services')
    domains: z.array(z.any()).optional(), // reference('domains')
    detailsPanel: z
      .object({
        domains: detailPanelPropertySchema,
        services: detailPanelPropertySchema,
        messages: detailPanelPropertySchema,
        versions: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        attachments: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
