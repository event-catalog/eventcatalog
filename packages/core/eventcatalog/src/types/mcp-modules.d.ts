/**
 * Type declarations for MCP server dependencies
 * These are used by the enterprise MCP server feature
 */

declare module 'hono' {
  export interface Context {
    req: {
      raw: Request;
    };
    json: (data: unknown, status?: number) => Response;
  }

  export class Hono {
    constructor();
    basePath(path: string): Hono;
    get(path: string, handler: (c: Context) => Response | Promise<Response>): void;
    post(path: string, handler: (c: Context) => Response | Promise<Response>): void;
    fetch(request: Request): Promise<Response>;
  }
}

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  import { z } from 'zod';

  export interface ToolConfig {
    description: string;
    inputSchema: z.ZodType<any>;
  }

  export interface ToolResult {
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }

  export interface ResourceConfig {
    description: string;
    mimeType: string;
  }

  export interface ResourceResult {
    contents: Array<{
      uri: string;
      text: string;
      mimeType: string;
    }>;
  }

  export class McpServer {
    constructor(config: { name: string; version: string });
    registerTool(name: string, config: ToolConfig, handler: (params: any) => Promise<ToolResult>): void;
    registerResource(name: string, uri: string, config: ResourceConfig, handler: (uri: URL) => Promise<ResourceResult>): void;
    connect(transport: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js' {
  export interface WebStandardStreamableHTTPServerTransportConfig {
    sessionIdGenerator: undefined;
  }

  export class WebStandardStreamableHTTPServerTransport {
    constructor(config: WebStandardStreamableHTTPServerTransportConfig);
    handleRequest(request: Request): Promise<Response>;
  }
}
