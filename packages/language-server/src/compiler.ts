import type { AstNode } from "langium";
import type {
  Program,
  ResourceDefinition,
  DomainDef,
  ServiceDef,
  EventDef,
  CommandDef,
  QueryDef,
  ChannelDef,
  ContainerDef,
  DataProductDef,
  FlowDef,
  DiagramDef,
  UserDef,
  TeamDef,
  VisualizerDef,
  Annotation,
  SendsStmt,
  ReceivesStmt,
  FlowRef,
  NamedAnnotationArg,
  PositionalAnnotationArg,
  ResourceAnnotationBlockItem,
  KeyValueAnnotationBlockItem,
} from "./generated/ast.js";
import {
  isDomainDef,
  isServiceDef,
  isEventDef,
  isCommandDef,
  isQueryDef,
  isChannelDef,
  isContainerDef,
  isDataProductDef,
  isFlowDef,
  isDiagramDef,
  isUserDef,
  isTeamDef,
  isVisualizerDef,
  isActorDef,
  isExternalSystemDef,
  isNamedAnnotationArg,
  isPositionalAnnotationArg,
  isResourceAnnotationBlockItem,
  isKeyValueAnnotationBlockItem,
  isParameterDescriptionProp,
  isParameterDefaultProp,
  isParameterEnumProp,
  isParameterExamplesProp,
  isToClause,
  isFromClause,
  isStringAnnotationValue,
  isIdAnnotationValue,
  isNumberAnnotationValue,
  isBoolAnnotationValue,
  isVersionAnnotationValue,
  isKeywordAnnotationValue,
} from "./generated/ast.js";
import {
  stripQuotes,
  getVersion,
  getName,
  getSummary,
  getOwners,
  getDeprecated,
  getDraft,
  getSchema,
  getServices,
  getSubdomains,
  getFlowRefs,
  getDataProductRefs,
  getSends,
  getReceives,
  getWritesToRefs,
  getReadsFromRefs,
  getChannelRefs,
  getAnnotations,
  getAddress,
  getProtocols,
  getParameters,
  getRoutes,
  getContainerType,
  getTechnology,
  getAuthoritative,
  getAccessMode,
  getClassification,
  getResidency,
  getRetention,
  getInputs,
  getOutputs,
  getFlowEntryChains,
  getFlowWhenBlocks,
  getServiceRefs,
  getDomainRefs,
  getToClause,
  getFromClause,
} from "./ast-utils.js";

export interface CompiledOutput {
  path: string;
  content: string;
}

export function compile(program: Program): CompiledOutput[] {
  const outputs: CompiledOutput[] = [];
  for (const def of program.definitions) {
    compileDefinition(def, outputs);
  }
  return outputs;
}

function compileDefinition(
  def: ResourceDefinition,
  outputs: CompiledOutput[],
): void {
  if (isDomainDef(def)) compileDomain(def, outputs);
  else if (isServiceDef(def)) {
    compileService(def, outputs);
    compileInlineMessages(def, outputs);
  } else if (isEventDef(def)) compileMessage(def, "events", outputs);
  else if (isCommandDef(def)) compileMessage(def, "commands", outputs);
  else if (isQueryDef(def)) compileMessage(def, "queries", outputs);
  else if (isChannelDef(def)) compileChannel(def, outputs);
  else if (isContainerDef(def)) compileContainer(def, outputs);
  else if (isDataProductDef(def)) compileDataProduct(def, outputs);
  else if (isFlowDef(def)) compileFlow(def, outputs);
  else if (isDiagramDef(def)) compileDiagram(def, outputs);
  else if (isUserDef(def)) compileUser(def, outputs);
  else if (isTeamDef(def)) compileTeam(def, outputs);
  else if (isVisualizerDef(def)) compileVisualizer(def, outputs);
  // ActorDef and ExternalSystemDef are flow-only — no markdown output
}

// --- YAML helpers ---

function yamlValue(val: unknown): string {
  if (typeof val === "string") return JSON.stringify(val);
  if (typeof val === "boolean" || typeof val === "number") return String(val);
  return String(val);
}

function buildFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  writeFrontmatterFields(lines, fields, 0);
  lines.push("---");
  return lines.join("\n");
}

