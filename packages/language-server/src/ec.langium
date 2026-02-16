grammar Ec

// ─── Entry ──────────────────────────────────────────────
entry Program:
  (imports+=ImportDecl)* (definitions+=ResourceDefinition)*;

ImportDecl:
  'import' '{' imports+=ImportItem (',' imports+=ImportItem)* '}' 'from' path=STRING;

ImportItem:
  name=ID;

// ─── Resource definitions ───────────────────────────────
ResourceDefinition:
  DomainDef | ServiceDef | EventDef | CommandDef | QueryDef |
  ChannelDef | ContainerDef | DataProductDef |
  FlowDef | DiagramDef | UserDef | TeamDef | VisualizerDef |
  ActorDef | ExternalSystemDef;

// ─── Domain ─────────────────────────────────────────────
DomainDef:
  'domain' name=ID '{' (body+=DomainBodyItem)* '}';

DomainBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt |
  DeprecatedStmt | DraftStmt |
  ServiceDef | SubdomainDef | ContainerDef | ChannelDef |
  ServiceRefStmt | DataProductRefStmt | FlowRefStmt |
  SendsStmt | ReceivesStmt | Annotation;

SubdomainDef:
  'subdomain' name=ID '{' (body+=DomainBodyItem)* '}';

// ─── Service ────────────────────────────────────────────
ServiceDef:
  'service' name=ID '{' (body+=ServiceBodyItem)* '}';

ServiceBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt |
  DeprecatedStmt | DraftStmt |
  SendsStmt | ReceivesStmt | WritesToStmt | ReadsFromStmt |
  FlowRefStmt | Annotation;

// ─── Messages (Event, Command, Query) ───────────────────
EventDef:
  'event' name=ID ('{' (body+=MessageBodyItem)* '}')?;

CommandDef:
  'command' name=ID ('{' (body+=MessageBodyItem)* '}')?;

QueryDef:
  'query' name=ID ('{' (body+=MessageBodyItem)* '}')?;

MessageBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt |
  SchemaStmt | DeprecatedStmt | DraftStmt |
  Annotation;

// ─── Channel ────────────────────────────────────────────
ChannelDef:
  'channel' name=ID '{' (body+=ChannelBodyItem)* '}';

ChannelBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt |
  AddressStmt | ProtocolStmt | ParameterDecl |
  RouteStmt | Annotation;

AddressStmt:
  'address' value=STRING;

ProtocolStmt:
  'protocol' value=STRING;

ParameterDecl:
  'parameter' name=ID '{' (props+=ParameterProp)* '}';

ParameterProp:
  ParameterDescriptionProp | ParameterDefaultProp | ParameterEnumProp | ParameterExamplesProp;

ParameterDescriptionProp:
  'description' value=STRING;

ParameterDefaultProp:
  'default' value=STRING;

ParameterEnumProp:
  'enum' value=StringArray;

ParameterExamplesProp:
  'examples' value=StringArray;

StringArray:
  '[' items+=STRING (',' items+=STRING)* ']';

RouteStmt:
  'route' ref=ResourceRef;

// ─── Container ──────────────────────────────────────────
ContainerDef:
  'container' name=ID '{' (body+=ContainerBodyItem)* '}';

ContainerBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt | DeprecatedStmt | DraftStmt |
  ContainerTypeStmt | TechnologyStmt | AuthoritativeStmt |
  AccessModeStmt | ClassificationStmt | ResidencyStmt |
  RetentionStmt | ServiceRefStmt | Annotation;

ContainerTypeStmt:
  'container-type' value=ContainerTypeEnum;

ContainerTypeEnum returns string:
  'database' | 'cache' | 'objectStore' | 'searchIndex' |
  'dataWarehouse' | 'dataLake' | 'externalSaaS' | 'other';

TechnologyStmt:
  'technology' value=STRING;

AuthoritativeStmt:
  'authoritative' value=BoolLiteral;

AccessModeStmt:
  'access-mode' value=AccessModeEnum;

AccessModeEnum returns string:
  'read' | 'write' | 'readWrite' | 'appendOnly';

ClassificationStmt:
  'classification' value=ClassificationEnum;

ClassificationEnum returns string:
  'public' | 'internal' | 'confidential' | 'regulated';

ResidencyStmt:
  'residency' value=STRING;

RetentionStmt:
  'retention' value=STRING;

// ─── Data Product ───────────────────────────────────────
DataProductDef:
  'data-product' name=ID '{' (body+=DataProductBodyItem)* '}';

DataProductBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt |
  DeprecatedStmt | DraftStmt |
  InputStmt | OutputStmt | Annotation;

