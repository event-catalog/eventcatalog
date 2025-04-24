import { z } from 'astro:content';
import { badge, ownerReference } from '../../content.config-shared-collections';

export const customPagesSchema = z.object({
  title: z.string(),
  summary: z.string(),
  slug: z.string().optional(),
  sidebar: z
    .object({
      label: z.string(),
      order: z.number(),
    })
    .optional(),
  owners: z.array(ownerReference).optional(),
  badges: z.array(badge).optional(),
});
