import { parseDocument, isMap, isSeq, isScalar, isPair, Node, Pair, YAMLMap, YAMLSeq } from 'yaml';
import { ParsedFile } from '../parser';
import { ValidationError } from '../types';

/**
 * Maps validation findings to line/column positions in the source file.
 *
 * Findings carry a `field` path such as `sends[0].to[1].id`. The frontmatter block is parsed
 * with `yaml` (which keeps source ranges on every node) and the path is walked to find the
 * exact key or value. Files are parsed lazily and only when they have findings.
 */

export interface SourceLocation {
  /** 1-based line in the file */
  line: number;
  /** 1-based column in the file */
  column: number;
}

export interface FrontmatterBlock {
  /** Raw YAML between the fences */
  text: string;
  /** 1-based line number of the first YAML line */
  startLine: number;
  /** 1-based line number of the first line after the closing fence */
  bodyStartLine: number;
}

const FENCE = /^---\s*$/;

/** Locates the frontmatter block in a raw file. Returns undefined when there is no frontmatter. */
export const getFrontmatterBlock = (raw: string): FrontmatterBlock | undefined => {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.length === 0 || !FENCE.test(lines[0])) return undefined;

  const closingIndex = lines.findIndex((line, index) => index > 0 && FENCE.test(line));
  if (closingIndex === -1) return undefined;

  return {
    text: lines.slice(1, closingIndex).join('\n'),
    startLine: 2,
    bodyStartLine: closingIndex + 2,
  };
};

/** Splits `sends[0].to[1].id` into `['sends', 0, 'to', 1, 'id']`. */
export const parseFieldPath = (field: string): (string | number)[] => {
  const tokens: (string | number)[] = [];
  const pattern = /([^.[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(field)) !== null) {
    if (match[2] !== undefined) {
      tokens.push(Number(match[2]));
    } else {
      tokens.push(/^\d+$/.test(match[1]) ? Number(match[1]) : match[1]);
    }
  }
  return tokens;
};

const buildLineStarts = (text: string): number[] => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return starts;
};

const offsetToLocation = (offset: number, lineStarts: number[], startLine: number): SourceLocation => {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lineStarts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return { line: startLine + low, column: offset - lineStarts[low] + 1 };
};

export type Anchor = 'key' | 'value';

/** Which part of a `key: value` pair each rule should point at. Everything else points at the value. */
const KEY_ANCHORED_RULES = new Set([
  'schema/unknown-field',
  'schema/unknown-nested-field',
  'best-practices/summary-required',
  'best-practices/owner-required',
  'best-practices/schema-required',
  'schema/required-fields',
  'schema/valid-type',
]);

export const getAnchorForRule = (rule?: string): Anchor => (rule && KEY_ANCHORED_RULES.has(rule) ? 'key' : 'value');

interface DocumentIndex {
  root: Node | null;
  lineStarts: number[];
  block: FrontmatterBlock;
}

const buildDocumentIndex = (raw: string): DocumentIndex | undefined => {
  const block = getFrontmatterBlock(raw);
  if (!block) return undefined;
  const doc = parseDocument(block.text, { keepSourceTokens: false });
  return { root: doc.contents as Node | null, lineStarts: buildLineStarts(block.text), block };
};

const findPair = (map: YAMLMap, key: string | number): Pair | undefined =>
  map.items.find((item) => isPair(item) && isScalar(item.key) && String(item.key.value) === String(key)) as Pair | undefined;

const nodeStart = (node: unknown): number | undefined => {
  const range = (node as { range?: [number, number, number] })?.range;
  return range ? range[0] : undefined;
};

/**
 * Walks the field path through the document. Returns the node at the end of the path, the pair
 * it belongs to, and the last pair that could be resolved when the path runs out early.
 */
