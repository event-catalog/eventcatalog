import type { ComponentType } from "react";
import { Service } from "./service";
import AgentNode from "./Agent";
import AgentToolNode from "./AgentTool";
import { Event } from "./event";
import { Query } from "./query";
import { Command } from "./command";
import { Channel } from "./channel";
import { Data } from "./data";
import { View } from "./view";
import { Actor } from "./actor";
import { Note } from "./note";
import { Field } from "./field";
import { ExternalSystem } from "./external-system";
import ContextActorNode from "./ContextActor";
import SystemGroupNode from "./SystemGroupNode";
import DomainCardNode from "./DomainCard";
import FlowNode from "./Flow";
import FlowExpandedNode from "./FlowExpandedNode";
import EntityNode from "./Entity";
import UserNode from "./User";
import StepNode from "./Step";
import DomainNode from "./Domain";
import SystemNode from "./System";
import GroupNode from "./GroupNode";
import CustomNode from "./Custom";
import ExternalSystem2Node from "./ExternalSystem2";
import DataProductNode from "./DataProduct";
import SwimlaneNode from "./SwimlaneNode";
import { MessageGroupNode, MessageGroupExpandedNode } from "./message-group";

/**
 * The component a diagram draws each type of node with (types as EventCatalog's node graphs build them, singular
 * and plural). Studio draws diagrams' levels with them too, so they look the same.
 */
export const diagramNodeComponents: Record<string, ComponentType<any>> = {
  service: Service,
  services: Service,
  agent: AgentNode,
  agents: AgentNode,
  agentTool: AgentToolNode,
  "agent-tool": AgentToolNode,
  flow: FlowNode,
  flows: FlowNode,
  event: Event,
  events: Event,
  channel: Channel,
  channels: Channel,
  query: Query,
  queries: Query,
  command: Command,
  commands: Command,
  domain: DomainNode,
  domains: DomainNode,
  system: SystemNode,
  systems: SystemNode,
  step: StepNode,
  user: UserNode,
  custom: CustomNode,
  externalSystem: ExternalSystem,
  "external-system": ExternalSystem2Node,
  entity: EntityNode,
  entities: EntityNode,
  data: Data,
  view: View,
  actor: Actor,
  "context-actor": ContextActorNode,
  container: Data,
  "data-product": DataProductNode,
  "data-products": DataProductNode,
  group: GroupNode,
  "system-group": SystemGroupNode,
  "domain-group": SystemGroupNode,
  "context-domain": DomainCardNode,
  note: Note,
  field: Field,
  messageGroup: MessageGroupNode,
  messageGroupExpanded: MessageGroupExpandedNode,
  flowExpanded: FlowExpandedNode,
  swimlane: SwimlaneNode,
};

/** Node types that show a resource, which can have a context menu (`data.contextMenu`) */
export const RESOURCE_NODE_TYPES = new Set([
  "service",
  "services",
  "agent",
  "agents",
  "agentTool",
  "agent-tool",
  "flow",
  "flows",
  "event",
  "events",
  "channel",
  "channels",
  "query",
  "queries",
  "command",
  "commands",
  "domain",
  "domains",
  "system",
  "systems",
  "externalSystem",
  "external-system",
  "entity",
  "entities",
  "data",
  "view",
  "container",
  "data-product",
  "data-products",
  "field",
]);
