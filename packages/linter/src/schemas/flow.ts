import { z } from 'zod';
import { baseSchema, pointerSchema } from './common';

const flowStep = z
  .union([
    z.union([z.string(), z.number()]),
    z
      .object({
        id: z.union([z.string(), z.number()]),
        label: z.string().optional(),
      })
      .optional(),
  ])
  .optional();

const flowStepSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    type: z.enum(['node', 'message', 'user', 'actor']).optional(),
    title: z.string(),
    summary: z.string().optional(),
    message: pointerSchema.optional(),
    service: pointerSchema.optional(),
    flow: pointerSchema.optional(),
    actor: z
      .object({
        name: z.string(),
      })
      .optional(),
    custom: z
      .object({
        title: z.string(),
        icon: z.string().optional(),
        type: z.string().optional(),
        summary: z.string().optional(),
        url: z.string().url().optional(),
        color: z.string().optional(),
        properties: z.record(z.union([z.string(), z.number()])).optional(),
        height: z.number().optional(),
        menu: z
          .array(
            z.object({
              label: z.string(),
              url: z.string().url().optional(),
            })
          )
          .optional(),
      })
      .optional(),
    externalSystem: z
      .object({
        name: z.string(),
        summary: z.string().optional(),
        url: z.string().url().optional(),
      })
      .optional(),
    next_step: flowStep,
    next_steps: z.array(flowStep).optional(),
  })
  .refine((data) => {
    if (data.next_step && data.next_steps) return false;
    const typesUsed = [data.message, data.service, data.flow, data.actor, data.custom].filter((v) => v).length;
    return typesUsed === 0 || typesUsed === 1;
  });

export const flowSchema = z
  .object({
    steps: z.array(flowStepSchema),
  })
  .merge(baseSchema);
