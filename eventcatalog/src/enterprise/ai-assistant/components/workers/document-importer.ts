import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

const embeddingsInstance = new HuggingFaceTransformersEmbeddings({ model: 'Xenova/all-MiniLM-L6-v2' });

// Create the vector store
const vectorStore = new MemoryVectorStore(embeddingsInstance);

let documents: any;
let embeddings: any;

self.onmessage = async (event) => {
  try {
    // Initialize the vector store
    if (event?.data?.init && !documents && !embeddings) {
      const documentsImport = await import(/* @vite-ignore */ `${event.data.catalogPath}/generated-ai/documents.json`);
      const embeddingsImport = await import(/* @vite-ignore */ `${event.data.catalogPath}/generated-ai/embeddings.json`);
      documents = documentsImport.default;
      embeddings = embeddingsImport.default;
      await vectorStore.addVectors(embeddings, documents);
    }

    if (!event?.data?.input) {
      return;
    }

    // Get the results
    const results = await vectorStore.similaritySearchWithScore(event.data.input, 10);
    postMessage({ results: results, action: 'search-results' });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
