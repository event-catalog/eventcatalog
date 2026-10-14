/**
 * The architecture model agents send us: EventCatalog's vocabulary (domains, systems, services, messages,
 * channels, containers) and how they relate. Shared by the MCP server and the view, so no server-only imports.
 */
import { z } from "zod";

export const RESOURCE_TYPES = [
  "domain",
  "system",
  "service",
  "event",
  "command",
  "query",
  "channel",
  "container",
  // Around the architecture, as Studio draws them: people, third parties, AI agents and user interfaces
  "actor",
  "external-system",
  "agent",
  "view",
  // The domain model (an entity, e.g. Order, with its properties) and who owns what (a team)
  "entity",
  "team",
] as const;
export const ResourceType = z.enum(RESOURCE_TYPES);
export type ResourceType = z.infer<typeof ResourceType>;

export const MESSAGE_TYPES = new Set<ResourceType>([
  "event",
  "command",
  "query",
]);

export const SCHEMA_FORMATS = [
  "json-schema",
  "avro",
  "protobuf",
  "json",
  "yaml",
  "xml",
  "graphql",
  "other",
] as const;
const SCHEMA_FORMAT = z.enum(SCHEMA_FORMATS);

/** A field of an entity (as EventCatalog's entities have them), e.g. { name: "orderId", type: "string" } */
export const EntityProperty = z.object({
  name: z.string().min(1).max(100),
  type: z
    .string()
    .min(1)
    .max(100)
    .describe(
      'e.g. "string", "number", "Customer" (another entity), "OrderLine[]"',
    ),
  required: z.boolean().optional(),
  description: z.string().max(300).optional(),
});
export type EntityProperty = z.infer<typeof EntityProperty>;

/** The kinds of data store (EventCatalog's container_type), e.g. a Redis cache is "cache" */
export const CONTAINER_TYPES = [
  "database",
  "cache",
  "objectStore",
  "searchIndex",
  "dataWarehouse",
  "dataLake",
  "externalSaaS",
  "other",
] as const;
export type ContainerType = (typeof CONTAINER_TYPES)[number];

export const Resource = z.object({
  id: z
    .string()
    .min(1)
    .max(120)
    .describe('Stable, unique id, e.g. "OrderPlaced" or "orders-service"'),
  type: ResourceType,
  name: z.string().min(1).max(200),
  summary: z
    .string()
    .max(1000)
    .optional()
    .describe(
      "One or two sentences on what it is or does. Give every resource one when you can: it is shown on its node and its page",
    ),
  parent: z
    .string()
    .optional()
    .describe(
      "Id of what contains it: a service, agent, view or entity sits in a system or domain, a system in a domain, a domain in a domain (subdomain). Messages, channels, containers, actors and external systems usually have no parent",
    ),
  version: z.string().optional().describe("Defaults to 0.0.1"),
  owners: z
    .array(z.string())
    .max(20)
    .optional()
    .describe("Teams or people that own it"),
  technology: z
    .string()
    .max(100)
    .optional()
    .describe('For containers and channels, e.g. "PostgreSQL", "Kafka", "SQS"'),
  containerType: z
    .enum(CONTAINER_TYPES)
    .optional()
    .describe(
      "For containers: what kind of data store it is (EventCatalog's container_type). Defaults to database",
    ),
  evidence: z
    .string()
    .max(500)
    .optional()
    .describe(
      'Where this was found, e.g. "src/orders/publisher.ts:42" or "specs/orders.asyncapi.yaml"',
    ),
  properties: z
    .array(EntityProperty)
    .max(50)
    .optional()
    .describe("For entities: their fields, e.g. id, status, total"),
  card: z
    .boolean()
    .optional()
    .describe(
      "For domains and systems: drawn as a card connected to what it holds, rather than a box around it (set in the view)",
    ),
  // Only web links: it's opened when "View the code" is pressed, so a javascript: or data: link would run there
  url: z
    .url({ protocol: /^https?$/ })
    .max(1000)
    .optional()
    .describe(
      'Link to the code or spec it was found in, e.g. a GitHub permalink (shown as "View the code")',
    ),
  schema: z
    .object({
      format: SCHEMA_FORMAT,
      content: z
        .string()
        .min(1)
        .max(20000)
        .describe("The schema, copied as it is from the spec or code"),
      path: z
        .string()
        .max(300)
        .optional()
        .describe('Where the schema lives, e.g. "schemas/OrderPlaced.avsc"'),
    })
    .optional()
    .describe(
      "For events, commands and queries: the message's schema (JSON Schema, Avro, Protobuf...), shown on its page",
    ),
});
export type Resource = z.infer<typeof Resource>;

