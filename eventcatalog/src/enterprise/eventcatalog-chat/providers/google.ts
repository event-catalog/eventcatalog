import { google } from '@ai-sdk/google';
import { AIProvider, type AIProviderOptions } from './ai-provider';

const AVAILABLE_GOOGLE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-8b-latest',
  'gemini-1.5-flash-8b-001',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-live-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.0-flash-thinking-exp-01-21',
  'gemini-2.0-flash-exp',
  'gemini-2.5-pro-exp-03-25',
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash-preview-04-17',
  'gemini-exp-1206',
  'gemma-3-27b-it',
  'learnlm-1.5-pro-experimental',
] as const;

export class GoogleProvider extends AIProvider {
  public models: string[] = [...AVAILABLE_GOOGLE_MODELS];

  constructor(options: AIProviderOptions) {
    const languageModel = google(options.modelId || 'gemini-1.5-flash');
    super({
      ...options,
      model: languageModel,
    });
  }
}
