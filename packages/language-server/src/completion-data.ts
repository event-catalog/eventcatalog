/**
 * Shared completion data used by both the language server (LSP) and the playground (Monaco).
 * This is the single source of truth for all snippet templates, annotations, and context-aware suggestions.
 */

export interface Suggestion {
  label: string;
  detail: string;
  insertText: string;
}

// ─── Message type → plural form ─────────────────────────

export const MESSAGE_TYPE_PLURAL: Record<string, string> = {
  event: "events",
  command: "commands",
  query: "queries",
};

// ─── Top-level resource keyword snippets ─────────────────

export const RESOURCE_KEYWORDS: Suggestion[] = [
  {
    label: "domain",
    detail: "Top-level bounded context",
    insertText:
      'domain ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Bounded context responsible for $1}"\n\n  $0\n}',
  },
  {
    label: "service",
    detail: "Microservice or application",
    insertText:
      'service ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Service that manages and processes $1 operations}"\n\n  $0\n}',
  },
  {
    label: "event",
    detail: "Domain event",
    insertText:
      'event ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Triggered when a significant change occurs in the domain}"\n}',
  },
  {
    label: "command",
    detail: "Command message",
    insertText:
      'command ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Requests an action to be performed in the system}"\n}',
  },
  {
    label: "query",
    detail: "Query message",
    insertText:
      'query ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Retrieves data from the system without side effects}"\n}',
  },
  {
    label: "channel",
    detail: "Communication channel",
    insertText:
      'channel ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Message channel for routing events between services}"\n  address "${4:topic}"\n\n  $0\n}',
  },
  {
    label: "user",
    detail: "User definition",
    insertText: 'user ${1:username} {\n  name "${2:Full Name}"\n\n  $0\n}',
  },
  {
    label: "team",
    detail: "Team definition",
    insertText: 'team ${1:team-name} {\n  name "${2:Team Name}"\n\n  $0\n}',
  },
  {
    label: "flow",
    detail: "Flow definition",
    insertText:
      'flow ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:End-to-end flow describing how messages move through the system}"\n\n  $0\n}',
  },
  {
    label: "container",
    detail: "Data container",
    insertText:
      'container ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Data store that persists and manages $1 data}"\n\n  $0\n}',
  },
  {
    label: "data-product",
    detail: "Data product",
    insertText:
      'data-product ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Data product that provides curated data for consumers}"\n\n  $0\n}',
  },
  {
    label: "visualizer",
    detail: "Visualizer view",
    insertText: 'visualizer ${1:main} {\n  name "${2:View Name}"\n\n  $0\n}',
  },
  {
    label: "actor",
    detail: "Human actor (for flows)",
    insertText:
      'actor ${1:Name} {\n  name "${2:Display Name}"\n  summary "${3:User or persona that interacts with the system}"\n}',
  },
  {
    label: "external-system",
    detail: "External system (for flows)",
    insertText:
      'external-system ${1:Name} {\n  name "${2:Display Name}"\n  summary "${3:Third-party system that integrates with the platform}"\n}',
  },
];

// ─── Common properties (shared across most resource types) ──

export const COMMON_PROPS: Suggestion[] = [
  {
    label: "version",
    detail: "Semantic version",
    insertText: "version ${1:1.0.0}",
  },
  {
    label: "name",
    detail: "Display name",
    insertText: 'name "${1:Display Name}"',
  },
  {
    label: "summary",
    detail: "Short description",
    insertText: 'summary "${1:description}"',
  },
  {
    label: "owner",
    detail: "Owner reference",
    insertText: "owner ${1:MyTeam}",
  },
  {
    label: "deprecated",
    detail: "Mark as deprecated",
    insertText: "deprecated true",
  },
  { label: "draft", detail: "Mark as draft", insertText: "draft true" },
];

// ─── Annotation snippets with full argument scaffolding ──

