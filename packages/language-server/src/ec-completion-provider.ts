import { DefaultCompletionProvider } from "langium/lsp";
import type { LangiumServices } from "langium/lsp";
import type { MaybePromise, LangiumDocument } from "langium";
import { GrammarAST } from "langium";
import {
  CompletionItemKind,
  CompletionList,
  InsertTextFormat,
} from "vscode-languageserver";
import type {
  CompletionParams,
  CancellationToken,
} from "vscode-languageserver";
import type {
  CompletionAcceptor,
  CompletionContext,
  CompletionProviderOptions,
} from "langium/lsp";
import type { NextFeature } from "langium/lsp";
import { isSpecFile } from "./resolvers/resolve.js";
import { isCatalogPath } from "./resolvers/types.js";
import {
  parseCatalogResources,
  parseCatalogChannels,
  parseCatalogServices,
} from "./resolvers/catalog.js";
import {
  collectRegexMatches,
  extractResourceVersions,
  extractResourceNamesFromText,
  parseSpecAuto,
  findEnclosingResource,
  collectChannelNames,
  collectMessageNames,
} from "./completion-utils.js";
import type { ParsedSpecResult } from "./completion-utils.js";
import {
  RESOURCE_KEYWORDS,
  ANNOTATION_SUGGESTIONS,
  CONTEXT_SUGGESTIONS,
  MESSAGE_TYPE_PLURAL,
} from "./completion-data.js";
import type { Suggestion } from "./completion-data.js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Build a lookup from keyword label → Suggestion for resource snippets */
const RESOURCE_SUGGESTION_MAP = new Map<string, Suggestion>(
  RESOURCE_KEYWORDS.map((r) => [r.label, r]),
);

// ─── Per-request workspace snapshot ──────────────────────
// Computed lazily on first access per completion request, then reused.

interface WorkspaceSnapshot {
  allText?: string;
  parsedSpecs?: Map<string, ParsedSpecResult>;
  dirListing?: { dir: string; files: string[]; dirs: string[] };
}

// ─── Completion provider ─────────────────────────────────

export class EcCompletionProvider extends DefaultCompletionProvider {
  override readonly completionOptions: CompletionProviderOptions = {
    triggerCharacters: ["@", '"', "{"],
  };

  private langiumServices: LangiumServices;

  /** Snapshot for the current completion request. Reset on each `completionFor` call. */
  private snapshot: WorkspaceSnapshot = {};

  constructor(services: LangiumServices) {
    super(services);
    this.langiumServices = services;
  }

  override async getCompletion(
    document: LangiumDocument,
    params: CompletionParams,
    cancelToken?: CancellationToken,
  ): Promise<CompletionList | undefined> {
    // Reset per-request cache
    this.snapshot = {};

    // Let Langium handle grammar-driven completions first
    const result = await super.getCompletion(document, params, cancelToken);

    // If Langium produced results, return them (tryDynamicCompletion was called via completionFor)
    if (result && result.items.length > 0) {
      return result;
    }

    // Langium's parser couldn't determine next features (common for deeply nested resources).
    // Provide context-aware completions as a fallback.
    const textDocument = document.textDocument;
    const offset = textDocument.offsetAt(params.position);
    const textBefore = textDocument.getText().substring(0, offset);
    const enclosing = findEnclosingResource(textBefore);

    if (!enclosing) {
      return result;
    }

    const suggestions = CONTEXT_SUGGESTIONS[enclosing];
    if (!suggestions || suggestions.length === 0) {
      return result;
    }

    const fallbackItems = suggestions.map((s) => ({
      label: s.label,
      kind: CompletionItemKind.Snippet,
      detail: s.detail,
      insertText: s.insertText,
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: "1" + s.label,
    }));

    const existingItems = result?.items ?? [];
    return CompletionList.create([...existingItems, ...fallbackItems], true);
  }

