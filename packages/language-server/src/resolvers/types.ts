export type ResourceType = "events" | "commands" | "queries" | "channels";

export interface SpecMessage {
  name: string;
  summary?: string;
  description?: string;
  version?: string;
}

export interface SpecChannel {
  name: string;
  address?: string;
  protocol?: string;
  summary?: string;
  version?: string;
}

export interface SpecOperation {
  action: "send" | "receive";
  channelName: string;
  messageName: string;
  summary?: string;
}

export interface SpecService {
  name: string;
  version?: string;
  summary?: string;
  operations: SpecOperation[];
  channels: SpecChannel[];
  messages: SpecMessage[];
}

export interface ResolveError {
  message: string;
  line: number;
  column: number;
}

export interface SpecResolveResult {
  files: Record<string, string>;
  errors: ResolveError[];
}

/**
 * A fetch function that takes a URL and returns the response text.
 * Allows callers to provide their own fetch implementation (browser fetch, node-fetch, etc.)
 */
export type FetchFn = (url: string) => Promise<string>;
