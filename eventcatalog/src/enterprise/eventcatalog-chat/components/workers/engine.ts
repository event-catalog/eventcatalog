import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Hookup an Engine to a worker handler
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
