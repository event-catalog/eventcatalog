import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema, pointerSchema } from './common';

const systemRelationshipPointerSchema = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
  label: z.string().optional(),
});

const systemActorRelationshipSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  label: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional().default('inbound'),
});

export const systemSchema = z
  .object({
    scope: z.enum(['internal', 'external']).optional().default('internal'),
    services: z.array(pointerSchema).optional(),
    flows: z.array(pointerSchema).optional(),
    entities: z.array(pointerSchema).optional(),
    containers: z.array(pointerSchema).optional(),
    relationships: z.array(systemRelationshipPointerSchema).optional(),
    actors: z.array(systemActorRelationshipSchema).optional(),
    detailsPanel: z
      .object({
        versions: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        attachments: detailPanelPropertySchema,
        services: detailPanelPropertySchema,
        flows: detailPanelPropertySchema,
        entities: detailPanelPropertySchema,
        containers: detailPanelPropertySchema,
        diagrams: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
