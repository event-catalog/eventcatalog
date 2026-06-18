import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema } from './common';

export const containerSchema = z
  .object({
    container_type: z.enum([
      'database',
      'cache',
      'objectStore',
      'searchIndex',
      'dataWarehouse',
      'dataLake',
      'externalSaaS',
      'other',
    ]),
    technology: z.string().optional(),
    authoritative: z.boolean().optional().default(false),
    access_mode: z.enum(['read', 'write', 'readWrite', 'appendOnly']).optional(),
    classification: z.enum(['public', 'internal', 'confidential', 'regulated']).optional(),
    residency: z.string().optional(),
    retention: z.string().optional(),
    detailsPanel: z
      .object({
        versions: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        attachments: detailPanelPropertySchema,
        services: detailPanelPropertySchema,
        flows: detailPanelPropertySchema,
      })
      .optional(),
    services: z.array(z.any()).optional(),
    servicesThatWriteToContainer: z.array(z.any()).optional(),
    servicesThatReadFromContainer: z.array(z.any()).optional(),
    dataProductsThatWriteToContainer: z.array(z.any()).optional(),
    dataProductsThatReadFromContainer: z.array(z.any()).optional(),
  })
  .merge(baseSchema);