export const RELATION_KINDS = [
  "sends",
  "receives",
  "routes-through",
  "reads",
  "writes",
  "connects",
] as const;
export const RelationKind = z.enum(RELATION_KINDS);
export type RelationKind = z.infer<typeof RelationKind>;

export const Relation = z.object({
  from: z.string().describe("Id of the resource the relation starts at"),
  to: z.string().describe("Id of the resource it points to"),
  kind: RelationKind.describe(
    "sends / receives: service (or agent, view, actor, external system) -> message. routes-through: message -> channel. reads / writes: service -> container. connects: anything else (e.g. an actor using a view, a service calling an external system), described by its label",
  ),
  label: z
    .string()
    .max(80)
    .optional()
    .describe(
      'What it says on the diagram. For connects, what it means (e.g. "uses", "calls", "notifies"); for the others, leave it out for EventCatalog\'s wording (e.g. "publishes event") or set it to say more (e.g. "every 5 minutes")',
    ),
  fromField: z
    .string()
    .max(100)
    .optional()
    .describe(
      'For a connection from an entity: the property it starts at (e.g. "customerId")',
    ),
  toField: z
    .string()
    .max(100)
    .optional()
    .describe(
      'For a connection to an entity: the property it points to (e.g. "id")',
    ),
  inferred: z
    .boolean()
    .optional()
    .describe(
      "true when guessed rather than seen directly in code or specs (drawn dashed)",
    ),
  evidence: z.string().max(500).optional(),
});
export type Relation = z.infer<typeof Relation>;

export const NOTE_COLOR_NAMES = [
  "yellow",
  "blue",
  "green",
  "pink",
  "purple",
  "gray",
] as const;

export const LEVELS = ["overview", "services", "messages"] as const;
export type Level = (typeof LEVELS)[number];

export const Note = z.object({
  text: z.string().max(1000),
  resource: z
    .string()
    .optional()
    .describe(
      "Id of the resource the note is about; none for a note on the whole diagram",
    ),
  author: z.string().max(100).optional(),
  // Where it sits on the canvas (set by the view when people move it), its colour and width
  x: z.number().optional(),
  y: z.number().optional(),
  color: z.enum(NOTE_COLOR_NAMES).optional(),
  width: z.number().min(120).max(800).optional(),
  // Written as a sticky note, or as plain text on the canvas, and when (shown on the note)
  kind: z.enum(["sticky", "text"]).optional(),
  fontSize: z
    .number()
    .min(8)
    .max(200)
    .optional()
    .describe("For text: its size, as it was scaled on the canvas"),
  angle: z
    .number()
    .min(-360)
    .max(360)
    .optional()
    .describe("For text: how far it is turned, in degrees (clockwise)"),
  createdAt: z
    .number()
    .optional()
    .describe("When it was written (milliseconds since 1970), shown on it"),
  // As notes in EventCatalog are: on the level of detail it was written at (every level when not set)
  level: z
    .enum(LEVELS)
    .optional()
    .describe(
      "The level it shows at (overview, services or messages); every level when not set",
    ),
});
export type Note = z.infer<typeof Note>;

/** Where a resource is on a level: its top-left corner (relative to its container on the canvas) and a container's size */
const Place = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
});
export const Layout = z.object({
  overview: z.record(z.string(), Place).optional(),
  services: z.record(z.string(), Place).optional(),
  messages: z.record(z.string(), Place).optional(),
});
export type Layout = z.infer<typeof Layout>;

/** Who wrote a comment: a person (their name and colour on the canvas) or an agent */
export const CommentAuthor = z.object({
  name: z.string().min(1).max(80),
  color: z.string().max(20).default("#6b7280"),
  agent: z.boolean().optional(),
});
const XY = z.object({ x: z.number(), y: z.number() });
/** For something at a place (not on a resource): the level it was put on, 1 (overview) or 2 (services). None: messages */
const PlaceLevel = z.union([z.literal(1), z.literal(2)]).optional();

/**
 * A comment thread on the canvas, as EventCatalog Studio's: pinned at a place, or on a resource (nodeId, the resource
 * id, with an offset from its top left, so it moves with it), with its messages (the first one starts it, the rest
 * reply), and resolved once it's dealt with
 */
export const CommentThread = z.object({
  id: z.string().min(1).max(60),
  position: XY.describe("Where the pin is on the canvas (messages level)"),
  nodeId: z
    .string()
    .max(200)
    .optional()
    .describe("The resource it is pinned to, if it is"),
  offset: XY.optional().describe("Where on that resource, from its top left"),
  level: PlaceLevel.describe(
    "For one at a place: the level it is on, 1 (overview) or 2 (services); none: messages",
  ),
  author: CommentAuthor,
  createdAt: z.number(),
  resolved: z.boolean().default(false),
  messages: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        text: z.string().min(1).max(4000),
        author: CommentAuthor,
        createdAt: z.number(),
      }),
    )
    .min(1)
    .max(200),
});
export type CommentThread = z.infer<typeof CommentThread>;

