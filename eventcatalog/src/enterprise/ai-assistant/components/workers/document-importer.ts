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
      const documentsImport = await fetch(`/ai/documents.json`);
      const embeddingsImport = await fetch(`/ai/embeddings.json`);

      documents = await documentsImport.json();
      embeddings = await embeddingsImport.json();

      await vectorStore.addVectors(embeddings, documents);
    }

    if (!event?.data?.input) {
      return;
    }

    // Get the results
    const results = await vectorStore.similaritySearchWithScore(event.data.input, event?.data?.similarityResults || 10);
    // Filter out results that don't have a score less than 0.5
    const filteredResults = results.filter((result) => result[1] > 0.1);
    postMessage({ results: filteredResults, action: 'search-results' });
  } catch (error) {
    console.log(error);
    self.postMessage({ error: (error as Error).message });
  }
};
