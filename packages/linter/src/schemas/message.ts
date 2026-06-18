import { z } from 'zod';
import { baseSchema, channelPointerSchema, detailPanelPropertySchema } from './common';

const operationSchema = z
  .object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
    path: z.string().optional(),
    statusCodes: z.array(z.string()).optional(),
  })
  .optional();

const messageDetailsPanelSchema = z
  .object({
    producers: detailPanelPropertySchema,
    consumers: detailPanelPropertySchema,
    channels: detailPanelPropertySchema,
    versions: detailPanelPropertySchema,
    repository: detailPanelPropertySchema,
    owners: detailPanelPropertySchema,
    changelog: detailPanelPropertySchema,
    attachments: detailPanelPropertySchema,
  })
  .optional();

const baseMessageSchema = z
  .object({
    operation: operationSchema,
    producers: z.array(z.any()).optional(), // reference('services')
    consumers: z.array(z.any()).optional(), // reference('services')
    channels: z.array(channelPointerSchema).optional(),
    schemas: z
      .array(
        z.object({
          id: z.string().optional(),
          ref: z.string().optional(),
          file: z.string().optional(),
          path: z.string().optional(),
          name: z.string().optional(),
          format: z.string().optional(),
          environments: z.array(z.string()).optional(),
          default: z.boolean().optional(),
        })
      )
      .optional(),
    messageChannels: z.array(z.any()).optional(), // reference('channels')
    detailsPanel: messageDetailsPanelSchema,
  })
  .merge(baseSchema);

export const eventSchema = baseMessageSchema;
export const commandSchema = baseMessageSchema;
export const querySchema = baseMessageSchema;