const walkPath = (root: Node | null, tokens: (string | number)[]) => {
  let node: unknown = root;
  let pair: Pair | undefined;
  let lastResolvedPair: Pair | undefined;

  for (const token of tokens) {
    if (isMap(node)) {
      const next = findPair(node as YAMLMap, token);
      if (!next) return { node: undefined, pair: undefined, lastResolvedPair };
      pair = next;
      lastResolvedPair = next;
      node = next.value;
    } else if (isSeq(node) && typeof token === 'number') {
      const item = (node as YAMLSeq).items[token];
      if (item === undefined) return { node: undefined, pair: undefined, lastResolvedPair };
      node = item;
      pair = undefined;
    } else {
      return { node: undefined, pair: undefined, lastResolvedPair };
    }
  }

  return { node, pair, lastResolvedPair };
};

/**
 * Finds the position of a frontmatter field. Falls back to the nearest resolvable ancestor,
 * then to the first frontmatter line, so a location is always returned for files with frontmatter.
 */
export const locateField = (
  raw: string,
  field: string | undefined,
  anchor: Anchor = 'value',
  index: DocumentIndex | undefined = buildDocumentIndex(raw)
): SourceLocation | undefined => {
  if (!index) return undefined;
  const { root, lineStarts, block } = index;
  const toLocation = (offset: number | undefined): SourceLocation | undefined =>
    offset === undefined ? undefined : offsetToLocation(offset, lineStarts, block.startLine);

  if (!field) return { line: block.startLine, column: 1 };

  const { node, pair, lastResolvedPair } = walkPath(root, parseFieldPath(field));

  if (node !== undefined) {
    if (anchor === 'key' && pair) return toLocation(nodeStart(pair.key)) ?? { line: block.startLine, column: 1 };
    if (isScalar(node)) return toLocation(nodeStart(node)) ?? { line: block.startLine, column: 1 };
    // Collections: point at their key when we have one (block collections start on the next line)
    if (pair) return toLocation(nodeStart(pair.key)) ?? { line: block.startLine, column: 1 };
    return toLocation(nodeStart(node)) ?? { line: block.startLine, column: 1 };
  }

  // Path ran out (e.g. a missing field): anchor to the closest ancestor we did find
  if (lastResolvedPair) return toLocation(nodeStart(lastResolvedPair.key)) ?? { line: block.startLine, column: 1 };

  return { line: block.startLine, column: 1 };
};

/** Position of the first line after the frontmatter (used for body-content findings). */
export const locateBody = (raw: string): SourceLocation | undefined => {
  const block = getFrontmatterBlock(raw);
  return block ? { line: block.bodyStartLine, column: 1 } : undefined;
};

/** Best-effort position for a YAML parse error, by re-parsing the frontmatter with `yaml`. */
export const locateParseError = (raw: string): SourceLocation | undefined => {
  const block = getFrontmatterBlock(raw);
  if (!block) return { line: 1, column: 1 };
  const doc = parseDocument(block.text);
  const first = doc.errors[0];
  if (!first?.linePos?.[0]) return { line: block.startLine, column: 1 };
  return { line: block.startLine + first.linePos[0].line - 1, column: first.linePos[0].col };
};

/** Rules whose findings are about the markdown body rather than the frontmatter. */
const BODY_RULES = new Set(['best-practices/description-required']);

/**
 * Attaches `line`/`column` to every finding that belongs to a parsed file.
 * Findings for files that were not parsed (e.g. unrecognised files) default to line 1.
 */
export const attachLocations = (errors: ValidationError[], parsedFiles: ParsedFile[]): ValidationError[] => {
  const rawByFile = new Map(parsedFiles.map((parsedFile) => [parsedFile.file.relativePath, parsedFile.raw]));
  const indexCache = new Map<string, DocumentIndex | undefined>();

  const getIndex = (file: string): DocumentIndex | undefined => {
    if (!indexCache.has(file)) {
      const raw = rawByFile.get(file);
      indexCache.set(file, raw === undefined ? undefined : buildDocumentIndex(raw));
    }
    return indexCache.get(file);
  };

  return errors.map((error) => {
    if (error.line !== undefined) return error;

    const raw = rawByFile.get(error.file);
    if (raw === undefined) return { ...error, line: 1, column: 1 };

    const location =
      error.rule && BODY_RULES.has(error.rule)
        ? locateBody(raw)
        : locateField(raw, error.field, getAnchorForRule(error.rule), getIndex(error.file));

    return location ? { ...error, ...location } : { ...error, line: 1, column: 1 };
  });
};
