import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document as LangChainDocument } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';

import { getConfigurationForGivenGenerator } from '@utils/generators';

const aiGeneratorConfiguration = getConfigurationForGivenGenerator('@eventcatalog/generator-ai');
const embedding = aiGeneratorConfiguration?.embedding || {};

export interface Resource {
  id: string;
  type: string;
  url: string;
  title?: string;
}

export class EventCatalogVectorStore {
  private vectorStore: MemoryVectorStore;

  // Make the constructor private so it can only be called from within the class
  private constructor(vectorStore: MemoryVectorStore) {
    this.vectorStore = vectorStore;
  }

  // Static async factory method
  public static async create(documents: LangChainDocument[], embeddings: number[][]): Promise<EventCatalogVectorStore> {
    let embeddingsInstance: any;

    if (embedding.provider === 'openai') {
      const model = embedding.model || 'text-embedding-3-large';
      embeddingsInstance = new OpenAIEmbeddings({ model });
    } else {
      const model = embedding.model || 'all-MiniLM-L6-v2';
      embeddingsInstance = new HuggingFaceTransformersEmbeddings({ model });
    }

    const vectorStore = new MemoryVectorStore(embeddingsInstance);
    await vectorStore.addVectors(embeddings, documents);
    return new EventCatalogVectorStore(vectorStore);
  }

  async search(query: string) {
    return this.vectorStore.similaritySearch(query, 10);
  }

  async getEventCatalogResources(query: string): Promise<Resource[]> {
    const results = await this.vectorStore.similaritySearchWithScore(query, 50);
    return Array.from(
      new Map(
        results.map((result: any) => {
          const metadata = result[0].metadata;
          const resource: Resource = {
            id: metadata.id,
            type: metadata.type,
            url: `/docs/${metadata.type}s/${metadata.id}`,
            title: metadata.title || metadata.id,
          };
          return [metadata.id, resource]; // Use ID as key for Map
        })
      ).values()
    );
  }
}