/** How much a hotspot matters: critical (red), warning (amber) or info (blue) */
export const HOTSPOT_SEVERITIES = ["critical", "warning", "info"] as const;
export type HotspotSeverity = (typeof HOTSPOT_SEVERITIES)[number];

/**
 * A hotspot: something on the diagram people should know about, as an architect would flag it: a risk, a single
 * point of failure, a known problem, or the key part to understand. On a resource (shown on it), or at a place
 */
export const Hotspot = z.object({
  id: z
    .string()
    .min(1)
    .max(60)
    .default(() => crypto.randomUUID().slice(0, 8)),
  severity: z
    .enum(HOTSPOT_SEVERITIES)
    .default("warning")
    .describe("critical, warning (the default) or info"),
  title: z
    .string()
    .min(1)
    .max(120)
    .describe(
      'What it is, short, e.g. "Single point of failure" or "No retries on payment"',
    ),
  description: z
    .string()
    .max(1000)
    .optional()
    .describe("Why it matters, and what to do about it"),
  resource: z
    .string()
    .max(200)
    .optional()
    .describe(
      "Id of the resource it is about (it shows on it). Leave out for one at a place",
    ),
  position: XY.optional().describe(
    "Where it is on the canvas, for one not on a resource: set by the view",
  ),
  level: PlaceLevel.describe(
    "For one at a place: the level it is on, 1 (overview) or 2 (services); none: messages. Set by the view",
  ),
  author: CommentAuthor.optional().describe(
    "Who flagged it (set it to you, with agent: true)",
  ),
  createdAt: z.number().optional(),
});
export type Hotspot = z.infer<typeof Hotspot>;

export const Model = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .describe('What the diagram shows, e.g. "Orders domain"'),
  resources: z.array(Resource).min(1).max(300),
  relations: z.array(Relation).max(1000).default([]),
  notes: z
    .array(Note)
    .max(100)
    .optional()
    .describe(
      "Notes on the diagram or its resources (users add their own in the view)",
    ),
  comments: z
    .array(CommentThread)
    .max(200)
    .optional()
    .describe(
      "Comment threads people left on the canvas (and their replies): keep them as they are when you change the diagram",
    ),
  hotspots: z
    .array(Hotspot)
    .max(100)
    .optional()
    .describe(
      "Hotspots: what people should know about the architecture (risks, problems, the key parts), each on a resource. Keep the ones there are when you change the diagram",
    ),
  layout: Layout.optional().describe(
    "Where things are on the canvas (set by the view when people arrange it): leave it as it is",
  ),
});
export type Model = z.infer<typeof Model>;

/**
 * A scene of a tour: the agent showing the user something on the diagram, as a person at the canvas would. It
 * switches level, zooms to resources, highlights them (fading the rest), writes notes next to them and pins code.
 */
export const Scene = z.object({
  caption: z
    .string()
    .max(400)
    .optional()
    .describe("What you say in this scene, shown under the diagram"),
  level: z
    .enum(LEVELS)
    .optional()
    .describe(
      "Level of detail: overview (domains, systems), services, messages (everything)",
    ),
  focus: z
    .array(z.string())
    .max(20)
    .optional()
    .describe(
      "Ids of resources to zoom to: one zooms close to it, several fit them all. Leave out to keep the view (or show everything in the first scene)",
    ),
  highlight: z
    .array(z.string())
    .max(50)
    .optional()
    .describe("Ids to highlight, fading everything else. Defaults to focus"),
  notes: z
    .array(z.object({ resource: z.string(), text: z.string().min(1).max(600) }))
    .max(6)
    .optional()
    .describe(
      'Notes you write on the canvas, next to resources, e.g. "This is where the order is saved"',
    ),
  code: z
    .array(
      z.object({
        resource: z.string(),
        title: z
          .string()
          .max(120)
          .optional()
          .describe('e.g. "OrderPlaced.avsc" or "src/orders/publisher.ts:42"'),
        language: z.string().max(30).optional(),
        code: z
          .string()
          .min(1)
          .max(4000)
          .describe(
            "Copied from the code or specs you read, e.g. the event's schema",
          ),
      }),
    )
    .max(3)
    .optional()
    .describe(
      "Code pinned next to a resource, e.g. an event's schema or the handler that consumes it",
    ),
});
export type Scene = z.infer<typeof Scene>;
export const Tour = z.array(Scene).min(1).max(20);

/** What the view shows: the model, where to start, and a tour to play */
export type ArchitecturePayload = {
  model: Model;
  focus?: string;
  level?: Level;
  viewUrl?: string;
  tour?: Scene[];
};
