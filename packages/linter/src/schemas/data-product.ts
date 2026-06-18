import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema, pointerSchema } from './common';

const dataProductOutputPointerSchema = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
  contract: z
    .object({
      path: z.string(),
      name: z.string(),
      type: z.string().optional(),
    })
    .optional(),
});

export const dataProductSchema = z
  .object({
    inputs: z.array(pointerSchema).optional(),
    outputs: z.array(dataProductOutputPointerSchema).optional(),
    detailsPanel: z
      .object({
        domains: detailPanelPropertySchema,
        inputs: detailPanelPropertySchema,
        outputs: detailPanelPropertySchema,
        versions: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        flows: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