export const ANNOTATION_SUGGESTIONS: Suggestion[] = [
  {
    label: "@api",
    detail: "HTTP API metadata",
    insertText:
      'api(method: "${1|GET,POST,PUT,PATCH,DELETE|}", path: "${2:/resource}", statusCodes: "${3:200}")',
  },
  {
    label: "@badge",
    detail: "Visual badge",
    insertText: 'badge("${1:label}", bg: "${2:#22c55e}", text: "${3:#fff}")',
  },
  {
    label: "@note",
    detail: "Developer note or reminder",
    insertText: 'note("${1:note text}")',
  },
  {
    label: "@note (with params)",
    detail: "Note with author and priority",
    insertText:
      'note("${1:note text}", author: "${2:name}", priority: "${3|low,medium,high|}")',
  },
  {
    label: "@repository",
    detail: "Source code repository",
    insertText:
      'repository(url: "${1:https://github.com/...}", language: "${2:TypeScript}")',
  },
  {
    label: "@specification",
    detail: "API specification",
    insertText:
      'specification(type: ${1|openapi,asyncapi,graphql|}, path: "${2:./spec.yml}")',
  },
  {
    label: "@externalId",
    detail: "External identifier",
    insertText: 'externalId("${1:id}")',
  },
  {
    label: "@tag",
    detail: "Add a tag to the resource",
    insertText: 'tag("${1:tag-name}")',
  },
];

// ─── Context-aware completions per resource type ─────────