  protected override async completionFor(
    context: CompletionContext,
    next: NextFeature,
    acceptor: CompletionAcceptor,
  ): Promise<void> {
    // When completing after '@', offer annotation snippets
    if (this.isAnnotationNameContext(context, next)) {
      this.completeAnnotationNames(context, acceptor);
      return;
    }
    // Try dynamic cross-file completions before grammar-driven ones
    if (await this.tryDynamicCompletion(context, acceptor)) {
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

    // Skip '@' itself — we handle annotation names in completionFor
    if (kw === "@") {
      return;
    }

    // Determine what resource block the cursor is inside (if any)
    const text = context.textDocument.getText();
    const textBefore = text.substring(0, context.offset);
    const enclosing = findEnclosingResource(textBefore);

    // Inside a non-visualizer resource block: only show context-appropriate items
    if (enclosing && enclosing !== "visualizer") {
      const suggestions = CONTEXT_SUGGESTIONS[enclosing];
      if (suggestions) {
        const match = suggestions.find((s) => s.label === kw);
        if (match) {
          acceptor(context, {
            label: kw,
            kind: CompletionItemKind.Snippet,
            detail: match.detail,
            insertText: match.insertText,
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: "0" + kw,
          });
        }
      }
      // Don't show resource keywords or unrelated keywords inside resource blocks
      return;
    }

    // At top level or inside a visualizer: offer resource keyword snippets
    const resourceSuggestion = RESOURCE_SUGGESTION_MAP.get(kw);
    if (resourceSuggestion) {
      acceptor(context, {
        label: kw,
        kind: CompletionItemKind.Snippet,
        detail: resourceSuggestion.detail,
        insertText: resourceSuggestion.insertText,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: "0" + kw,
      });
      return;
    }

    // Inside a visualizer: also check visualizer-specific context suggestions
    if (enclosing === "visualizer") {
      const suggestions = CONTEXT_SUGGESTIONS[enclosing];
      if (suggestions) {
        const match = suggestions.find((s) => s.label === kw);
        if (match) {
          acceptor(context, {
            label: kw,
            kind: CompletionItemKind.Snippet,
            detail: match.detail,
            insertText: match.insertText,
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: "0" + kw,
          });
          return;
        }
      }
    }

    // Fallback: plain keyword
    acceptor(context, {
      label: kw,
      kind: CompletionItemKind.Keyword,
    });
  }

  // ─── Dynamic cross-file completions ──────────────────

  private async tryDynamicCompletion(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
  ): Promise<boolean> {
    const text = context.textDocument.getText();
    const offset = context.offset;

    // Get the current line text before cursor
    const textBefore = text.substring(0, offset);
    const lastNewline = textBefore.lastIndexOf("\n");
    const lineText = textBefore.substring(lastNewline + 1);

    // 1. Import file paths: from "..."
    if (lineText.includes("import")) {
      const importFromMatch = lineText.match(
        /import\s+(?:(?:events|commands|queries|channels|services)\s+)?\{[^}]*\}\s*from\s*"([^"]*)$/,
      );
      if (importFromMatch) {
        this.completeImportPaths(context, acceptor);
        return true;
      }

