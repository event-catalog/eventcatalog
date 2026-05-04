import { z } from 'zod';

export const KNOWN_THEMES = ['default', 'ocean', 'sapphire', 'sunset', 'forest'] as const;
export type KnownTheme = (typeof KNOWN_THEMES)[number];

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v === undefined || v.trim() === '' ? undefined : v));

const optionalUrl = z
  .string()
  .max(2048)
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : v))
  .refine((v) => v === undefined || /^https?:\/\//i.test(v), {
    message: 'Must be a valid URL starting with http:// or https://',
  });

export const generalSettingsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  tagline: optionalString(500),
  organizationName: optionalString(100),
  homepageLink: optionalUrl,
  editUrl: optionalUrl,
  repositoryUrl: optionalUrl,
  logo: z
    .object({
      alt: optionalString(200),
      text: optionalString(50),
    })
    .partial()
    .optional(),
  // Allow unknown current theme value (e.g., user hand-edited) so we don't clobber it.
  theme: z.string().min(1).max(100),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export const aiSettingsSchema = z.object({
  llmsTxtEnabled: z.boolean(),
  chatEnabled: z.boolean(),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;

export const isKnownTheme = (value: string): value is KnownTheme => (KNOWN_THEMES as readonly string[]).includes(value);