export const CONTEXT_SUGGESTIONS: Record<string, Suggestion[]> = {
  service: [
    ...COMMON_PROPS,
    {
      label: "sends",
      detail: "Service sends a message",
      insertText: "sends ${1|event,command,query|} ${2:Name}",
    },
    {
      label: "receives",
      detail: "Service receives a message",
      insertText: "receives ${1|event,command,query|} ${2:Name}",
    },
    {
      label: "writes-to",
      detail: "Writes to a container",
      insertText: "writes-to container ${1:Container}",
    },
    {
      label: "reads-from",
      detail: "Reads from a container",
      insertText: "reads-from container ${1:Container}",
    },
  ],
  domain: [
    ...COMMON_PROPS,
    {
      label: "service",
      detail: "Nested service",
      insertText: "service ${1:Name} {\n  version ${2:1.0.0}\n\n  $0\n}",
    },
    {
      label: "subdomain",
      detail: "Nested subdomain",
      insertText: "subdomain ${1:Name} {\n  version ${2:1.0.0}\n\n  $0\n}",
    },
  ],
  event: [
    ...COMMON_PROPS,
    {
      label: "schema",
      detail: "Schema path",
      insertText: 'schema "${1:path}"',
    },
  ],
  command: [
    ...COMMON_PROPS,
    {
      label: "schema",
      detail: "Schema path",
      insertText: 'schema "${1:path}"',
    },
  ],
  query: [
    ...COMMON_PROPS,
    {
      label: "schema",
      detail: "Schema path",
      insertText: 'schema "${1:path}"',
    },
  ],
  channel: [
    ...COMMON_PROPS,
    {
      label: "address",
      detail: "Channel address/topic",
      insertText: 'address "${1:topic}"',
    },
    {
      label: "protocol",
      detail: "Channel protocol",
      insertText: 'protocol "${1:protocol}"',
    },
    {
      label: "route",
      detail: "Route to another channel",
      insertText: "route ${1:ChannelName}",
    },
  ],
  user: [
    {
      label: "name",
      detail: "Display name",
      insertText: 'name "${1:Full Name}"',
    },
    {
      label: "avatar",
      detail: "Avatar URL",
      insertText: 'avatar "${1:https://example.com/avatar.png}"',
    },
    { label: "role", detail: "User role", insertText: 'role "${1:role}"' },
  ],
  team: [
    {
      label: "name",
      detail: "Team display name",
      insertText: 'name "${1:Team Name}"',
    },
    {
      label: "avatar",
      detail: "Avatar URL",
      insertText: 'avatar "${1:https://example.com/avatar.png}"',
    },
    { label: "role", detail: "Team role", insertText: 'role "${1:role}"' },
    {
      label: "member",
      detail: "Team member",
      insertText: "member ${1:username}",
    },
  ],
  flow: [
    ...COMMON_PROPS,
    {
      label: "entry chain",
      detail: "Starting arrow chain",
      insertText: '${1:Source} "${2:description}" -> ${3:Target}',
    },
    {
      label: "when block",
      detail: "React to an event",
      insertText:
        'when ${1:TriggerName}\n  ${2:ServiceName} "${3:description}"\n    -> ${0:OutputName}',
    },
    {
      label: "when (convergence)",
      detail: "React to multiple events",
      insertText:
        'when ${1:EventA} and ${2:EventB}\n  ${3:ServiceName} "${4:description}"\n    -> ${0:OutputName}',
    },
    {
      label: "labeled output",
      detail: "Output with label",
      insertText: '-> "${1:label}": ${2:TargetName}',
    },
  ],
  container: [
    ...COMMON_PROPS,
    {
      label: "container-type",
      detail: "Type of container",
      insertText:
        "container-type ${1|database,cache,objectStore,searchIndex,dataWarehouse,dataLake,externalSaaS,other|}",
    },
    {
      label: "technology",
      detail: "Technology/implementation",
      insertText: 'technology "${1:postgres@14}"',
    },
    {
      label: "authoritative",
      detail: "Authoritative source",
      insertText: "authoritative ${1|true,false|}",
    },
    {
      label: "access-mode",
      detail: "Access pattern",
      insertText: "access-mode ${1|read,write,readWrite,appendOnly|}",
    },
    {
      label: "classification",
      detail: "Data classification",
      insertText: "classification ${1|public,internal,confidential,regulated|}",
    },
    {
      label: "residency",
      detail: "Data residency",
      insertText: 'residency "${1:region}"',
    },
    {
      label: "retention",
      detail: "Data retention policy",
      insertText: 'retention "${1:policy}"',
    },
  ],
  "data-product": [
    ...COMMON_PROPS,
    {
      label: "input",
      detail: "Input data source",
      insertText: "input ${1|event,command,query|} ${2:ResourceName}",
    },
    {
      label: "output",
      detail: "Output dataset",
      insertText: "output ${1|event,command,query|} ${2:DatasetName}",
    },
    {
      label: "output (with contract)",
      detail: "Output with schema contract",
      insertText:
        'output ${1|event,command,query|} ${2:DatasetName} {\n  contract {\n    path "${3:./schemas/schema.json}"\n    name "${4:SchemaName}"\n    type "${5:json-schema}"\n  }\n}',
    },
  ],
  actor: [
    {
      label: "name",
      detail: "Display name",
      insertText: 'name "${1:Display Name}"',
    },
    {
      label: "summary",
      detail: "Short description",
      insertText: 'summary "${1:description}"',
    },
  ],
  "external-system": [
    {
      label: "name",
      detail: "Display name",
      insertText: 'name "${1:Display Name}"',
    },
    {
      label: "summary",
      detail: "Short description",
      insertText: 'summary "${1:description}"',
    },
  ],
  visualizer: [
    {
      label: "name",
      detail: "Display name",
      insertText: 'name "${1:View Name}"',
    },
    {
      label: "summary",
      detail: "Short description",
      insertText: 'summary "${1:description}"',
    },
    {
      label: "legend",
      detail: "Show/hide legend",
      insertText: "legend ${1|true,false|}",
    },
    {
      label: "search",
      detail: "Show/hide search",
      insertText: "search ${1|true,false|}",
    },
    {
      label: "toolbar",
      detail: "Show/hide toolbar",
      insertText: "toolbar ${1|true,false|}",
    },
    {
      label: "focus-mode",
      detail: "Enable/disable focus mode",
      insertText: "focus-mode ${1|true,false|}",
    },
    {
      label: "animated",
      detail: "Simulate message flow animation",
      insertText: "animated ${1|true,false|}",
    },
    {
      label: "style",
      detail: "Node rendering style",
      insertText: "style ${1|default,post-it|}",
    },
    {
      label: "service",
      detail: "Include a service",
      insertText:
        'service ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Service that manages and processes $1 operations}"\n\n  $0\n}',
    },
    {
      label: "domain",
      detail: "Include a domain",
      insertText:
        'domain ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Bounded context responsible for $1}"\n\n  $0\n}',
    },
    {
      label: "event",
      detail: "Include an event",
      insertText:
        'event ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Triggered when a significant change occurs in the domain}"\n}',
    },
    {
      label: "command",
      detail: "Include a command",
      insertText:
        'command ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Requests an action to be performed in the system}"\n}',
    },
    {
      label: "query",
      detail: "Include a query",
      insertText:
        'query ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Retrieves data from the system without side effects}"\n}',
    },
    {
      label: "channel",
      detail: "Include a channel",
      insertText:
        'channel ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Message channel for routing events between services}"\n  address "${4:topic}"\n\n  $0\n}',
    },
    {
      label: "container",
      detail: "Include a container",
      insertText:
        'container ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Data store that persists and manages $1 data}"\n}',
    },
    {
      label: "flow",
      detail: "Include a flow",
      insertText:
        'flow ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:End-to-end flow describing how messages move through the system}"\n}',
    },
  ],
};
