import { z } from 'zod';
import { baseSchema, detailPanelPropertySchema, pointerSchema, channelPointerSchema } from './common';

const parameterSchema = z.object({
  enum: z.array(z.string()).optional(),
  default: z.string().optional(),
  examples: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const channelSchema = z
  .object({
    channels: z.array(channelPointerSchema).optional(),
    address: z.string().optional(),
    protocols: z.array(z.string()).optional(),
    deliveryGuarantee: z.enum(['at-most-once', 'at-least-once', 'exactly-once']).optional(),
    routes: z.array(channelPointerSchema).optional(),
    parameters: z.record(parameterSchema).optional(),
    messages: z.array(z.object({ collection: z.string(), name: z.string(), ...pointerSchema.shape })).optional(),
    detailsPanel: z
      .object({
        producers: detailPanelPropertySchema,
        consumers: detailPanelPropertySchema,
        messages: detailPanelPropertySchema,
        protocols: detailPanelPropertySchema,
        parameters: detailPanelPropertySchema,
        versions: detailPanelPropertySchema,
        repository: detailPanelPropertySchema,
        owners: detailPanelPropertySchema,
        changelog: detailPanelPropertySchema,
        attachments: detailPanelPropertySchema,
      })
      .optional(),
  })
  .merge(baseSchema);
