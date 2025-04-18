import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type ChatPrompt = CollectionEntry<'chatPrompts'>;

// Update cache to store both versions
let cachedChatPrompts: Record<string, ChatPrompt[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getChatPrompts = async (): Promise<ChatPrompt[]> => {
  const cacheKey = 'allVersions';

  // Check if we have cached domains for this specific getAllVersions value
  if (cachedChatPrompts[cacheKey].length > 0) {
    return cachedChatPrompts[cacheKey];
  }

  const prompts = await getCollection('chatPrompts');

  return prompts;
};

export type ChatPromptCategoryGroup = {
  label: string;
  icon?: string;
  items: ChatPrompt[];
};

export const getChatPromptsGroupedByCategory = async (): Promise<ChatPromptCategoryGroup[]> => {
  const prompts = await getChatPrompts();

  const grouped = prompts.reduce(
    (acc, prompt) => {
      const { id, label, icon } = prompt.data.category;

      if (!acc[id]) {
        acc[id] = { label, icon, items: [] };
      }

      acc[id].items.push(prompt);
      return acc;
    },
    {} as Record<string, { label: string; icon?: string; items: ChatPrompt[] }>
  );

  // Convert the grouped object into the desired array format
  return Object.values(grouped);
};
