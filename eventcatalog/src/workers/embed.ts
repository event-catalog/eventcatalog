import { pipeline } from "@huggingface/transformers";
import { Embeddings } from "@langchain/core/embeddings";
import type { EmbeddingsParams } from "@langchain/core/embeddings";

export interface XenovaTransformersEmbeddingsParams extends EmbeddingsParams {
  model?: string;
}

export class XenovaTransformersEmbeddings
  extends Embeddings
  implements XenovaTransformersEmbeddingsParams {
  model: string;
  client: any;

  constructor(fields?: XenovaTransformersEmbeddingsParams) {
    super(fields ?? {});
    this.model = fields?.model ?? "Xenova/all-MiniLM-L6-v2";
  }

  async _embed(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      this.client = await pipeline("embeddings", this.model);
    }

    return this.caller.call(async () => {
      return await Promise.all(
        texts.map(
          async (t) =>
            (
              await this.client(t, {
                pooling: "mean",
                normalize: true,
              })
            ).data
        )
      );
    });
  }

  embedQuery(document: string): Promise<number[]> {
    return this._embed([document]).then((embeddings) => embeddings[0]);
  }

  embedDocuments(documents: string[]): Promise<number[][]> {
    return this._embed(documents);
  }
}

let embeddingsInstance: XenovaTransformersEmbeddings | null = null;

export async function getEmbeddingsInstance(): Promise<XenovaTransformersEmbeddings> {
  if (!embeddingsInstance) {
    embeddingsInstance = new XenovaTransformersEmbeddings();
    await embeddingsInstance._embed(["initialization"]); // Initialize the client
  }
  return embeddingsInstance;
}
