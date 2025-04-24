import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import type { ChatPrompt } from '../../utils/chat-prompts';

// Mock data for chat prompts
const mockChatPrompts: ChatPrompt[] = [
  {
    id: 'prompt1.md',
    body: 'Prompt 1 body',
    collection: 'chatPrompts',
    data: {
      title: 'Prompt 1',
      type: 'text',
      category: { id: 'cat1', label: 'Category 1', icon: '💡' },
    },
  },
  {
    id: 'prompt2.md',
    body: 'Prompt 2 body',
    collection: 'chatPrompts',
    data: {
      title: 'Prompt 2',
      type: 'text',
      category: { id: 'cat1', label: 'Category 1', icon: '💡' },
    },
  },
  {
    id: 'prompt3.md',
    body: 'Prompt 3 body',
    collection: 'chatPrompts',
    data: {
      title: 'Prompt 3',
      type: 'text',
      category: { id: 'cat2', label: 'Category 2' },
    },
  },
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'chatPrompts':
          return Promise.resolve(mockChatPrompts);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

// Clear cache before each test
beforeEach(() => {
  vi.resetModules();
});

describe('Chat Prompts Utilities', () => {
  describe('getChatPrompts', () => {
    it('should return an array of chat prompts', async () => {
      // Need to re-import after vi.resetModules()
      const { getChatPrompts } = await import('../../utils/chat-prompts');
      const prompts = await getChatPrompts();
      expect(prompts).toEqual(mockChatPrompts);
    });
  });

  describe('getChatPromptsGroupedByCategory', () => {
    it('should group chat prompts by category', async () => {
      // Re-import after reset
      const { getChatPromptsGroupedByCategory } = await import('../../utils/chat-prompts');
      const groupedPrompts = await getChatPromptsGroupedByCategory();

      const expectedGrouping = [
        {
          label: 'Category 1',
          icon: '💡',
          items: [mockChatPrompts[0], mockChatPrompts[1]],
        },
        {
          label: 'Category 2',
          icon: undefined, // No icon provided for cat2 in mock data
          items: [mockChatPrompts[2]],
        },
      ];

      // Use expect.arrayContaining because the order of categories is not guaranteed
      expect(groupedPrompts).toEqual(
        expect.arrayContaining([expect.objectContaining(expectedGrouping[0]), expect.objectContaining(expectedGrouping[1])])
      );
      expect(groupedPrompts.length).toBe(expectedGrouping.length); // Ensure no extra categories
    });
  });
});
