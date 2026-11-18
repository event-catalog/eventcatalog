import { describe, expect, it } from 'vitest';
import { simulateReadableStream, tool, type UIMessageChunk } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';
import { FOLLOW_UPS_PART, WRAP_UP_MESSAGE, callSettingsFrom, streamChatAnswer } from '../chat-loop';

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

type StreamPart = Record<string, unknown> & { type: string };

/** One model call's response */
const step = (...parts: StreamPart[]) => ({
  stream: simulateReadableStream({
    chunks: [
      { type: 'stream-start', warnings: [] },
      ...parts,
      {
        type: 'finish',
        usage,
        finishReason: { unified: parts.some((part) => part.type === 'tool-call') ? 'tool-calls' : 'stop', raw: undefined },
      },
    ] as any[],
  }),
});

/** The response to the call suggesting follow-up questions */
const generated = (value: string) => ({
  content: [{ type: 'text' as const, text: value }],
  finishReason: { unified: 'stop' as const, raw: undefined },
  usage,
  warnings: [],
});

let callId = 0;
const toolCall = (toolName: string, input: object = {}): StreamPart => ({
  type: 'tool-call',
  toolCallId: `call-${++callId}`,
  toolName,
  input: JSON.stringify(input),
});
const text = (value: string): StreamPart[] => [
  { type: 'text-start', id: 'text' },
  { type: 'text-delta', id: 'text', delta: value },
  { type: 'text-end', id: 'text' },
];

const tools = {
  lookup: tool({ inputSchema: z.object({}), execute: async () => ({ found: 'something' }) }),
};

const QUESTION = 'Which messages does the orders system send?';

const answer = async (model: MockLanguageModelV4, { followUps = false, includeStats = false } = {}) => {
  const chunks: UIMessageChunk[] = [];
  const reader = streamChatAnswer({
    model,
    instructions: 'You answer questions about a catalog.',
    messages: [{ role: 'user', content: QUESTION }],
    tools,
    maxSteps: 3,
    followUps,
    includeStats,
  }).getReader();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) chunks.push(chunk.value);
  return {
    chunks,
    text: chunks.map((chunk) => (chunk.type === 'text-delta' ? chunk.delta : '')).join(''),
    count: (type: UIMessageChunk['type']) => chunks.filter((chunk) => chunk.type === type).length,
    followUps: chunks.filter((chunk) => chunk.type === FOLLOW_UPS_PART).map((chunk) => (chunk as { data: unknown }).data),
    finish: chunks.find((chunk) => chunk.type === 'finish'),
  };
};

const promptText = (call: MockLanguageModelV4['doStreamCalls'][number]) =>
  call.prompt
    .map((message) =>
      Array.isArray(message.content) ? message.content.map((part: any) => part.text ?? '').join('') : String(message.content)
    )
    .join('\n');

const lastMessageText = (call: MockLanguageModelV4['doStreamCalls'][number]) => {
  const message = call.prompt.at(-1)!;
  return Array.isArray(message.content) ? message.content.map((part: any) => part.text ?? '').join('') : String(message.content);
};

