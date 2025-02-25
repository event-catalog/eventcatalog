import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// TypeScript declaration for self in Web Worker context
// @ts-ignore
declare const self: DedicatedWorkerGlobalScope;

// Hookup an Engine to a worker handler
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
