import { DefaultCompletionProvider } from "langium/lsp";
import type { LangiumServices } from "langium/lsp";
import type { MaybePromise } from "langium";
import { GrammarAST } from "langium";
import { CompletionItemKind, InsertTextFormat } from "vscode-languageserver";
import type {
  CompletionAcceptor,
  CompletionContext,
  CompletionProviderOptions,
  CompletionValueItem,
} from "langium/lsp";
import type { NextFeature } from "langium/lsp";

const RESOURCE_KEYWORDS = new Map<string, string>([
  ["domain", "Top-level bounded context"],
  ["service", "Microservice or application"],
  ["event", "Domain event"],
  ["command", "Command message"],
  ["query", "Query message"],
  ["channel", "Communication channel"],
  ["container", "Data container (database, cache, etc.)"],
  ["data-product", "Analytical data product"],
  ["flow", "Process flow definition"],
  ["diagram", "Architecture diagram"],
  ["user", "User definition"],
  ["team", "Team definition"],
  ["visualizer", "Visualizer view"],
  ["actor", "Human actor (for flows)"],
  ["external-system", "External system (for flows)"],
]);

const PROPERTY_KEYWORDS = new Map<string, string>([
  ["version", "Semantic version (e.g. 1.0.0)"],
  ["name", "Display name"],
  ["summary", "Short description"],
  ["owner", "Owner reference (e.g. team-name)"],
  ["schema", "Schema file path"],
  ["draft", "Mark resource as draft"],
  ["deprecated", "Mark resource as deprecated"],
  ["address", "Channel address or topic"],
  ["protocol", "Channel protocol (e.g. kafka, http)"],
  ["technology", "Technology or implementation"],
  ["residency", "Data residency region"],
  ["retention", "Data retention policy"],
  ["authoritative", "Authoritative data source"],
  ["classification", "Data classification level"],
  ["access-mode", "Data access pattern (read, write, etc.)"],
  ["container-type", "Type of container (database, cache, etc.)"],
  ["legend", "Show/hide legend in visualizer"],
  ["search", "Show/hide search in visualizer"],
  ["toolbar", "Show/hide toolbar in visualizer"],
  ["focus-mode", "Enable/disable focus mode in visualizer"],
  ["animated", "Simulate message flow animation in visualizer"],
]);

const RELATIONSHIP_KEYWORDS = new Map<string, string>([
  ["sends", "Service sends a message"],
  ["receives", "Service receives a message"],
  ["writes-to", "Service writes to a container"],
  ["reads-from", "Service reads from a container"],
  ["to", "Target channel"],
  ["from", "Source channel"],
]);

const BLOCK_KEYWORDS = new Map<string, string>([
  ["subdomain", "Nested subdomain"],
  ["parameter", "Channel parameter"],
  ["->", "Flow arrow"],
  ["when", "Flow when-block trigger"],
  ["and", "Convergence (multiple triggers)"],
  ["input", "Data product input"],
  ["output", "Data product output"],
  ["route", "Route to another channel"],
  ["contract", "Output contract definition"],
]);

const KNOWN_ANNOTATIONS = [
  { name: "badge", description: "Add a visual badge to the resource" },
  { name: "note", description: "Add a developer note or reminder" },
  { name: "repository", description: "Link to a source code repository" },
  { name: "specifications", description: "Add specification links" },
  { name: "externalId", description: "Set an external identifier" },
  { name: "tag", description: "Add a tag to the resource" },
];

