import type { CollectionEntry } from 'astro:content';

// Shared types to avoid circular dependencies between domains.ts and services.ts
export type Service = CollectionEntry<'services'>;
export type Domain = CollectionEntry<'domains'>;
export type UbiquitousLanguage = CollectionEntry<'ubiquitousLanguages'>;
