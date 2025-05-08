import { streamText, type CoreMessage, type LanguageModel, type Message } from 'ai';

// base class for AI providers
export interface AIProviderOptions {
  modelId: string;
  model?: LanguageModel;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export class AIProvider {
  private model?: LanguageModel;
  private modelId: string;
  private temperature: number;
  private topP: number;
  private topK: number;
  private frequencyPenalty: number;
  private presencePenalty: number;
  public models: string[];

  constructor({ modelId, model, temperature, topP, topK, frequencyPenalty, presencePenalty }: AIProviderOptions) {
    this.modelId = modelId;
    this.temperature = temperature ?? 0.7;
    this.topP = topP ?? 1;
    this.topK = topK ?? 1;
    this.frequencyPenalty = frequencyPenalty ?? 0;
    this.presencePenalty = presencePenalty ?? 0;
    this.models = [];

    if (model) {
      this.model = model;
    }
  }

  async validateModel(model: string): Promise<{ isValidModel: boolean; listOfModels: string[] }> {
    const isValidModel = this.models.includes(model);
    return { isValidModel, listOfModels: this.models };
  }

  async streamText(messages: Array<CoreMessage> | Array<Omit<Message, 'id'>>) {
    if (!this.model) {
      throw new Error('Model not set');
    }

    return await streamText({
      model: this.model,
      messages: messages,
      temperature: this.temperature,
      topP: this.topP,
      topK: this.topK,
      frequencyPenalty: this.frequencyPenalty,
      presencePenalty: this.presencePenalty,
    });
  }
}
