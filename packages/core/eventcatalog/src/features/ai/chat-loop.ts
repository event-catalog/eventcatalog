import {
  createUIMessageStream,
  generateText,
  isStepCount,
  streamText,
  toUIMessageStream,
  type CallSettings,
  type LanguageModelUsage,
  type ModelMessage,
  type PrepareStepFunction,
  type StepResult,
  type ToolSet,
  type UIMessageChunk,
  type UIMessageStreamWriter,
} from 'ai';

// How many model calls one answer may take. Every call re-reads the whole conversation, so the assistant is told to look
// things up in parallel and stop as soon as it can answer; the last call has tools turned off so it has to answer.
export const MAX_STEPS = 10;
// Drawing a diagram on a Studio canvas takes more: finding the resources, adding them, connecting and tidying
export const MAX_CANVAS_STEPS = 20;

/** The message part with the questions to ask next: `{ questions }`, empty while they're being written */
export const FOLLOW_UPS_PART = 'data-follow-ups';

/** Sent with the last call, and the fallback: with no lookups left the model has to answer rather than stop with nothing */
export const WRAP_UP_MESSAGE: ModelMessage = {
  role: 'user',
  content:
    'You have no lookups left, so do not call any tools. Answer my question now with what you have found so far, and say what you could not find.',
};

// Shorter text written beside a tool call is what the model is about to do ("Let me check the catalog."), not an answer
const MIN_ANSWER_BESIDE_TOOLS = 200;

/**
 * The answer: what the last call wrote, or else a full answer written beside a tool call (e.g. drawing on a canvas, or
 * one of the catalog's own tools) that the calls after it didn't add to.
 */
const answerOf = (steps: StepResult<any>[]) =>
  steps.at(-1)?.text.trim() ||
  steps
    .map((step) => step.text.trim())
    .filter((text) => text.length >= MIN_ANSWER_BESIDE_TOOLS)
    .at(-1) ||
  '';

/** On the last step: no tools, and a message telling the model to answer with what it found */
export const prepareLastStep =
  (maxSteps: number): PrepareStepFunction<any> =>
  ({ stepNumber, messages }) =>
    stepNumber === maxSteps - 1 ? { toolChoice: 'none', messages: [...messages, WRAP_UP_MESSAGE] } : undefined;

/**
 * The settings in eventcatalog.chat.js's `configuration` that are sent to the model. Only those it sets are sent:
 * reasoning models (e.g. GPT-5, Claude Opus) don't take a temperature, and the provider's defaults suit the rest.
 */
export const callSettingsFrom = (configuration?: Record<string, any>): CallSettings => {
  const { temperature, topP, topK, frequencyPenalty, presencePenalty, maxOutputTokens, maxTokens } = configuration ?? {};
  const settings: CallSettings = {
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    // `maxTokens` is what the docs have always called it
    maxOutputTokens: maxOutputTokens ?? maxTokens,
  };
  return Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined));
};

type StreamTextOptions = Parameters<typeof streamText>[0];

export type ChatAnswerOptions = Omit<StreamTextOptions, 'prompt' | 'messages' | 'stopWhen' | 'prepareStep' | 'tools'> & {
  messages: ModelMessage[];
  tools: ToolSet;
  maxSteps: number;
  /** Suggest questions to ask next once it has answered (default true) */
  followUps?: boolean;
  /** Send how the answer was made (model calls, tokens) as the message's metadata, e.g. for the evals */
  includeStats?: boolean;
};

/** How an answer was made: sent as the message's metadata when asked for */
export type ChatAnswerStats = {
  /** The model that answered, e.g. anthropic.messages/claude-opus-5-5 */
  model: string;
  /** Model calls to answer, including the fallback (not the one suggesting follow-up questions) */
  steps: number;
  /** Whether the last call wrote nothing, so it asked once more without tools */
  fallback: boolean;
  /** Tokens for everything, follow-up questions included */
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
};

const addUsage = (stats: ChatAnswerStats['usage'], usage?: LanguageModelUsage) => ({
  inputTokens: stats.inputTokens + (usage?.inputTokens ?? 0),
  outputTokens: stats.outputTokens + (usage?.outputTokens ?? 0),
  reasoningTokens: stats.reasoningTokens + (usage?.outputTokenDetails?.reasoningTokens ?? 0),
  cacheReadTokens: stats.cacheReadTokens + (usage?.inputTokenDetails?.cacheReadTokens ?? 0),
  cacheWriteTokens: stats.cacheWriteTokens + (usage?.inputTokenDetails?.cacheWriteTokens ?? 0),
});

