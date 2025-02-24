import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';
import { getEmbeddingsInstance } from './embed';
import resources from '../ai/eventcatalog/resources.json';
import embeddings from '../ai/eventcatalog/embeddings.json';

// Define the message types for worker communication
type WorkerMessage = {
  type: 'initialize' | 'search';
  payload: any;
};

type ResourceDocument = {
  id: string;
  name: string;
  version: string;
  summary: string;
  markdown: string;
  // ... other fields
};

type EmbeddingDocument = {
  id: string;
  embedding: number[];
};

let vectorStore: MemoryVectorStore | null = null;

// Handle messages sent to the worker
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  console.log('INIT THE VECTOR STORE', type);

  try {
    switch (type) {
      case 'initialize': {

        console.log('initializing vector store');
        
        // Create documents with pre-computed embeddings
        const documents = resources.map((resource: ResourceDocument) => {
          const embeddingDoc = embeddings.find((e: EmbeddingDocument) => e.id === resource.id);
          if (!embeddingDoc) {
            throw new Error(`No embedding found for document ${resource.id}`);
          }

          return new Document({
            pageContent: `${resource.name}\n${resource.summary}\n${resource.markdown}`,
            metadata: {
              id: resource.id,
              name: resource.name,
              version: resource.version
            },
            id: resource.id
          });
        });

        console.log('documents', documents);

        const embeddingsInstance = await getEmbeddingsInstance();

        // Initialize vector store with pre-computed embeddings
        vectorStore = await MemoryVectorStore.fromDocuments(
          documents,
          embeddingsInstance,
        );

        console.log('SAY WE INITIALIZED');

        self.postMessage({ type: 'initialized', success: true });
        break;
      }

      case 'search': {
        if (!vectorStore) {
          throw new Error('Vector store not initialized');
        }

        const { query, k = 5 } = payload;
        const results = await vectorStore.similaritySearch(query, k);
        
        self.postMessage({
          type: 'searchResults',
          results: results.map(doc => ({
            id: doc.metadata.id,
            name: doc.metadata.name,
            version: doc.metadata.version,
            content: doc.pageContent,
            score: doc.metadata.score
          }))
        });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
    });
  }
};

// Export empty object to satisfy TypeScript module requirements
// export {};