describe('streamChatAnswer', () => {
  it('answers on the last step, with tools off and told to answer, when the model keeps looking things up', async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(toolCall('lookup')), step(toolCall('lookup')), step(...text('Here is what I found.'))],
    });

    const result = await answer(model);

    expect(model.doStreamCalls).toHaveLength(3);
    expect(model.doStreamCalls[2].toolChoice).toEqual({ type: 'none' });
    expect(lastMessageText(model.doStreamCalls[2])).toBe(WRAP_UP_MESSAGE.content);
    expect(result.text).toBe('Here is what I found.');
    expect(result.count('start')).toBe(1);
    expect(result.count('finish')).toBe(1);
  });

  it('asks once more, with tools it cannot call, when no step wrote an answer', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        step(toolCall('lookup')),
        step(toolCall('lookup')),
        step(),
        step(...text('The orders system sends OrderCreated.')),
      ],
    });

    const result = await answer(model);

    expect(model.doStreamCalls).toHaveLength(4);
    // Tools are sent (some providers refuse tool calls in the history without them), but can't be called
    expect(model.doStreamCalls[3].tools?.map((tool: any) => tool.name)).toEqual(['lookup']);
    expect(model.doStreamCalls[3].toolChoice).toEqual({ type: 'none' });
    expect(lastMessageText(model.doStreamCalls[3])).toBe(WRAP_UP_MESSAGE.content);
    expect(result.text).toBe('The orders system sends OrderCreated.');
    // Still one message to the user
    expect(result.count('start')).toBe(1);
    expect(result.count('finish')).toBe(1);
  });

  it('asks once more when only an earlier step wrote something, e.g. what it was about to look up', async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(...text('Let me check the catalog.'), toolCall('lookup')), step(), step(...text('It sends OrderCreated.'))],
    });

    const result = await answer(model);

    expect(model.doStreamCalls).toHaveLength(3);
    expect(result.text).toBe('Let me check the catalog.It sends OrderCreated.');
  });

  it('does not answer twice when the answer was written beside a tool call and the next step adds nothing', async () => {
    const fullAnswer = `The orders system sends OrderCreated, OrderConfirmed and OrderCancelled. ${'It is owned by the ordering team. '.repeat(6)}`;
    const model = new MockLanguageModelV4({
      doStream: [step(...text(fullAnswer), toolCall('lookup')), step()],
    });

    const result = await answer(model);

    expect(model.doStreamCalls).toHaveLength(2);
    expect(result.text).toBe(fullAnswer);
  });

  it('suggests follow-up questions once it has answered, from one small call with only the question and answer', async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(...text('It sends OrderCreated.'))],
      doGenerate: generated('1. Who consumes OrderCreated?\n- What is its schema?\nHere you go'),
    });

    const result = await answer(model, { followUps: true });

    // While they're written, then written
    expect(result.followUps).toEqual([{}, { questions: ['Who consumes OrderCreated?', 'What is its schema?'] }]);
    const call = model.doGenerateCalls[0];
    expect(call.tools ?? []).toEqual([]);
    expect(promptText(call)).toContain(QUESTION);
    expect(promptText(call)).toContain('It sends OrderCreated.');
    expect(promptText(call)).not.toContain('You answer questions about a catalog.');
  });

  it('still finishes the answer when suggesting follow-up questions fails', async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(...text('It sends OrderCreated.'))],
      doGenerate: async () => {
        throw new Error('The provider is down');
      },
    });

    const result = await answer(model, { followUps: true });

    expect(result.followUps.at(-1)).toEqual({ questions: [] });
    expect(result.count('finish')).toBe(1);
  });

  it('sends how the answer was made, including the fallback and follow-up questions, when asked for', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        step(toolCall('lookup')),
        step(toolCall('lookup')),
        step(),
        step(...text('The orders system sends OrderCreated.')),
      ],
      doGenerate: generated('Who consumes OrderCreated?'),
    });

    const result = await answer(model, { followUps: true, includeStats: true });

    expect(result.finish).toMatchObject({
      messageMetadata: {
        steps: 4,
        fallback: true,
        usage: { inputTokens: 50, outputTokens: 25, cacheReadTokens: 0 },
      },
    });
  });

  it('sends no stats unless asked for', async () => {
    const model = new MockLanguageModelV4({ doStream: [step(...text('It sends OrderCreated.'))] });

    const result = await answer(model);

    expect(result.finish).not.toHaveProperty('messageMetadata');
  });
});

describe('callSettingsFrom', () => {
  it("sends only the settings eventcatalog.chat.js's configuration sets", () => {
    expect(callSettingsFrom({ temperature: 0.2, topP: 0.9 })).toEqual({ temperature: 0.2, topP: 0.9 });
    // Reasoning models don't take a temperature: none is sent unless one is set
    expect(callSettingsFrom({ providerOptions: { anthropic: { effort: 'low' } } })).toEqual({});
    expect(callSettingsFrom(undefined)).toEqual({});
  });

  it('sends maxTokens, as the docs call it, as maxOutputTokens', () => {
    expect(callSettingsFrom({ maxTokens: 4000 })).toEqual({ maxOutputTokens: 4000 });
    expect(callSettingsFrom({ maxOutputTokens: 2000, maxTokens: 4000 })).toEqual({ maxOutputTokens: 2000 });
  });
});
