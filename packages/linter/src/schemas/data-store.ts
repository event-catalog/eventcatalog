import { z } from 'zod';
import { baseSchema } from './common';

export const dataStoreSchema = z
  .object({
    container_type: z.enum(['database', 'cache', 'objectStore', 'searchIndex', 'dataWarehouse', 'dataLake', 'externalSaaS']),
    technology: z.string().optional(),
    authoritative: z.boolean().optional(),
    access_mode: z.enum(['read', 'write', 'readWrite', 'appendOnly']),
    classification: z.enum(['public', 'internal', 'confidential', 'regulated']),
    residency: z.string().optional(),
    retention: z.string().optional(),
  })
  .merge(baseSchema);
