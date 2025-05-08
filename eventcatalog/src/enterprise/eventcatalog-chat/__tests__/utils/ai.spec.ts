import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import types first
import type { Message, StreamTextResult } from 'ai';
import type { Resource } from '@enterprise/eventcatalog-chat/EventCatalogVectorStore';

// Mock data (adjust based on actual types)
const mockRawDocuments = [{ id: 'doc1', content: 'Document 1 content', type: 'event', title: 'EventOne' }]; // Use title?
const mockEmbeddings = [[0.1, 0.2, 0.3]];
const mockResources: Resource[] = [
  {
    id: 'resource1',
    type: 'event',
    title: 'EventOne',
    summary: 'Summary for EventOne',
    markdown: '```markdown\nEventOne details\n```',
  }, // Use title?
  {
    id: 'resource2',
    type: 'service',
    title: 'ServiceA',
    summary: 'Summary for ServiceA',
    markdown: '```markdown\nServiceA details\n```',
  }, // Use title?
] as any; // Use type assertion to bypass strict Resource type check for summary

// Mock 'fs' *before* importing the module that uses it
vi.doMock('fs', () => ({
  default: {
    readFileSync: vi.fn((path) => {
      if (path.toString().endsWith('documents.json')) {
        return JSON.stringify(mockRawDocuments); // Return the raw structure expected by JSON.parse
      }
      if (path.toString().endsWith('embeddings.json')) {
        return JSON.stringify(mockEmbeddings);
      }
      throw new Error(`Mock fs.readFileSync: Unexpected path: ${path}`);
    }),
  },
}));

// Mock other dependencies
vi.mock('@enterprise/eventcatalog-chat/EventCatalogVectorStore');
vi.mock('@ai-sdk/openai');
vi.mock('@ai-sdk/google');
vi.mock('@ai-sdk/anthropic');
vi.mock('ai', async (importOriginal) => {
  const original = (await importOriginal()) as any;
  return {
    ...original,
    streamText: vi.fn(),
  };
});
vi.mock('@config', () => ({
  default: {
    chat: {
      model: 'o4-mini', // Default mock model
    },
  },
}));

// Now import the module under test
// Use alias/absolute path if relative path causes issues
import { askQuestion } from '@enterprise/eventcatalog-chat/utils/ai';
import { EventCatalogVectorStore } from '@enterprise/eventcatalog-chat/EventCatalogVectorStore';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