/** Snippet templates for resource types that benefit from scaffolding */
const RESOURCE_SNIPPETS: Record<string, { label: string; snippet: string }> = {
  service: {
    label: "service (block)",
    snippet:
      'service ${1:ServiceName} {\n  version ${2:0.0.1}\n  summary "${3:Service that manages and processes $1 operations}"\n  $0\n}',
  },
  event: {
    label: "event (block)",
    snippet:
      'event ${1:EventName} {\n  version ${2:0.0.1}\n  summary "${3:Triggered when a significant change occurs in the domain}"\n  $0\n}',
  },
  command: {
    label: "command (block)",
    snippet:
      'command ${1:CommandName} {\n  version ${2:0.0.1}\n  summary "${3:Requests an action to be performed in the system}"\n  $0\n}',
  },
  query: {
    label: "query (block)",
    snippet:
      'query ${1:QueryName} {\n  version ${2:0.0.1}\n  summary "${3:Retrieves data from the system without side effects}"\n  $0\n}',
  },
  domain: {
    label: "domain (block)",
    snippet:
      'domain ${1:DomainName} {\n  version ${2:0.0.1}\n  summary "${3:Bounded context responsible for $1}"\n  $0\n}',
  },
  container: {
    label: "container (block)",
    snippet:
      'container ${1:ContainerName} {\n  version ${2:0.0.1}\n  summary "${3:Data store that persists and manages $1 data}"\n  $0\n}',
  },
  visualizer: {
    label: "visualizer (block)",
    snippet: 'visualizer ${1:main} {\n  name "${2:View Name}"\n  $0\n}',
  },
  actor: {
    label: "actor (block)",
    snippet:
      'actor ${1:ActorName} {\n  name "${2:Display Name}"\n  summary "${3:User or persona that interacts with the system}"\n}',
  },
  "external-system": {
    label: "external-system (block)",
    snippet:
      'external-system ${1:SystemName} {\n  name "${2:Display Name}"\n  summary "${3:Third-party system that integrates with the platform}"\n}',
  },
};

function getKeywordInfo(
  keyword: string,
): { category: string; description: string } | undefined {
  const resourceDesc = RESOURCE_KEYWORDS.get(keyword);
  if (resourceDesc) return { category: "Resource", description: resourceDesc };
  const propDesc = PROPERTY_KEYWORDS.get(keyword);
  if (propDesc) return { category: "Property", description: propDesc };
  const relDesc = RELATIONSHIP_KEYWORDS.get(keyword);
  if (relDesc) return { category: "Relationship", description: relDesc };
  const blockDesc = BLOCK_KEYWORDS.get(keyword);
  if (blockDesc) return { category: "Block", description: blockDesc };
  return undefined;
}

export class EcCompletionProvider extends DefaultCompletionProvider {
  override readonly completionOptions: CompletionProviderOptions = {
    triggerCharacters: ["@"],
  };

  constructor(services: LangiumServices) {
    super(services);
  }

  protected override completionFor(
    context: CompletionContext,
    next: NextFeature,
    acceptor: CompletionAcceptor,
  ): MaybePromise<void> {
    // When completing after '@', offer known annotation names
    if (this.isAnnotationNameContext(context, next)) {
      this.completeAnnotationNames(context, acceptor);
      return;
    }
    return super.completionFor(context, next, acceptor);
  }

  protected override completionForKeyword(
    context: CompletionContext,
    keyword: GrammarAST.Keyword,
    acceptor: CompletionAcceptor,
  ): MaybePromise<void> {
    const kw = keyword.value;

    // Skip '@' itself as a completion — we handle annotation names in completionFor
    if (kw === "@") {
      return;
    }

    const info = getKeywordInfo(kw);
    const item: CompletionValueItem = {
      label: kw,
      kind: CompletionItemKind.Keyword,
      ...(info
        ? { detail: info.category, documentation: info.description }
        : {}),
      sortText: info?.category === "Resource" ? "0" + kw : undefined,
    };
    acceptor(context, item);

    // Also offer a snippet variant for resource keywords
    const snippet = RESOURCE_SNIPPETS[kw];
    if (snippet) {
      acceptor(context, {
        label: snippet.label,
        kind: CompletionItemKind.Snippet,
        detail: "Resource (snippet)",
        insertText: snippet.snippet,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: "1" + kw,
      });
    }
  }

  private isAnnotationNameContext(
    context: CompletionContext,
    next: NextFeature,
  ): boolean {
    // Check if the next expected feature is the AnnotationName rule call
    const feature = next.feature;
    if ("rule" in feature && "$type" in feature) {
      const ruleCall = feature as {
        $type: string;
        rule: { ref?: { name?: string } };
      };
      if (
        ruleCall.$type === "RuleCall" &&
        ruleCall.rule.ref?.name === "AnnotationName"
      ) {
        return true;
      }
    }

    // Also detect if we just typed '@' by checking the text before cursor
    const text = context.textDocument.getText();
    const beforeCursor = text.substring(
      Math.max(0, context.offset - 1),
      context.offset,
    );
    if (beforeCursor === "@") {
      return true;
    }

    return false;
  }

  private completeAnnotationNames(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
  ): void {
    for (const annotation of KNOWN_ANNOTATIONS) {
      acceptor(context, {
        label: annotation.name,
        kind: CompletionItemKind.Property,
        detail: "Annotation",
        documentation: annotation.description,
        sortText: "0" + annotation.name,
      });
    }
  }
}
