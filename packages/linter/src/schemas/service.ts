import { z } from 'zod';
import { baseSchema, pointerSchema, receivesPointerSchema, sendsPointerSchema, detailPanelPropertySchema } from './common';

export const serviceSchema = z
  .object({
    sends: z.array(sendsPointerSchema).optional(),
    receives: z.array(receivesPointerSchema).optional(),
    entities: z.array(pointerSchema).optional(),
    writesTo: z.array(pointerSchema).optional(),
    readsFrom: z.array(pointerSchema).optional(),
    flows: z.array(pointerSchema).optional(),
    externalSystem: z.boolean().optional(),
    detailsPanel: z
      .object({
        domains: detailPanelPropertySchema,
        messages: detailPanelPropertySchema,
        versions: detailPanelPropertySchema,
        specifications: detailPanelPropertySchema,
        entities: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        containers: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