InputStmt:
  'input' type=MessageType ref=ResourceRef;

OutputStmt:
  'output' type=MessageType name=ID ('{' contract=ContractBlock '}')?;

ContractBlock:
  'contract' '{' 'path' path=STRING 'name' contractName=STRING ('type' contractType=STRING)? '}';

// ─── Flow ───────────────────────────────────────────────
FlowDef:
  'flow' name=ID '{' (body+=FlowBodyItem)* '}';

FlowBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt |
  FlowWhenBlock | FlowEntryChain | Annotation;

FlowEntryChain:
  sources+=FlowRef (',' sources+=FlowRef)*
  ('->' targets+=FlowRef)+;

FlowWhenBlock:
  'when' triggers+=FlowRef ('and' triggers+=FlowRef)*
  (actions+=FlowAction)+;

FlowAction:
  ref=FlowRef (outputs+=FlowOutput)*;

FlowOutput:
  '->' (label=STRING ':')? target=FlowRef;

FlowRef:
  name=ID (label=STRING)?;

// ─── Visualizer ─────────────────────────────────────────
VisualizerDef:
  'visualizer' name=ID '{' (body+=VisualizerBodyItem)* '}';

VisualizerBodyItem:
  NameStmt | SummaryStmt | Annotation |
  LegendStmt | SearchStmt | ToolbarStmt | FocusModeStmt | AnimatedStmt | StyleStmt |
  DomainDef | ServiceDef | EventDef | CommandDef | QueryDef |
  ChannelDef | ContainerDef | DataProductDef | FlowDef |
  ActorDef | ExternalSystemDef |
  ServiceRefStmt | DomainRefStmt | ChannelRefStmt |
  DataProductRefStmt | FlowRefStmt | ContainerRefStmt;

// ─── Diagram ────────────────────────────────────────────
DiagramDef:
  'diagram' name=ID '{' (body+=DiagramBodyItem)* '}';

DiagramBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt | Annotation;

// ─── User ───────────────────────────────────────────────
UserDef:
  'user' name=ID '{' (props+=UserProp)* '}';

UserProp:
  UserNameProp | UserAvatarProp | UserRoleProp | UserEmailProp |
  UserSlackProp | UserMsTeamsProp |
  UserAnnotationProp;

UserNameProp:
  'name' value=STRING;

UserAvatarProp:
  'avatar' value=STRING;

UserRoleProp:
  'role' value=STRING;

UserEmailProp:
  'email' value=STRING;

UserSlackProp:
  'slack' value=STRING;

UserMsTeamsProp:
  'ms-teams' value=STRING;

UserAnnotationProp:
  annotation=Annotation;

// ─── Team ───────────────────────────────────────────────
TeamDef:
  'team' name=ID '{' (props+=TeamProp)* '}';

TeamProp:
  TeamNameProp | TeamAvatarProp | TeamRoleProp | TeamSummaryProp | TeamEmailProp | TeamSlackProp |
  TeamMsTeamsProp | TeamMemberProp | TeamAnnotationProp;

TeamNameProp:
  'name' value=STRING;

TeamAvatarProp:
  'avatar' value=STRING;

TeamRoleProp:
  'role' value=STRING;

TeamSummaryProp:
  'summary' value=STRING;

TeamEmailProp:
  'email' value=STRING;

TeamSlackProp:
  'slack' value=STRING;

TeamMsTeamsProp:
  'ms-teams' value=STRING;

TeamMemberProp:
  'member' memberRef=ID;

TeamAnnotationProp:
  annotation=Annotation;

// ─── Actor ─────────────────────────────────────────────
ActorDef:
  'actor' name=ID ('{' (body+=ActorBodyItem)* '}')?;

ActorBodyItem:
  NameStmt | SummaryStmt | Annotation;

// ─── External System ───────────────────────────────────
ExternalSystemDef:
  'external-system' name=ID ('{' (body+=ExternalSystemBodyItem)* '}')?;

ExternalSystemBodyItem:
  NameStmt | SummaryStmt | Annotation;

// ─── Sends / Receives ──────────────────────────────────
SendsStmt:
  'sends' messageType=MessageType messageName=ID ('@' version=VERSION)?
  (channelClause=ChannelClause)?
  ('{' (body+=SendsReceivesBodyItem)* '}')?;

ReceivesStmt:
  'receives' messageType=MessageType messageName=ID ('@' version=VERSION)?
  (channelClause=ChannelClause)?
  ('{' (body+=SendsReceivesBodyItem)* '}')?;

SendsReceivesBodyItem:
  VersionStmt | NameStmt | SummaryStmt | OwnerStmt |
  SchemaStmt | ToClause | FromClause | Annotation;

