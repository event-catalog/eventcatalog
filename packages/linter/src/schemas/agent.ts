import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema, pointerSchema, receivesPointerSchema, sendsPointerSchema } from './common';

const agentToolSchema = z.object({
  name: z.string(),
  type: z.string(),
  icon: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

const agentModelSchema = z.object({
  provider: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
});

export const agentSchema = z
  .object({
    sends: z.array(sendsPointerSchema).optional(),
    receives: z.array(receivesPointerSchema).optional(),
    writesTo: z.array(pointerSchema).optional(),
    readsFrom: z.array(pointerSchema).optional(),
    flows: z.array(pointerSchema).optional(),
    model: agentModelSchema.optional(),
    tools: z.array(agentToolSchema).optional(),
    specifications: z.undefined().optional(),
    detailsPanel: z
      .object({
        domains: detailPanelPropertySchema,
        messages: detailPanelPropertySchema,
        versions: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        containers: detailPanelPropertySchema,
        tools: detailPanelPropertySchema,
        model: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema.omit({ specifications: true }));