describe('AI Utilities', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock EventCatalogVectorStore.create *again* here if needed per test
    // Or rely on the top-level mock if sufficient
    vi.mocked(EventCatalogVectorStore.create).mockResolvedValue({
      getEventCatalogResources: vi.fn().mockResolvedValue(mockResources),
    } as unknown as EventCatalogVectorStore);

    // Mock openai (just needs to return something basic)
    vi.mocked(openai).mockReturnValue({} as any);

    // Mock streamText
    vi.mocked(streamText).mockResolvedValue({
      textStream: new ReadableStream({
        start(controller) {
          // Encode the string to Uint8Array for the stream
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('Mocked AI response.'));
          controller.close();
        },
      }),
      // Add other necessary properties if your code uses them
    } as unknown as StreamTextResult<any, any>); // Provide two type arguments for StreamTextResult
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset modules to ensure config changes are picked up in isolation
    vi.resetModules();
  });

  describe('askQuestion', () => {
    const testQuestion = 'What is ServiceA?';

    it('should call getResources and streamText with default parameters', async () => {
      // Reset getEventCatalogResources mock for this specific call if needed
      const mockGetResources = vi.fn().mockResolvedValue(mockResources);
      vi.mocked(EventCatalogVectorStore.create).mockResolvedValue({
        getEventCatalogResources: mockGetResources,
      } as unknown as EventCatalogVectorStore);

      await askQuestion(testQuestion);

      // Check if getResources was called correctly
      expect(EventCatalogVectorStore.create).toHaveBeenCalled(); // Called during getResources
      expect(mockGetResources).toHaveBeenCalledWith(testQuestion);

      // Check streamText arguments
      expect(streamText).toHaveBeenCalledOnce();
      const streamTextArgs = vi.mocked(streamText).mock.calls[0][0];

      expect(streamTextArgs.model).toBeDefined(); // Check if model is passed
      expect(streamTextArgs.model).toEqual(openai('o4-mini')); // Check the default model
      expect(streamTextArgs.temperature).toBe(0.2);
      expect(streamTextArgs.messages).toBeDefined();
      expect(streamTextArgs.messages!).toHaveLength(2); // System + User // Use non-null assertion
      expect(streamTextArgs.messages![0].role).toBe('system');
      expect(streamTextArgs.messages![0].content).toContain('You are an expert in event-driven architecture');
      // Adjust assertion based on using title instead of name
      expect(streamTextArgs.messages![0].content).toContain(
        '<resource id="resource1" type="event" title="EventOne" summary="Summary for EventOne" />'
      );
      expect(streamTextArgs.messages![0].content).toContain(
        '<resource id="resource2" type="service" title="ServiceA" summary="Summary for ServiceA" />'
      );
      expect(streamTextArgs.messages![0].content).toContain(
        'When you return code examples, make sure you always return them in markdown code blocks.'
      ); // Check added rule
      expect(streamTextArgs.messages![1].role).toBe('user');
      expect(streamTextArgs.messages![1].content).toBe(testQuestion);
    });

    it('should include historic messages', async () => {
      const historicMessages: Message[] = [
        { id: '1', role: 'user', content: 'Previous question' },
        { id: '2', role: 'assistant', content: 'Previous answer' },
      ];
      // Setup mocks for this test specifically if needed
      const mockGetResources = vi.fn().mockResolvedValue(mockResources);
      vi.mocked(EventCatalogVectorStore.create).mockResolvedValue({
        getEventCatalogResources: mockGetResources,
      } as unknown as EventCatalogVectorStore);

      await askQuestion(testQuestion, historicMessages);

      expect(streamText).toHaveBeenCalledOnce();
      const streamTextArgs = vi.mocked(streamText).mock.calls[0][0];
      expect(streamTextArgs.messages).toBeDefined();
      expect(streamTextArgs.messages!).toHaveLength(4); // System + History (2) + User
      expect(streamTextArgs.messages![0].role).toBe('system');
      expect(streamTextArgs.messages![1]).toEqual(historicMessages[0]);
      expect(streamTextArgs.messages![2]).toEqual(historicMessages[1]);
      expect(streamTextArgs.messages![3].role).toBe('user');
      expect(streamTextArgs.messages![3].content).toBe(testQuestion);
    });

    it('should use system prompt override', async () => {
      const customPrompt = 'You are a helpful assistant.';
      // Setup mocks for this test specifically if needed
      const mockGetResources = vi.fn().mockResolvedValue(mockResources);
      vi.mocked(EventCatalogVectorStore.create).mockResolvedValue({
        getEventCatalogResources: mockGetResources,
      } as unknown as EventCatalogVectorStore);

      await askQuestion(testQuestion, [], customPrompt);

      expect(streamText).toHaveBeenCalledOnce();
      const streamTextArgs = vi.mocked(streamText).mock.calls[0][0];
      expect(streamTextArgs.messages).toBeDefined();
      expect(streamTextArgs.messages![0].role).toBe('system');
      expect(streamTextArgs.messages![0].content).toContain(customPrompt);
      expect(streamTextArgs.messages![0].content).not.toContain('You are an expert in event-driven architecture');
      // Check resource context is still appended (adjust for title)
      expect(streamTextArgs.messages![0].content).toContain(
        '<resource id="resource1" type="event" title="EventOne" summary="Summary for EventOne" />'
      );
      // Check the added rule is still appended
      expect(streamTextArgs.messages![0].content).toContain(
        'When you return code examples, make sure you always return them in markdown code blocks.'
      );
    });

    it('should use the model from config if specified', async () => {
      // Mock config specifically for this test
      vi.doMock('@config', () => ({
        default: {
          chat: {
            model: 'gpt-4o', // Different model
          },
        },
      }));

      // Re-import the module under test using the alias/absolute path
      const { askQuestion: askQuestionWithNewConfig } = await import('@enterprise/eventcatalog-chat/utils/ai');

      // Setup mocks for this test specifically if needed
      const mockGetResources = vi.fn().mockResolvedValue(mockResources);
      vi.mocked(EventCatalogVectorStore.create).mockResolvedValue({
        getEventCatalogResources: mockGetResources,
      } as unknown as EventCatalogVectorStore);
      // Ensure streamText is mocked again after module reset/re-import if necessary
      vi.mocked(streamText).mockResolvedValue({
        textStream: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      } as any); // Simplified mock for this test focus
      vi.mocked(openai).mockReturnValue({} as any); // Ensure openai is mocked

      await askQuestionWithNewConfig(testQuestion);

      expect(openai).toHaveBeenCalledWith('gpt-4o');
      expect(streamText).toHaveBeenCalledOnce();
      const streamTextArgs = vi.mocked(streamText).mock.calls[0][0];
      expect(streamTextArgs.model).toEqual(openai('gpt-4o'));

      // Clean up the specific mock for config
      vi.doUnmock('@config');
    });

    it('should handle resources with quotes in attributes', async () => {
      const resourcesWithQuotes: Resource[] = [
        {
          id: 'res3',
          type: 'event',
          title: 'Event "Three"',
          summary: 'Summary with "quotes"',
          markdown: '```markdown\nDetails\n```',
        }, // Use title
      ] as any; // Use type assertion
      // Reset the mock for this specific test case
      const mockGetResources = vi.fn().mockResolvedValue(resourcesWithQuotes);
      // Ensure the mock implementation exists before resetting
      if (vi.isMockFunction(EventCatalogVectorStore.create)) {
        vi.mocked(EventCatalogVectorStore.create)
          .mockReset()
          .mockResolvedValue({
            getEventCatalogResources: mockGetResources,
          } as unknown as EventCatalogVectorStore);
      } else {
        // If it wasn't mocked before somehow, mock it now
        vi.mocked(EventCatalogVectorStore.create).mockResolvedValue({
          getEventCatalogResources: mockGetResources,
        } as unknown as EventCatalogVectorStore);
      }

      await askQuestion(testQuestion);

      expect(streamText).toHaveBeenCalledOnce();
      const streamTextArgs = vi.mocked(streamText).mock.calls[0][0];
      expect(streamTextArgs.messages).toBeDefined();
      expect(streamTextArgs.messages![0].content).toContain(
        '<resource id="res3" type="event" title="Event &quot;Three&quot;" summary="Summary with &quot;quotes&quot;" />'
      ); // Check title and escaped quotes
    });

    // Optional: Test the stream content if needed
    it('should return a stream from streamText', async () => {
      // Setup mocks for this test specifically if needed
      const mockGetResources = vi.fn().mockResolvedValue(mockResources);
      vi.mocked(EventCatalogVectorStore.create).mockResolvedValue({
        getEventCatalogResources: mockGetResources,
      } as unknown as EventCatalogVectorStore);
      // Ensure streamText is mocked correctly for reading
      const encoder = new TextEncoder();
      const mockResponse = 'Mocked AI response.';
      vi.mocked(streamText).mockResolvedValue({
        textStream: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(mockResponse));
            controller.close();
          },
        }),
      } as unknown as StreamTextResult<any, any>);

      const result = await askQuestion(testQuestion);
      expect(result.textStream).toBeInstanceOf(ReadableStream);

      // Read from the stream
      const reader = result.textStream.getReader();
      const { value, done } = await reader.read();

      expect(done).toBe(false); // First chunk should exist
      // Add explicit check for value to satisfy linter
      if (value) {
        const decoder = new TextDecoder();
        // Explicitly cast value to unknown then Uint8Array to satisfy the type checker
        expect(decoder.decode(value as unknown as Uint8Array)).toBe(mockResponse); // Check decoded value
      } else {
        // Should not happen if done is false, but handles the type possibility
        throw new Error('Stream returned done=false but no value');
      }

      const { done: doneAfter } = await reader.read();
      expect(doneAfter).toBe(true); // Stream should be closed now
    });
  });
});