ChannelClause:
  ToClause | FromClause;

ToClause:
  'to' channels+=ChannelRef (',' channels+=ChannelRef)*
  ('delivery' deliveryMode=DeliveryMode)?;

FromClause:
  'from' channels+=ChannelRef (',' channels+=ChannelRef)*
  ('delivery' deliveryMode=DeliveryMode)?;

ChannelRef:
  channelName=ID ('@' channelVersion=VERSION)?;

DeliveryMode returns string:
  'push' | 'pull' | 'push-pull';

// ─── Writes-to / Reads-from ────────────────────────────
WritesToStmt:
  'writes-to' 'container' ref=ResourceRef;

ReadsFromStmt:
  'reads-from' 'container' ref=ResourceRef;

// ─── Common statements ─────────────────────────────────
VersionStmt:
  'version' value=VERSION;

NameStmt:
  'name' value=STRING;

SummaryStmt:
  'summary' value=STRING;

OwnerStmt:
  'owner' ownerRef=ID;

SchemaStmt:
  'schema' value=STRING;

DeprecatedStmt:
  'deprecated' value=BoolLiteral;

DraftStmt:
  'draft' value=BoolLiteral;

LegendStmt:
  'legend' value=BoolLiteral;

SearchStmt:
  'search' value=BoolLiteral;

ToolbarStmt:
  'toolbar' value=BoolLiteral;

FocusModeStmt:
  'focus-mode' value=BoolLiteral;

AnimatedStmt:
  'animated' value=BoolLiteral;

StyleStmt:
  'style' value=StyleEnum;

StyleEnum returns string:
  'default' | 'post-it';

ChannelRefStmt:
  'channel' ref=ResourceRef;

FlowRefStmt:
  'flow' ref=ResourceRef;

DataProductRefStmt:
  'data-product' ref=ResourceRef;

ServiceRefStmt:
  'service' ref=ResourceRef;

DomainRefStmt:
  'domain' ref=ResourceRef;

ContainerRefStmt:
  'container' ref=ResourceRef;

ResourceTypeKw returns string:
  'domain' | 'service' | 'event' | 'command' | 'query';

// ─── Annotations ────────────────────────────────────────
Annotation:
  '@' name=AnnotationName
  ('(' args+=AnnotationArg (',' args+=AnnotationArg)* ')')?
  ('{' (block+=AnnotationBlockItem)* '}')?;

AnnotationName returns string:
  ID;

AnnotationArg:
  NamedAnnotationArg | PositionalAnnotationArg;

NamedAnnotationArg:
  key=AnnotationKey ':' value=AnnotationValue;

PositionalAnnotationArg:
  value=AnnotationValue;

AnnotationKey returns string:
  ID | 'url' | 'type' | 'name' | 'path' | 'label' | 'icon' | 'title' |
  'color' | 'description' | 'message' | 'version' | 'summary' |
  'email' | 'slack' | 'role' | 'default';

AnnotationValue:
  StringAnnotationValue | IdAnnotationValue | NumberAnnotationValue |
  BoolAnnotationValue | VersionAnnotationValue | KeywordAnnotationValue;

StringAnnotationValue:
  value=STRING;

IdAnnotationValue:
  value=ID;

NumberAnnotationValue:
  value=NUMBER;

BoolAnnotationValue:
  value=BoolLiteral;

VersionAnnotationValue:
  value=VERSION;

KeywordAnnotationValue:
  value=AnnotationKeywordAsValue;

AnnotationKeywordAsValue returns string:
  'type' | 'name' | 'path' | 'url';

AnnotationBlockItem:
  ResourceAnnotationBlockItem | KeyValueAnnotationBlockItem;

ResourceAnnotationBlockItem:
  resourceType=ResourceTypeKw resourceName=ID ('@' version=VERSION)?;

KeyValueAnnotationBlockItem:
  key=ID value=AnnotationBlockValue;

AnnotationBlockValue returns string:
  'visible' | 'hidden' | ID | VERSION;

// ─── Shared helpers ─────────────────────────────────────
MessageType returns string:
  'event' | 'command' | 'query';

ResourceRef:
  name=ID ('@' version=VERSION)?;

BoolLiteral returns boolean:
  'true' | 'false';

// ─── Terminals ──────────────────────────────────────────
hidden terminal WS: /\s+/;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
terminal VERSION: /\d+\.\d+\.\d+(-[a-zA-Z0-9_.]+)*/;
terminal STRING: /"(?:[^"\\]|\\.)*"/;
terminal NUMBER: /\d+/;
terminal ID: /[a-zA-Z_][a-zA-Z0-9_.-]*/;
