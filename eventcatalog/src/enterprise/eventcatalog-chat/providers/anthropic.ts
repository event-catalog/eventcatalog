import { anthropic } from '@ai-sdk/anthropic';
import { AIProvider, type AIProviderOptions } from './ai-provider';

const AVAILABLE_GOOGLE_MODELS = [
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-latest',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-latest',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
] as const;

export class AnthropicProvider extends AIProvider {
  public models: string[] = [...AVAILABLE_GOOGLE_MODELS];

  constructor(options: AIProviderOptions) {
    const languageModel = anthropic(options.modelId || 'claude-3-7-sonnet-20250219');

    super({
      ...options,
      model: languageModel,
    });
  }
}