function writeFrontmatterFields(
  lines: string[],
  fields: Record<string, unknown>,
  indent: number,
): void {
  const prefix = "  ".repeat(indent);
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          const entries = Object.entries(item).filter(
            ([, v]) => v !== undefined && v !== null,
          );
          if (entries.length > 0) {
            const [firstKey, firstVal] = entries[0];
            if (typeof firstVal === "object" && firstVal !== null) {
              lines.push(`${prefix}  - ${firstKey}:`);
              writeFrontmatterFields(
                lines,
                firstVal as Record<string, unknown>,
                indent + 3,
              );
            } else {
              lines.push(`${prefix}  - ${firstKey}: ${yamlValue(firstVal)}`);
            }
            for (let i = 1; i < entries.length; i++) {
              const [k, v] = entries[i];
              if (typeof v === "object" && v !== null && !Array.isArray(v)) {
                lines.push(`${prefix}    ${k}:`);
                writeFrontmatterFields(
                  lines,
                  v as Record<string, unknown>,
                  indent + 3,
                );
              } else if (Array.isArray(v)) {
                lines.push(`${prefix}    ${k}:`);
                for (const subItem of v) {
                  if (typeof subItem === "object" && subItem !== null) {
                    const subEntries = Object.entries(subItem).filter(
                      ([, sv]) => sv !== undefined && sv !== null,
                    );
                    if (subEntries.length > 0) {
                      const [sk, sv] = subEntries[0];
                      lines.push(`${prefix}      - ${sk}: ${yamlValue(sv)}`);
                      for (let j = 1; j < subEntries.length; j++) {
                        const [sk2, sv2] = subEntries[j];
                        lines.push(
                          `${prefix}        ${sk2}: ${yamlValue(sv2)}`,
                        );
                      }
                    }
                  } else {
                    lines.push(`${prefix}      - ${yamlValue(subItem)}`);
                  }
                }
              } else {
                lines.push(`${prefix}    ${k}: ${yamlValue(v)}`);
              }
            }
          }
        } else {
          lines.push(`${prefix}  - ${yamlValue(item)}`);
        }
      }
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${prefix}${key}:`);
      writeFrontmatterFields(
        lines,
        value as Record<string, unknown>,
        indent + 1,
      );
    } else {
      lines.push(`${prefix}${key}: ${yamlValue(value)}`);
    }
  }
}

// --- Annotation mapping ---

function getAnnotationArgValue(
  arg: NamedAnnotationArg | PositionalAnnotationArg,
): string | boolean | number {
  const v = isNamedAnnotationArg(arg) ? arg.value : arg.value;
  if (isStringAnnotationValue(v)) return stripQuotes(v.value);
  if (isIdAnnotationValue(v)) return v.value;
  if (isNumberAnnotationValue(v)) return parseInt(v.value, 10);
  if (isBoolAnnotationValue(v)) return v.value;
  if (isVersionAnnotationValue(v)) return v.value;
  if (isKeywordAnnotationValue(v)) return v.value;
  return "";
}

function mapAnnotations(annotations: Annotation[]): Record<string, unknown> {
  if (annotations.length === 0) return {};
  const result: Record<string, unknown> = {};

  for (const ann of annotations) {
    switch (ann.name) {
      case "badge": {
        if (!result.badges) result.badges = [];
        const badge: Record<string, string> = {};
        const contentArg = ann.args.find((a) => isPositionalAnnotationArg(a));
        if (contentArg)
          badge.content = String(getAnnotationArgValue(contentArg));
        const bgArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "bg",
        ) as NamedAnnotationArg | undefined;
        if (bgArg) badge.backgroundColor = String(getAnnotationArgValue(bgArg));
        const textArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "text",
        ) as NamedAnnotationArg | undefined;
        if (textArg) badge.textColor = String(getAnnotationArgValue(textArg));
        (result.badges as Record<string, string>[]).push(badge);
        break;
      }
      case "note": {
        if (!result.notes) result.notes = [];
        const note: Record<string, string> = {};
        const noteContentArg = ann.args.find((a) =>
          isPositionalAnnotationArg(a),
        );
        if (noteContentArg)
          note.content = String(getAnnotationArgValue(noteContentArg));
        const authorArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "author",
        ) as NamedAnnotationArg | undefined;
        if (authorArg) note.author = String(getAnnotationArgValue(authorArg));
        const priorityArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "priority",
        ) as NamedAnnotationArg | undefined;
        if (priorityArg)
          note.priority = String(getAnnotationArgValue(priorityArg));
        (result.notes as Record<string, string>[]).push(note);
        break;
      }
      case "repository": {
        const repo: Record<string, string> = {};
        const urlArg = ann.args.find(
          (a) =>
            (isNamedAnnotationArg(a) && a.key === "url") ||
            isPositionalAnnotationArg(a),
        );
        if (urlArg) repo.url = String(getAnnotationArgValue(urlArg));
        const langArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "language",
        ) as NamedAnnotationArg | undefined;
        if (langArg) repo.language = String(getAnnotationArgValue(langArg));
        result.repository = repo;
        break;
      }
      case "externalId": {
        const idArg = ann.args.find((a) => isPositionalAnnotationArg(a));
        if (idArg) result.externalId = String(getAnnotationArgValue(idArg));
        break;
      }
      case "specification":
      case "specifications": {
        if (!result.specifications) result.specifications = [];
        const spec: Record<string, string> = {};
        const typeArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "type",
        ) as NamedAnnotationArg | undefined;
        if (typeArg) spec.type = String(getAnnotationArgValue(typeArg));
        const pathArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "path",
        ) as NamedAnnotationArg | undefined;
        if (pathArg) spec.path = String(getAnnotationArgValue(pathArg));
        const titleArg = ann.args.find(
          (a) => isNamedAnnotationArg(a) && a.key === "title",
        ) as NamedAnnotationArg | undefined;
        if (titleArg) spec.title = String(getAnnotationArgValue(titleArg));
        const urlArg = ann.args.find(
          (a) =>
            (isNamedAnnotationArg(a) && a.key === "url") ||
            isPositionalAnnotationArg(a),
        );
        if (urlArg && !spec.path)
          spec.url = String(getAnnotationArgValue(urlArg));
        (result.specifications as Record<string, string>[]).push(spec);
        break;
      }
      case "sidebar": {
        const sidebar: Record<string, unknown> = {};
        for (const arg of ann.args) {
          if (isNamedAnnotationArg(arg))
            sidebar[arg.key] = getAnnotationArgValue(arg);
        }
        if (ann.block) {
          for (const item of ann.block) {
            if (isKeyValueAnnotationBlockItem(item)) {
              sidebar[item.key] = item.value;
            }
          }
        }
        result.sidebar = sidebar;
        break;
      }
      case "styles": {
        const styles: Record<string, unknown> = {};
        for (const arg of ann.args) {
          if (isNamedAnnotationArg(arg))
            styles[arg.key] = getAnnotationArgValue(arg);
        }
        result.styles = styles;
        break;
      }
      default: {
        if (ann.args.length === 1 && isPositionalAnnotationArg(ann.args[0])) {
          result[ann.name] = getAnnotationArgValue(ann.args[0]);
        } else if (ann.args.length > 0) {
          const obj: Record<string, unknown> = {};
          for (const arg of ann.args) {
            if (isNamedAnnotationArg(arg))
              obj[arg.key] = getAnnotationArgValue(arg);
          }
          result[ann.name] = obj;
        }
        break;
      }
    }
  }

  return result;
}

function commonFrontmatter(
  id: string,
  body: AstNode[],
): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    id,
    name: getName(body) || id,
  };
  const version = getVersion(body);
  if (version) fm.version = version;
  const owners = getOwners(body);
  if (owners.length > 0) {
    fm.owners = owners;
  }
  const schema = getSchema(body);
  if (schema) fm.schemaPath = schema;
  const deprecated = getDeprecated(body);
  if (deprecated) fm.deprecated = deprecated;
  const draft = getDraft(body);
  if (draft) fm.draft = draft;

  const annFields = mapAnnotations(getAnnotations(body));
  Object.assign(fm, annFields);

  return fm;
}

function makeOutput(
  path: string,
  fm: Record<string, unknown>,
  body?: string,
): CompiledOutput {
  const frontmatter = buildFrontmatter(fm);
  const content = body ? `${frontmatter}\n${body}\n` : `${frontmatter}\n`;
  return { path, content };
}

// Build a versioned output path: "<folder>/<name>/versioned/<version>/index.md"
// Falls back to "<folder>/<name>/index.md" when no version is present.
function versionedPath(folder: string, name: string, body: AstNode[]): string {
  const version = getVersion(body);
  if (version) return `${folder}/${name}/versioned/${version}/index.md`;
  return `${folder}/${name}/index.md`;
}

// --- Resource compilers ---

function compileDomain(domain: DomainDef, outputs: CompiledOutput[]): void {
  const body = domain.body as AstNode[];
  const fm = commonFrontmatter(domain.name, body);
  const summary = getSummary(body);
  outputs.push(
    makeOutput(versionedPath("domains", domain.name, body), fm, summary),
  );

  for (const svc of getServices(body)) {
    compileService(svc, outputs);
    compileInlineMessages(svc, outputs);
  }

  for (const sub of getSubdomains(body)) {
    const subBody = sub.body as AstNode[];
    const subFm = commonFrontmatter(sub.name, subBody);
    const subSummary = getSummary(subBody);
    outputs.push(
      makeOutput(
        versionedPath(`domains/${domain.name}/domains`, sub.name, subBody),
        subFm,
        subSummary,
      ),
    );
    for (const svc of getServices(subBody)) {
      compileService(svc, outputs);
      compileInlineMessages(svc, outputs);
    }
  }
}

function compileService(svc: ServiceDef, outputs: CompiledOutput[]): void {
  const body = svc.body as AstNode[];
  const fm = commonFrontmatter(svc.name, body);
  const sends = getSends(body);
  if (sends.length > 0) {
    fm.sends = sends.map((s) => buildMessageRef(s));
  }
  const receives = getReceives(body);
  if (receives.length > 0) {
    fm.receives = receives.map((r) => buildMessageRef(r));
  }
  outputs.push(
    makeOutput(versionedPath("services", svc.name, body), fm, getSummary(body)),
  );
}

function buildMessageRef(
  clause: SendsStmt | ReceivesStmt,
): Record<string, unknown> {
  const ref: Record<string, unknown> = { id: clause.messageName };
  if (clause.version) ref.version = clause.version;
  // Check inline body for version
  if (clause.body.length > 0) {
    const inlineVersion = getVersion(clause.body as AstNode[]);
    if (inlineVersion) ref.version = inlineVersion;
  }
  return ref;
}

function compileInlineMessages(
  svc: ServiceDef,
  outputs: CompiledOutput[],
): void {
  const body = svc.body as AstNode[];
  const allClauses = [...getSends(body), ...getReceives(body)];
  for (const clause of allClauses) {
    if (clause.body.length > 0) {
      const inlineBody = clause.body as AstNode[];
      const msgType = clause.messageType;
      const folder =
        msgType === "event"
          ? "events"
          : msgType === "command"
            ? "commands"
            : "queries";
      const fm = commonFrontmatter(clause.messageName, inlineBody);
      outputs.push(
        makeOutput(
          versionedPath(folder, clause.messageName, inlineBody),
          fm,
          getSummary(inlineBody),
        ),
      );
    }
  }
}

function compileMessage(
  msg: EventDef | CommandDef | QueryDef,
  folder: string,
  outputs: CompiledOutput[],
): void {
  const body = msg.body as AstNode[];
  const fm = commonFrontmatter(msg.name, body);
  outputs.push(
    makeOutput(versionedPath(folder, msg.name, body), fm, getSummary(body)),
  );
}

function compileChannel(ch: ChannelDef, outputs: CompiledOutput[]): void {
  const body = ch.body as AstNode[];
  const fm = commonFrontmatter(ch.name, body);
  const address = getAddress(body);
  if (address) fm.address = address;
  const protocols = getProtocols(body);
  if (protocols.length > 0) fm.protocols = protocols;
  const params = getParameters(body);
  if (params.length > 0) {
    fm.parameters = params.map((p) => {
      const param: Record<string, unknown> = { name: p.name };
      for (const prop of p.props) {
        if (isParameterDescriptionProp(prop))
          param.description = stripQuotes(prop.value);
        if (isParameterDefaultProp(prop))
          param.default = stripQuotes(prop.value);
        if (isParameterEnumProp(prop))
          param.enum = prop.value.items.map(stripQuotes);
        if (isParameterExamplesProp(prop))
          param.examples = prop.value.items.map(stripQuotes);
      }
      return param;
    });
  }
  outputs.push(
    makeOutput(versionedPath("channels", ch.name, body), fm, getSummary(body)),
  );
}

function compileContainer(cont: ContainerDef, outputs: CompiledOutput[]): void {
  const body = cont.body as AstNode[];
  const fm = commonFrontmatter(cont.name, body);
  const ct = getContainerType(body);
  if (ct) fm.containerType = ct;
  const tech = getTechnology(body);
  if (tech) fm.technology = tech;
  const auth = getAuthoritative(body);
  if (auth !== undefined) fm.authoritative = auth;
  const am = getAccessMode(body);
  if (am) fm.accessMode = am;
  const cl = getClassification(body);
  if (cl) fm.classification = cl;
  const res = getResidency(body);
  if (res) fm.residency = res;
  const ret = getRetention(body);
  if (ret) fm.retention = ret;
  outputs.push(
    makeOutput(
      versionedPath("containers", cont.name, body),
      fm,
      getSummary(body),
    ),
  );
}

function compileDataProduct(
  dp: DataProductDef,
  outputs: CompiledOutput[],
): void {
  const body = dp.body as AstNode[];
  const fm = commonFrontmatter(dp.name, body);
  const inputs = getInputs(body);
  if (inputs.length > 0) {
    fm.inputs = inputs.map((inp) => ({
      id: inp.ref.name,
      version: inp.ref.version,
    }));
  }
  const outs = getOutputs(body);
  if (outs.length > 0) {
    fm.outputs = outs.map((out) => {
      const o: Record<string, unknown> = { id: out.name };
      if (out.contract) {
        o.contract = {
          path: stripQuotes(out.contract.path),
          name: stripQuotes(out.contract.contractName),
          ...(out.contract.contractType
            ? { type: stripQuotes(out.contract.contractType) }
            : {}),
        };
      }
      return o;
    });
  }
  outputs.push(
    makeOutput(
      versionedPath("data-products", dp.name, body),
      fm,
      getSummary(body),
    ),
  );
}

function compileFlow(flow: FlowDef, outputs: CompiledOutput[]): void {
  const body = flow.body as AstNode[];
  const fm = commonFrontmatter(flow.name, body);
  const entryChains = getFlowEntryChains(body);
  const whenBlocks = getFlowWhenBlocks(body);
  if (entryChains.length > 0 || whenBlocks.length > 0) {
    const steps = compileFlowBody(entryChains, whenBlocks);
    if (steps.length > 0) {
      fm.steps = steps;
    }
  }
  outputs.push(
    makeOutput(versionedPath("flows", flow.name, body), fm, getSummary(body)),
  );
}

function flowRefToStep(ref: FlowRef): Record<string, unknown> {
  return {
    id: ref.name,
    title: ref.label ? stripQuotes(ref.label) : ref.name,
  };
}

function ensureStep(
  stepMap: Map<string, Record<string, unknown>>,
  nextMap: Map<string, Array<{ id: string; label?: string }>>,
  ref: FlowRef,
): void {
  if (!stepMap.has(ref.name)) {
    stepMap.set(ref.name, flowRefToStep(ref));
  }
  if (!nextMap.has(ref.name)) {
    nextMap.set(ref.name, []);
  }
}

function addNext(
  nextMap: Map<string, Array<{ id: string; label?: string }>>,
  fromId: string,
  toId: string,
  label?: string,
): void {
  const nexts = nextMap.get(fromId)!;
  if (!nexts.some((n) => n.id === toId && n.label === label)) {
    nexts.push({ id: toId, ...(label ? { label } : {}) });
  }
}

function compileFlowBody(
  entryChains: import("./generated/ast.js").FlowEntryChain[],
  whenBlocks: import("./generated/ast.js").FlowWhenBlock[],
): Record<string, unknown>[] {
  const stepMap = new Map<string, Record<string, unknown>>();
  const nextMap = new Map<string, Array<{ id: string; label?: string }>>();

  // Process entry chains (arrow sequences without 'when')
  for (const chain of entryChains) {
    const allRefs = [...chain.sources, ...chain.targets];
    for (const ref of allRefs) {
      ensureStep(stepMap, nextMap, ref);
    }
    const firstTarget = chain.targets[0];
    if (firstTarget) {
      for (const src of chain.sources) {
        addNext(nextMap, src.name, firstTarget.name);
      }
    }
    for (let i = 0; i < chain.targets.length - 1; i++) {
      addNext(nextMap, chain.targets[i].name, chain.targets[i + 1].name);
    }
  }

  // Process when blocks
  for (const block of whenBlocks) {
    // Ensure trigger refs exist
    for (const trigger of block.triggers) {
      ensureStep(stepMap, nextMap, trigger);
    }

    // Process each action in the when block
    for (const action of block.actions) {
      ensureStep(stepMap, nextMap, action.ref);

      // Triggers connect to each action
      for (const trigger of block.triggers) {
        addNext(nextMap, trigger.name, action.ref.name);
      }

      // Action outputs (labeled or unlabeled)
      for (const output of action.outputs) {
        ensureStep(stepMap, nextMap, output.target);
        addNext(
          nextMap,
          action.ref.name,
          output.target.name,
          output.label ? stripQuotes(output.label) : undefined,
        );
      }
    }
  }

  // Build final steps array
  const steps: Record<string, unknown>[] = [];
  for (const [, step] of stepMap) {
    const id = step.id as string;
    const nexts = nextMap.get(id) || [];
    if (nexts.length === 1 && !nexts[0].label) {
      step.next_step = { id: nexts[0].id };
    } else if (nexts.length > 0) {
      step.next_steps = nexts;
    }
    steps.push(step);
  }
  return steps;
}

function compileDiagram(diag: DiagramDef, outputs: CompiledOutput[]): void {
  const body = diag.body as AstNode[];
  const fm = commonFrontmatter(diag.name, body);
  outputs.push(
    makeOutput(
      versionedPath("diagrams", diag.name, body),
      fm,
      getSummary(body),
    ),
  );
}

function compileUser(user: UserDef, outputs: CompiledOutput[]): void {
  const fm: Record<string, unknown> = {
    id: user.name,
    name: user.name,
  };
  const annotations: Annotation[] = [];
  for (const prop of user.props) {
    switch (prop.$type) {
      case "UserNameProp":
        fm.name = stripQuotes(prop.value);
        break;
      case "UserAvatarProp":
        fm.avatar = stripQuotes(prop.value);
        break;
      case "UserRoleProp":
        fm.role = stripQuotes(prop.value);
        break;
      case "UserEmailProp":
        fm.email = stripQuotes(prop.value);
        break;
      case "UserSlackProp":
        fm.slack = stripQuotes(prop.value);
        break;
      case "UserMsTeamsProp":
        fm.msTeams = stripQuotes(prop.value);
        break;
      case "UserAnnotationProp":
        annotations.push(prop.annotation);
        break;
    }
  }
  const annFields = mapAnnotations(annotations);
  Object.assign(fm, annFields);
  outputs.push(makeOutput(`users/${user.name}.md`, fm));
}

function compileTeam(team: TeamDef, outputs: CompiledOutput[]): void {
  const fm: Record<string, unknown> = {
    id: team.name,
    name: team.name,
  };
  let summary: string | undefined;
  const members: string[] = [];
  const owns: { type: string; id: string }[] = [];
  const annotations: Annotation[] = [];

  for (const prop of team.props) {
    switch (prop.$type) {
      case "TeamNameProp":
        fm.name = stripQuotes(prop.value);
        break;
      case "TeamSummaryProp":
        summary = stripQuotes(prop.value);
        fm.summary = summary;
        break;
      case "TeamEmailProp":
        fm.email = stripQuotes(prop.value);
        break;
      case "TeamSlackProp":
        fm.slack = stripQuotes(prop.value);
        break;
      case "TeamMsTeamsProp":
        fm.msTeams = stripQuotes(prop.value);
        break;
      case "TeamMemberProp":
        members.push(prop.memberRef);
        break;
      case "TeamOwnsProp":
        owns.push({ type: prop.owns.resourceType, id: prop.owns.resourceName });
        break;
      case "TeamAnnotationProp":
        annotations.push(prop.annotation);
        break;
    }
  }
  if (members.length > 0) fm.members = members;
  if (owns.length > 0) fm.owns = owns;

  const annFields = mapAnnotations(annotations);
  Object.assign(fm, annFields);
  outputs.push(makeOutput(`teams/${team.name}.md`, fm, summary));
}

function compileVisualizer(
  viz: VisualizerDef,
  outputs: CompiledOutput[],
): void {
  // Visualizer wrapper does NOT produce its own markdown.
  // Inline definitions inside it compile normally.
  for (const item of viz.body) {
    if (isDomainDef(item)) {
      compileDomain(item, outputs);
      continue;
    }
    if (isServiceDef(item)) {
      compileService(item, outputs);
      compileInlineMessages(item, outputs);
      continue;
    }
    if (isEventDef(item) && item.body.length > 0) {
      compileMessage(item, "events", outputs);
      continue;
    }
    if (isCommandDef(item) && item.body.length > 0) {
      compileMessage(item, "commands", outputs);
      continue;
    }
    if (isQueryDef(item) && item.body.length > 0) {
      compileMessage(item, "queries", outputs);
      continue;
    }
    if (isChannelDef(item)) {
      compileChannel(item, outputs);
      continue;
    }
    if (isContainerDef(item)) {
      compileContainer(item, outputs);
      continue;
    }
    if (isDataProductDef(item)) {
      compileDataProduct(item, outputs);
      continue;
    }
    if (isFlowDef(item)) {
      compileFlow(item, outputs);
      continue;
    }
  }
}
