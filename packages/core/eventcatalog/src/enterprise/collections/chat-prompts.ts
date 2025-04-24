import { z } from 'astro:content';

export const chatPromptsSchema = z.object({
  title: z.string(),
  type: z.enum(['text', 'code']).default('text'),
  inputs: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z
          .enum([
            'text',
            'resource-list-events',
            'resource-list-services',
            'resource-list-commands',
            'resource-list-queries',
            'code',
            'text-area',
            'select',
          ])
          .default('text'),
        options: z.array(z.string()).optional(),
      })
    )
    .optional(),
  category: z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
  }),
});