      // 2. Resource names in import braces: import { ... }
      const importBracesMatch = lineText.match(
        /import\s+(?:(events|commands|queries|channels|services|containers)\s+)?\{([^}]*)$/,
      );
      if (importBracesMatch) {
        const fullLineContent = this.getFullLineContent(text, offset);
        await this.completeImportNames(
          context,
          acceptor,
          importBracesMatch[1] as
            | "events"
            | "commands"
            | "queries"
            | "channels"
            | "containers"
            | undefined,
          importBracesMatch[2] || "",
          fullLineContent,
        );
        return true;
      }
    }

    if (lineText.includes("sends") || lineText.includes("receives")) {
      // 3. Channel names: sends event X to ...
      const channelRefMatch = lineText.match(
        /\b(?:sends|receives)\s+(?:event|command|query)\s+[a-zA-Z_][a-zA-Z0-9_.\-]*(?:@[\d]+\.[\d]+\.[\d]+[a-zA-Z0-9_.\-]*)?\s+(?:to|from)\s+(?:.*,\s*)?([a-zA-Z_][a-zA-Z0-9_.\-]*)?$/,
      );
      if (channelRefMatch) {
        this.completeChannelNames(context, acceptor);
        return true;
      }

      // 4. Message names: sends event ...
      const sendsReceivesMatch = lineText.match(
        /\b(?:sends|receives)\s+(event|command|query)\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)?$/,
      );
      if (sendsReceivesMatch && !sendsReceivesMatch[0].endsWith("@")) {
        this.completeMessageNames(context, acceptor, sendsReceivesMatch[1]);
        return true;
      }

      // 5. Version after @: sends event Name@
      const atMatch = lineText.match(
        /\b(?:sends|receives)\s+(event|command|query)\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)@$/,
      );
      if (atMatch) {
        this.completeVersions(context, acceptor, atMatch[1], atMatch[2]);
        return true;
      }
    }

    // 6. Context-aware completions for the enclosing resource block
    // Offer all suggestions for the current context — this ensures items like
    // sends, receives, writes-to, reads-from, and scaffold snippets are always
    // available, even when Langium's grammar analysis doesn't offer them.
    const enclosing = findEnclosingResource(textBefore);
    if (enclosing) {
      const suggestions = CONTEXT_SUGGESTIONS[enclosing];
      if (suggestions) {
        for (const s of suggestions) {
          acceptor(context, {
            label: s.label,
            kind: CompletionItemKind.Snippet,
            detail: s.detail,
            insertText: s.insertText,
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: "1" + s.label,
          });
        }
      }
    }

    return false;
  }

  // ─── Lazy per-request helpers ─────────────────────────

  private getAllWorkspaceText(): string {
    if (this.snapshot.allText !== undefined) return this.snapshot.allText;
    const docs = this.langiumServices.shared.workspace.LangiumDocuments.all;
    this.snapshot.allText = docs
      .filter((d) => d.uri.path.endsWith(".ec"))
      .map((d) => d.textDocument.getText())
      .toArray()
      .join("\n");
    return this.snapshot.allText;
  }

  private getFullLineContent(text: string, offset: number): string {
    const start = text.lastIndexOf("\n", offset - 1) + 1;
    let end = text.indexOf("\n", offset);
    if (end === -1) end = text.length;
    return text.substring(start, end);
  }

  private getDocumentDir(uri: string): string {
    return dirname(fileURLToPath(uri));
  }

  /**
   * Read the workspace directory listing once per request.
   * Returns files (spec + .ec), directories, and the base dir.
   */
  private getDirListing(currentUri: string): {
    dir: string;
    files: string[];
    dirs: string[];
  } {
    if (this.snapshot.dirListing) return this.snapshot.dirListing;
    try {
      const currentPath = fileURLToPath(currentUri);
      const dir = dirname(currentPath);
      const currentFilename = currentPath.substring(
        currentPath.lastIndexOf("/") + 1,
      );
      const files: string[] = [];
      const dirs: string[] = [];
      for (const entry of readdirSync(dir)) {
        if (entry === currentFilename) continue;
        if (entry.startsWith(".") || entry === "node_modules") continue;
        try {
          if (statSync(resolve(dir, entry)).isDirectory()) {
            dirs.push(entry);
          } else if (entry.endsWith(".ec") || isSpecFile(entry)) {
            files.push(entry);
          }
        } catch {
          // skip unreadable entries
        }
      }
      this.snapshot.dirListing = { dir, files, dirs };
      return this.snapshot.dirListing;
    } catch {
      this.snapshot.dirListing = { dir: "", files: [], dirs: [] };
      return this.snapshot.dirListing;
    }
  }

  private getWorkspaceFilenames(currentUri: string): string[] {
    const listing = this.getDirListing(currentUri);
    if (listing.files.length > 0) return listing.files;
    const docs = this.langiumServices.shared.workspace.LangiumDocuments.all;
    return docs
      .filter((d) => d.uri.toString() !== currentUri)
      .map((d) => {
        const p = d.uri.path;
        return p.substring(p.lastIndexOf("/") + 1);
      })
      .toArray();
  }

  private readSpecFile(
    specPath: string,
    currentDocUri: string,
  ): string | undefined {
    try {
      const dir = this.getDocumentDir(currentDocUri);
      const normalizedPath = specPath.replace(/^\.\//, "");
      const fullPath = resolve(dir, normalizedPath);
      return readFileSync(fullPath, "utf-8");
    } catch {
      return undefined;
    }
  }

  private parseWorkspaceSpecs(
    currentDocUri: string,
  ): Map<string, ParsedSpecResult> {
    if (this.snapshot.parsedSpecs) return this.snapshot.parsedSpecs;
    const parsed = new Map<string, ParsedSpecResult>();
    const listing = this.getDirListing(currentDocUri);

    for (const filename of listing.files) {
      if (!isSpecFile(filename)) continue;
      try {
        const content = readFileSync(resolve(listing.dir, filename), "utf-8");
        parsed.set(filename, parseSpecAuto(content));
      } catch {
        // skip unreadable or invalid files
      }
    }
    this.snapshot.parsedSpecs = parsed;
    return parsed;
  }

  // 1. Complete import file paths
  private completeImportPaths(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
  ): void {
    const filenames = this.getWorkspaceFilenames(context.textDocument.uri);
    for (const filename of filenames) {
      acceptor(context, {
        label: `./${filename}`,
        kind: CompletionItemKind.File,
        detail: `Import from ${filename}`,
        insertText: `./${filename}`,
        sortText: `0${filename}`,
      });
    }

    // Also suggest directories as potential catalog imports
    const listing = this.getDirListing(context.textDocument.uri);
    for (const dirName of listing.dirs) {
      acceptor(context, {
        label: `./${dirName}`,
        kind: CompletionItemKind.Folder,
        detail: `Import from catalog directory ${dirName}`,
        insertText: `./${dirName}`,
        sortText: `1${dirName}`,
      });
    }
  }

  // 2. Complete resource names inside import { ... }
  private async completeImportNames(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
    resourceKind:
      | "events"
      | "commands"
      | "queries"
      | "channels"
      | "services"
      | "containers"
      | undefined,
    alreadyTyped: string,
    fullLineContent: string,
  ): Promise<void> {
    const alreadyImported = new Set(
      alreadyTyped
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

    const fromSpecMatch = fullLineContent.match(
      /from\s*"([^"]+\.(?:ya?ml|json))"/,
    );
    if (resourceKind && fromSpecMatch) {
      const specContent = this.readSpecFile(
        fromSpecMatch[1],
        context.textDocument.uri,
      );

      if (specContent) {
        try {
          const parsed = parseSpecAuto(specContent);
          const catalog =
            resourceKind === "channels" ? parsed.channels : parsed.messages;
          for (const [name, resource] of catalog) {
            if (!alreadyImported.has(name)) {
              acceptor(context, {
                label: name,
                kind: CompletionItemKind.Field,
                detail: resource.summary || `Import from ${fromSpecMatch[1]}`,
                insertText: name,
                sortText: `0${name}`,
              });
            }
          }
          return;
        } catch {
          // Fall through to generic suggestions
        }
      }
    }

    // Catalog directory imports: import events { ... } from "./my-catalog"
    const fromCatalogMatch = fullLineContent.match(/from\s*"([^"]+)"/);
    if (
      resourceKind &&
      fromCatalogMatch &&
      isCatalogPath(fromCatalogMatch[1])
    ) {
      await this.completeCatalogImportNames(
        context,
        acceptor,
        resourceKind,
        fromCatalogMatch[1],
        alreadyImported,
      );
      return;
    }

    // .ec file imports: only suggest resources defined in the target file
    const fromEcMatch = fullLineContent.match(/from\s*"([^"]+\.ec)"/);
    if (fromEcMatch) {
      const ecContent = this.readSpecFile(
        fromEcMatch[1],
        context.textDocument.uri,
      );
      if (ecContent) {
        const names = extractResourceNamesFromText(ecContent);
        for (const name of names) {
          if (!alreadyImported.has(name)) {
            acceptor(context, {
              label: name,
              kind: CompletionItemKind.Class,
              detail: `Import from ${fromEcMatch[1]}`,
              insertText: name,
              sortText: `0${name}`,
            });
          }
        }
        return;
      }
    }

    // Fallback: suggest resource names from all workspace .ec files
    const allText = this.getAllWorkspaceText();
    const resources = extractResourceNamesFromText(allText);

    for (const name of resources) {
      if (!alreadyImported.has(name)) {
        acceptor(context, {
          label: name,
          kind: CompletionItemKind.Class,
          detail: "Resource to import",
          insertText: name,
          sortText: `0${name}`,
        });
      }
    }
  }

  // 2b. Complete resource names from a catalog directory import
  private async completeCatalogImportNames(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
    resourceKind:
      | "events"
      | "commands"
      | "queries"
      | "channels"
      | "services"
      | "containers",
    catalogPath: string,
    alreadyImported: Set<string>,
  ): Promise<void> {
    try {
      const dir = this.getDocumentDir(context.textDocument.uri);
      const catalogDir = resolve(dir, catalogPath);

      if (resourceKind === "services") {
        const { services } = await parseCatalogServices(catalogDir);
        for (const [name, svc] of services) {
          if (!alreadyImported.has(name)) {
            acceptor(context, {
              label: name,
              kind: CompletionItemKind.Class,
              detail: svc.summary || `Import from catalog ${catalogPath}`,
              insertText: name,
              sortText: `0${name}`,
            });
          }
        }
        return;
      }

      if (resourceKind === "channels") {
        const { channels } = await parseCatalogChannels(catalogDir);
        for (const [name, ch] of channels) {
          if (!alreadyImported.has(name)) {
            acceptor(context, {
              label: name,
              kind: CompletionItemKind.Field,
              detail: ch.summary || `Import from catalog ${catalogPath}`,
              insertText: name,
              sortText: `0${name}`,
            });
          }
        }
        return;
      }

      const { messages } = await parseCatalogResources(
        catalogDir,
        resourceKind,
      );

      for (const [name, resource] of messages) {
        if (!alreadyImported.has(name)) {
          acceptor(context, {
            label: name,
            kind: CompletionItemKind.Field,
            detail: resource.summary || `Import from catalog ${catalogPath}`,
            insertText: name,
            sortText: `0${name}`,
          });
        }
      }
    } catch {
      // Silently ignore errors in completions
    }
  }

  // 3. Complete channel names
  private completeChannelNames(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
  ): void {
    const allText = this.getAllWorkspaceText();
    const channels = collectChannelNames(allText);

    const parsedSpecs = this.parseWorkspaceSpecs(context.textDocument.uri);
    const channelSummaries = new Map<string, string>();
    for (const [, parsed] of parsedSpecs) {
      for (const [name, resource] of parsed.channels) {
        channels.add(name);
        if (resource.summary) channelSummaries.set(name, resource.summary);
      }
    }

    for (const name of channels) {
      acceptor(context, {
        label: name,
        kind: CompletionItemKind.Field,
        detail: channelSummaries.get(name) || `channel ${name}`,
        insertText: name,
        sortText: `0${name}`,
      });
    }
  }

  // 4. Complete message names (event/command/query)
  private completeMessageNames(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
    msgType: string,
  ): void {
    const pluralType = MESSAGE_TYPE_PLURAL[msgType] || "events";
    const allText = this.getAllWorkspaceText();
    const names = collectMessageNames(allText, msgType, pluralType);

    const parsedSpecs = this.parseWorkspaceSpecs(context.textDocument.uri);
    const msgSummaries = new Map<string, string>();
    for (const [, parsed] of parsedSpecs) {
      for (const [name, resource] of parsed.messages) {
        names.add(name);
        if (resource.summary) msgSummaries.set(name, resource.summary);
      }
    }

    for (const name of names) {
      acceptor(context, {
        label: name,
        kind: CompletionItemKind.Field,
        detail: msgSummaries.get(name) || `${msgType} ${name}`,
        insertText: name,
        sortText: `0${name}`,
      });
    }
  }

  // 5. Complete versions after @
  private completeVersions(
    context: CompletionContext,
    acceptor: CompletionAcceptor,
    msgType: string,
    resourceName: string,
  ): void {
    const allText = this.getAllWorkspaceText();
    const key = `${msgType}:${resourceName}`;
    const versions = extractResourceVersions(allText, msgType).get(key) || [];

    for (const ver of versions) {
      acceptor(context, {
        label: ver,
        kind: CompletionItemKind.Value,
        detail: `Version ${ver} of ${resourceName}`,
        insertText: ver,
        sortText: `0${ver}`,
      });
    }
  }

  // ─── Annotation completions ────────────────────────────

  private isAnnotationNameContext(
    context: CompletionContext,
    next: NextFeature,
  ): boolean {
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
    for (const annotation of ANNOTATION_SUGGESTIONS) {
      acceptor(context, {
        label: annotation.label,
        kind: CompletionItemKind.Snippet,
        detail: annotation.detail,
        insertText: annotation.insertText,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: "0" + annotation.label,
      });
    }
  }
}
