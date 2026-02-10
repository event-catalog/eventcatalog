import { z } from 'zod';
import { baseSchema, channelPointerSchema } from './common';

const baseMessageSchema = z
  .object({
    producers: z.array(z.any()).optional(), // reference('services')
    consumers: z.array(z.any()).optional(), // reference('services')
    channels: z.array(channelPointerSchema).optional(),
    messageChannels: z.array(z.any()).optional(), // reference('channels')
  })
  .merge(baseSchema);

export const eventSchema = baseMessageSchema;
export const commandSchema = baseMessageSchema;
export const querySchema = baseMessageSchema;
