import { glob } from 'astro/loaders';
import { z, defineCollection } from 'astro:content';
import { projectDirBase } from '../../content.config';

export const customPages = defineCollection({
    loader: glob({
        pattern: ['docs/hello-world.mdx'],
        base: projectDirBase,
    }),
    schema: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        sidebar: z.object({
            label: z.string(),
            order: z.number(),
        }),
    }),
});