const NO_USAGE: ChatAnswerStats['usage'] = {
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/** Writes a UI message stream into another, chunk by chunk, so what's written after it always comes after it */
const pipe = async (stream: ReadableStream<UIMessageChunk>, writer: UIMessageStreamWriter) => {
  const reader = stream.getReader();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) writer.write(chunk.value);
};

const textOf = (message?: ModelMessage) => {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  return message.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
};

// Long answers are cut: the start says enough about what was answered
const MAX_ANSWER_CHARS_FOR_FOLLOW_UPS = 3000;

/**
 * Two or three questions to ask next, from the question and its answer alone: one small call, not one with the whole
 * conversation and every tool's output, and the model answering never has to remember to suggest them.
 */
async function suggestFollowUps(options: StreamTextOptions, question: string, answer: string) {
  const { text, usage } = await generateText({
    model: options.model,
    providerOptions: options.providerOptions,
    prompt: `Someone asked an assistant about their software architecture catalog (domains, systems, services, events, commands, queries, schemas and docs).

Their question:
${question}

The assistant's answer:
${answer.slice(0, MAX_ANSWER_CHARS_FOR_FOLLOW_UPS)}

Suggest 3 short follow-up questions they might ask next, about the resources in the answer. Reply with the questions only, one per line.`,
  });
  const questions = text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.endsWith('?'))
    .slice(0, 3);
  return { questions, usage };
}

/**
 * Streams the assistant's answer as a UI message stream: up to `maxSteps` model calls with tools, the last one without.
 * If none of them answered (some models return nothing when tools are turned off), it asks once more, with tools it
 * can't call, so the user always gets a reply. Then it suggests questions to ask next.
 */
export const streamChatAnswer = ({ maxSteps, tools, followUps = true, includeStats = false, ...options }: ChatAnswerOptions) =>
  createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        ...options,
        tools,
        stopWhen: isStepCount(maxSteps),
        prepareStep: prepareLastStep(maxSteps),
      } as StreamTextOptions);

      await pipe(toUIMessageStream({ stream: result.stream, tools, sendFinish: false }), writer);

      // When the request failed, the error is already in the stream
      const steps = await Promise.resolve(result.steps).catch(() => undefined);
      if (!steps) {
        writer.write({ type: 'finish' });
        return;
      }

      let answer = answerOf(steps);
      const stats: ChatAnswerStats = {
        model: typeof options.model === 'string' ? options.model : `${options.model.provider}/${options.model.modelId}`,
        steps: steps.length,
        fallback: false,
        usage: addUsage(NO_USAGE, await Promise.resolve(result.totalUsage).catch(() => undefined)),
      };

      const { onChunk, onEnd, ...plainOptions } = options as StreamTextOptions;

      if (!answer) {
        const fallback = streamText({
          ...plainOptions,
          // Tools are sent but can't be called: some providers refuse tool calls in the history without them
          tools,
          toolChoice: 'none',
          messages: [...options.messages, ...(await result.responseMessages), WRAP_UP_MESSAGE],
        } as StreamTextOptions);
        await pipe(toUIMessageStream({ stream: fallback.stream, sendStart: false, sendFinish: false }), writer);
        answer = (await Promise.resolve(fallback.text).catch(() => '')).trim();
        stats.steps += 1;
        stats.fallback = true;
        stats.usage = addUsage(stats.usage, await Promise.resolve(fallback.totalUsage).catch(() => undefined));
      }

      if (followUps && answer) {
        writer.write({ type: FOLLOW_UPS_PART, id: 'follow-ups', data: {} });
        const suggested = await suggestFollowUps(
          plainOptions,
          textOf(options.messages.findLast((m) => m.role === 'user')),
          answer
        ).catch((error) => {
          console.error('[Chat] Could not suggest follow-up questions', error);
          return undefined;
        });
        writer.write({ type: FOLLOW_UPS_PART, id: 'follow-ups', data: { questions: suggested?.questions ?? [] } });
        stats.usage = addUsage(stats.usage, suggested?.usage);
      }

      writer.write({ type: 'finish', ...(includeStats && { messageMetadata: stats }) });
    },
  });
