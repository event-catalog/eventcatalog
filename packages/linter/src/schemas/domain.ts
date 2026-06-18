import { z } from 'zod';
import { baseSchema, pointerSchema, receivesPointerSchema, sendsPointerSchema, detailPanelPropertySchema } from './common';

export const domainSchema = z
  .object({
    services: z.array(pointerSchema).optional(),
    agents: z.array(pointerSchema).optional(),
    domains: z.array(pointerSchema).optional(),
    entities: z.array(pointerSchema).optional(),
    'data-products': z.array(pointerSchema).optional(),
    dataProducts: z.array(pointerSchema).optional(),
    flows: z.array(pointerSchema).optional(),
    sends: z.array(sendsPointerSchema).optional(),
    receives: z.array(receivesPointerSchema).optional(),
    detailsPanel: z
      .object({
        parentDomains: detailPanelPropertySchema,
        subdomains: detailPanelPropertySchema,
        services: detailPanelPropertySchema,
        agents: detailPanelPropertySchema,
        entities: detailPanelPropertySchema,
        messages: detailPanelPropertySchema,
        ubiquitousLanguage: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        versions: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        attachments: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
