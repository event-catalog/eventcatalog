/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { z } from 'astro/zod';
import { badge } from '../../content.config-shared-collections';

export const resourceDocsSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  version: z.string().optional(),
  order: z.number().optional(),
  badges: z.array(badge).optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  slug: z.string().optional(),
  hidden: z.boolean().optional(),
});

export const resourceDocCategoriesSchema = z.object({
  label: z.string().optional(),
  position: z.number().optional(),
});
