import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema } from './common';

export const diagramSchema = z
  .object({
    detailsPanel: z
      .object({
        versions: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        attachments: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
