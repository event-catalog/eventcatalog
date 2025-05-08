import { OpenAIProvider } from './openai';
import { GoogleProvider } from './google';
import { AnthropicProvider } from './anthropic';
import type { AIProviderOptions } from './ai-provider';

export function getProvider(provider: string, options: AIProviderOptions) {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider({
        ...options,
        modelId: options.modelId,
      });
    case 'google':
      return new GoogleProvider({
        ...options,
        modelId: options.modelId,
      });
    case 'anthropic':
      return new AnthropicProvider({
        ...options,
        modelId: options.modelId,
      });
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
