import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema, pointerSchema, resourcePointerSchema } from './common';

export const adrSchema = z
  .object({
    status: z.enum(['proposed', 'accepted', 'rejected', 'deprecated', 'superseded']),
    date: z.coerce.date(),
    decisionMakers: z.array(z.any()).optional(),
    appliesTo: z.array(resourcePointerSchema).optional(),
    supersedes: z.array(pointerSchema).optional(),
    supersededBy: z.array(pointerSchema).optional(),
    amends: z.array(pointerSchema).optional(),
    amendedBy: z.array(pointerSchema).optional(),
    related: z.array(pointerSchema).optional(),
    detailsPanel: z
      .object({
        status: detailPanelPropertySchema,
        date: detailPanelPropertySchema,
        decisionMakers: detailPanelPropertySchema,
        appliesTo: detailPanelPropertySchema,
        relationships: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
