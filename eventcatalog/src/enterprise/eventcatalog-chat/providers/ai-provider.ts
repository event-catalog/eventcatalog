import { streamText, type CoreMessage, type LanguageModel, type Message } from 'ai';

// base class for AI providers
export interface AIProviderOptions {
  modelId: string;
  model?: LanguageModel;
  temperature?: number;
  topP?: number | undefined;
  topK?: number | undefined;
  frequencyPenalty?: number | undefined;
  presencePenalty?: number | undefined;
}

export class AIProvider {
  private model?: LanguageModel;
  private modelId: string;
  private temperature: number;
  private topP: number | undefined;
  private topK: number | undefined;
  private frequencyPenalty: number | undefined;
  private presencePenalty: number | undefined;
  public models: string[];

  constructor({ modelId, model, temperature, topP, topK, frequencyPenalty, presencePenalty }: AIProviderOptions) {
    this.modelId = modelId;
    this.temperature = temperature ?? 0.2;
    this.topP = topP;
    this.topK = topK;
    this.frequencyPenalty = frequencyPenalty;
    this.presencePenalty = presencePenalty;
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
      ...(this.topP && { topP: this.topP }),
      ...(this.topK && { topK: this.topK }),
      ...(this.frequencyPenalty && { frequencyPenalty: this.frequencyPenalty }),
      ...(this.presencePenalty && { presencePenalty: this.presencePenalty }),
    });
  }
}
