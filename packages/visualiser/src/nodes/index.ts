/**
 * Node components for EventCatalog Visualizer
 */

// Studio-2 nodes (organized in directories) - import for nodeComponents
import { Event, eventConfig } from "./event";
import { Command } from "./command";
import { Query } from "./query";
import { Service } from "./service";
import AgentNode from "./Agent";
import AgentToolNode from "./AgentTool";
import { Channel } from "./channel";
import { Note } from "./note";
import { Data, dataNodeConfig } from "./data";
import { View } from "./view";
import { Actor, actorConfig } from "./actor";
import { ExternalSystem, externalSystemConfig } from "./external-system";
import { Field, fieldConfig } from "./field";

// Re-export studio-2 nodes
export { Event, eventConfig };
export type { EventNode } from "./event";

export { Command };
export type { CommandNode } from "./command";

export { Query };
export type { QueryNode } from "./query";

export { Service };
export type { ServiceNode } from "./service";

export type { AgentToolNode as AgentToolNodeType } from "./AgentTool";

export { Channel };
export type { ChannelNode } from "./channel";

export { Note };
export type { NoteNode } from "./note";

export { Data, dataNodeConfig };
export type { DataNode } from "./data";

export { View };
export type { ViewNode } from "./view";

export { Actor, actorConfig };
export type { ActorNode } from "./actor";

export { ExternalSystem, externalSystemConfig };
export type { ExternalSystemNode } from "./external-system";

export { Field, fieldConfig };
export type { FieldNodeType } from "./field";

// Shared components
export { NotesIndicator } from "./NotesIndicator";
export { OwnerIndicator, normalizeOwners } from "./OwnerIndicator";

// Core nodes (single files) - import then re-export for nodeComponents
import CustomNode from "./Custom";
import DomainNode from "./Domain";
import SystemNode from "./System";
import ContextActorNode from "./ContextActor";
import SystemGroupNode from "./SystemGroupNode";
import EntityNode from "./Entity";
import FlowNode from "./Flow";
import FlowExpandedNode from "./FlowExpandedNode";
import GroupNode from "./GroupNode";
import StepNode from "./Step";
import UserNode from "./User";
import DataProductNode from "./DataProduct";
import ExternalSystem2Node from "./ExternalSystem2";
import { MessageGroupNode, MessageGroupExpandedNode } from "./message-group";

export {
  CustomNode,
  DomainNode,
  SystemNode,
  ContextActorNode,
  SystemGroupNode,
  EntityNode,
  FlowNode,
  FlowExpandedNode,
  GroupNode,
  StepNode,
  UserNode,
  DataProductNode,
  AgentNode,
  AgentToolNode,
  ExternalSystem2Node,
  MessageGroupNode,
  MessageGroupExpandedNode,
};

export type {
  MessageGroupNodeType,
  MessageGroupNodeData,
} from "./message-group";

export type { MessageGroupExpandedNodeData } from "./message-group";

// Node type constants
export {
  SERVICE,
  AGENT,
  AGENT_TOOL,
  EVENT,
  QUERY,
  COMMAND,
  CHANNEL,
  ACTOR,
  MESSAGE,
  DATA,
  VIEW,
} from "./node-types";

// Re-export for convenience (studio-2 nodes only)
export const nodeComponents = {
  event: Event,
  command: Command,
  query: Query,
  service: Service,
  agent: AgentNode,
  agentTool: AgentToolNode,
  "agent-tool": AgentToolNode,
  channel: Channel,
  note: Note,
  externalSystem: ExternalSystem,
  data: Data,
  view: View,
  actor: Actor,
  field: Field,
  // Core nodes are available via individual imports
  custom: CustomNode,
  domain: DomainNode,
  system: SystemNode,
  "context-actor": ContextActorNode,
  "system-group": SystemGroupNode,
  entity: EntityNode,
  flow: FlowNode,
  flowExpanded: FlowExpandedNode,
  group: GroupNode,
  step: StepNode,
  user: UserNode,
  dataProduct: DataProductNode,
  externalSystem2: ExternalSystem2Node,
  messageGroup: MessageGroupNode,
  messageGroupExpanded: MessageGroupExpandedNode,
};

export const nodeConfigs: Record<string, import("../types").NodeConfiguration> =
  {
    event: eventConfig,
    data: dataNodeConfig,
    actor: actorConfig,
    externalSystem: externalSystemConfig,
    field: fieldConfig,
  };
