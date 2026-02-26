import yaml from "js-yaml";
import type {
  SpecMessage,
  SpecOperation,
  SpecService,
  ResolveError,
} from "./types.js";
import {
  ecBlock,
  escapeEc,
  sanitizeServiceName,
  serviceToEc,
} from "./asyncapi.js";

export interface ParsedOpenApiSpec {
  messages: Map<string, SpecMessage & { messageType: "command" | "query" }>;
  info?: { title?: string; version?: string; description?: string };
  errors: ResolveError[];
}

/**
 * Derive a PascalCase operation name from an HTTP method and path.
 * e.g. GET /orders/{id}/items -> GetOrdersIdItems
 */
export function operationNameFromPath(method: string, path: string): string {
  const parts = path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      // Strip braces from path params
      const clean = segment.replace(/[{}]/g, "");
      // PascalCase each segment
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    });

  const methodPart =
    method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  return methodPart + parts.join("");
}

/**
 * Parse an OpenAPI v3.0 or v3.1 document and extract operations as messages.
 */
export function parseOpenApiSpec(content: string): ParsedOpenApiSpec {
  let doc: any;
  try {
    // Try JSON first for .json files
    try {
      doc = JSON.parse(content);
    } catch {
      doc = yaml.load(content);
    }
  } catch (e) {
    return {
      messages: new Map(),
      errors: [
        {
          message: `Failed to parse OpenAPI spec: ${String(e)}`,
          line: 1,
          column: 1,
        },
      ],
    };
  }

  if (!doc || typeof doc !== "object") {
    return {
      messages: new Map(),
      errors: [
        { message: "OpenAPI file is empty or invalid", line: 1, column: 1 },
      ],
    };
  }

  const openApiVersion = String(doc.openapi || "");
  if (!openApiVersion.startsWith("3.0") && !openApiVersion.startsWith("3.1")) {
    return {
      messages: new Map(),
      errors: [
        {
          message: `Unsupported OpenAPI version: "${openApiVersion}". Only 3.0.x and 3.1.x are supported.`,
          line: 1,
          column: 1,
        },
      ],
    };
  }

  const messages = new Map<
    string,
    SpecMessage & { messageType: "command" | "query" }
  >();

  const paths = doc.paths || {};
  const specVersion = doc.info?.version;

  for (const [path, pathItem] of Object.entries<any>(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const op = pathItem[method];
      if (!op) continue;

      const name = op.operationId || operationNameFromPath(method, path);
      const overrideType = op["x-eventcatalog-message-type"];
      const messageType: "command" | "query" =
        overrideType === "command" || overrideType === "query"
          ? overrideType
          : method === "get"
            ? "query"
            : "command";

      // Extract response status codes
      const statusCodes: number[] = op.responses
        ? Object.keys(op.responses)
            .map(Number)
            .filter((c) => !isNaN(c))
        : [];

      messages.set(name, {
        name,
        summary: op.summary,
        description: op.description,
        version: specVersion,
        messageType,
        method: method.toUpperCase(),
        path,
        ...(statusCodes.length > 0 ? { statusCodes } : {}),
      });
    }
  }

  const info = doc.info
    ? {
        title: doc.info.title,
        version: doc.info.version,
        description: doc.info.description,
      }
    : undefined;

  return { messages, info, errors: [] };
}

/**
 * Extract a full service definition from an OpenAPI spec.
 * All operations are "receives" (the service receives HTTP requests).
 * No channels are generated for OpenAPI specs.
 */
export function extractOpenApiService(
  content: string,
  serviceName?: string,
): { service: SpecService; errors: ResolveError[] } {
  const emptyService = (name: string): SpecService => ({
    name,
    operations: [],
    channels: [],
    messages: [],
  });

  const parsed = parseOpenApiSpec(content);
  if (parsed.errors.length > 0) {
    return {
      service: emptyService(serviceName || "UnknownService"),
      errors: parsed.errors,
    };
  }

  const name =
    serviceName || sanitizeServiceName(parsed.info?.title) || "UnknownService";
  const version = parsed.info?.version;
  const summary = parsed.info?.description?.trim().split("\n")[0];

  const operations: SpecOperation[] = [];
  const messages: SpecMessage[] = [];

  for (const msg of parsed.messages.values()) {
    operations.push({
      action: "receive",
      channelName: "",
      messageName: msg.name,
      messageType: msg.messageType,
      summary: msg.summary,
    });
    messages.push({
      name: msg.name,
      summary: msg.summary,
      description: msg.description,
      version: msg.version,
      method: msg.method,
      path: msg.path,
      statusCodes: msg.statusCodes,
    });
  }

  return {
    service: { name, version, summary, operations, channels: [], messages },
    errors: [],
  };
}

/**
 * Convert an OpenAPI SpecService to a full .ec definition string.
 * Generates standalone command/query definitions with summaries,
 * followed by the service block with receives statements.
 */
export function openApiServiceToEc(service: SpecService): string {
  const parts: string[] = [];

  // Build a map of messageName -> messageType from operations
  const messageTypeMap = new Map<string, "command" | "query">();
  for (const op of service.operations) {
    if (op.messageType === "command" || op.messageType === "query") {
      messageTypeMap.set(op.messageName, op.messageType);
    }
  }

  // Generate standalone message definitions with summaries
  for (const msg of service.messages) {
    const msgType = messageTypeMap.get(msg.name) || "command";
    parts.push(
      ecBlock(msgType, msg.name, [
        msg.version && `version ${msg.version}`,
        msg.summary && `summary "${escapeEc(msg.summary)}"`,
        apiAnnotation(msg),
      ]),
    );
  }

  // Generate the service block
  parts.push(serviceToEc(service));

  return parts.join("\n\n");
}

/**
 * Build an @api annotation string from method, path, and statusCodes.
 */
function apiAnnotation(msg: SpecMessage): string | false {
  if (!msg.method && !msg.path) return false;
  const args: string[] = [];
  if (msg.method) args.push(`method: "${msg.method}"`);
  if (msg.path) args.push(`path: "${escapeEc(msg.path)}"`);
  if (msg.statusCodes && msg.statusCodes.length > 0) {
    args.push(`statusCodes: "${msg.statusCodes.join(",")}"`);
  }
  return `@api(${args.join(", ")})`;
}

/**
 * Convert an OpenAPI message to an .ec definition string.
 * Uses the message's messageType to determine whether it's a command or query.
 */
export function openApiMessageToEc(
  msg: SpecMessage & { messageType: "command" | "query" },
): string {
  return ecBlock(msg.messageType, msg.name, [
    msg.version && `version ${msg.version}`,
    msg.summary && `summary "${escapeEc(msg.summary)}"`,
    apiAnnotation(msg),
  ]);
}
