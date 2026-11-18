/**
 * Runs the assistant evals against a catalog running in dev mode (`pnpm run start:catalog`), with whichever model its
 * eventcatalog.chat.js uses. See README.md.
 *
 *   pnpm run eval:chat -- --url http://localhost:3000 [--case <id>] [--trials 3] [--label name] [--compare results/<file>.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { cases, type EvalCase, type Expectation } from './cases.ts';

// The assistant's step limit (MAX_STEPS in eventcatalog/src/features/ai/chat-loop.ts)
const MAX_STEPS = 10;
const RESULTS_DIR = path.join(import.meta.dirname, 'results');

const { values: args } = parseArgs({
  // pnpm passes on the `--` in `pnpm run eval:chat -- --url ...`
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    url: { type: 'string', default: 'http://localhost:3000' },
    case: { type: 'string', multiple: true },
    trials: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '3' },
    label: { type: 'string' },
    compare: { type: 'string' },
    rescore: { type: 'string' },
  },
});

const baseUrl = args.url.replace(/\/$/, '');

type Usage = {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};
type Stats = { model: string; steps: number; fallback: boolean; usage: Usage };

type TrialResult = {
  caseId: string;
  group: string;
  trial: number;
  passed: boolean;
  answered: boolean;
  recall: number;
  missing: string[];
  brokenLinks: string[];
  /** Mermaid diagrams in the answer, and why each that doesn't parse fails */
  diagrams: number;
  invalidDiagrams: string[];
  missingDiagram: boolean;
  error?: string;
  stats?: Stats;
  toolCalls: string[];
  toolOutputChars: number;
  timeToFirstTextMs?: number;
  totalMs: number;
  answer: string;
};

type GroupSummary = { trials: number; passed: number; avgSteps: number; avgInputTokens: number };

type Summary = {
  model?: string;
  /** By case group, e.g. to see whether a new tool helped the questions it's for */
  groups: Record<string, GroupSummary>;
  /** Calls to each tool, by the group of the case that made them: a tool should be used for its group's questions */
  toolCalls: Record<string, Record<string, number>>;
  trials: number;
  passed: number;
  passRate: number;
  /** Cases that passed every trial */
  casesPassedEveryTrial: number;
  emptyAnswers: number;
  errors: number;
  fallbacks: number;
  stepLimitReached: number;
  brokenLinks: number;
  answersWithDiagrams: number;
  invalidDiagrams: number;
  /** Cases that expect a diagram and got none */
  missingDiagrams: number;
  /** Diagrams where one isn't needed: output tokens spent for nothing */
  unneededDiagrams: number;
  avgSteps: number;
  avgToolCalls: number;
  avgToolOutputChars: number;
  avgInputTokens: number;
  /** Share of input tokens read from the provider's cache */
  cachedShare: number;
  avgOutputTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  medianMs: number;
  medianTimeToFirstTextMs: number;
};

// --- Asking -------------------------------------------------------------------------------------------------------

/** Asks the catalog's assistant, as the chat panel does, and reads its streamed answer */
async function ask(evalCase: EvalCase) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', referer: `${baseUrl}${evalCase.page ?? '/'}` },
    body: JSON.stringify({
      messages: evalCase.messages.map((message, index) => ({
        id: `message-${index}`,
        role: message.role,
        parts: [{ type: 'text', text: message.text }],
      })),
    }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`The assistant answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  let answer = '';
  let timeToFirstTextMs: number | undefined;
  let stats: Stats | undefined;
  let error: string | undefined;
  const toolCalls: string[] = [];
  let toolOutputChars = 0;

  const read = (line: string) => {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') return;
    const chunk = JSON.parse(line.slice('data: '.length));
    if (chunk.type === 'text-delta') {
      timeToFirstTextMs ??= performance.now() - started;
      answer += chunk.delta;
    } else if (chunk.type === 'tool-input-available') toolCalls.push(chunk.toolName);
    else if (chunk.type === 'tool-output-available') toolOutputChars += JSON.stringify(chunk.output ?? null).length;
    else if (chunk.type === 'error') error = chunk.errorText;
    else if (chunk.type === 'finish' && chunk.messageMetadata) stats = chunk.messageMetadata;
  };

  const decoder = new TextDecoder();
  let buffered = '';
  for await (const bytes of response.body) {
    buffered += decoder.decode(bytes, { stream: true });
    const lines = buffered.split('\n');
    buffered = lines.pop() ?? '';
    lines.forEach(read);
  }
  read(buffered);

  return { answer, timeToFirstTextMs, totalMs: performance.now() - started, stats, error, toolCalls, toolOutputChars };
}

// --- Checking -----------------------------------------------------------------------------------------------------

const spaced = (value: string) => value.toLowerCase().replace(/[-_]+/g, ' ');
const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** A resource counts as mentioned by its link, its id, or its name ("order-created", "Order Created", "OrderCreated") */
const mentions = (answer: string, expectation: Expectation) => {
  if ('text' in expectation) return expectation.text.test(answer);
  const id = expectation.resource.split('/')[1];
  return spaced(answer).includes(spaced(id)) || compact(answer).includes(compact(id));
};

const describeExpectation = (expectation: Expectation) => ('text' in expectation ? expectation.label : expectation.resource);

const linkChecks = new Map<string, Promise<boolean>>();

/** Whether a link in an answer opens a page in the catalog (cached: answers link to the same pages) */
const linkWorks = (link: string) => {
  const pagePath = link.split(/[?#]/)[0];
  if (!linkChecks.has(pagePath)) {
    linkChecks.set(
      pagePath,
      fetch(`${baseUrl}${pagePath}`, { redirect: 'follow' })
        .then((response) => response.ok)
        .catch(() => false)
    );
  }
  return linkChecks.get(pagePath)!;
};

let mermaid: typeof import('mermaid').default | undefined;

/** Why a Mermaid diagram doesn't render, or undefined when it does (Mermaid's own parser, in a jsdom window) */
async function diagramError(code: string) {
  if (!mermaid) {
    // @ts-expect-error -- jsdom has no types here (core doesn't install @types/jsdom)
    const { JSDOM } = await import('jsdom');
    const { window } = new JSDOM('');
    Object.assign(globalThis, { window, document: window.document });
    mermaid = (await import('mermaid')).default;
  }
  try {
    await mermaid.parse(code);
    return undefined;
  } catch (error) {
    return (error instanceof Error ? error.message : String(error)).split('\n')[0];
  }
}

const diagramsIn = (answer: string) => [...answer.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map((match) => match[1]);

const linksIn = (answer: string) =>
  [...answer.matchAll(/\]\((\/(?:docs|visualiser|architecture)\/[^)\s]*)\)/g)].map((match) => match[1]);

async function check(evalCase: EvalCase, trial: number): Promise<TrialResult> {
  const result: TrialResult = {
    caseId: evalCase.id,
    group: evalCase.group ?? 'core',
    trial,
    passed: false,
    answered: false,
    recall: 0,
    missing: [],
    brokenLinks: [],
    diagrams: 0,
    invalidDiagrams: [],
    missingDiagram: false,
    toolCalls: [],
    toolOutputChars: 0,
    totalMs: 0,
    answer: '',
  };
  try {
    const asked = await ask(evalCase);
    Object.assign(result, asked);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
  return score(evalCase, result);
}

/** Checks an answer against its case (also used to re-check saved answers when a case changes) */
async function score(evalCase: EvalCase, result: TrialResult): Promise<TrialResult> {
  if (result.error) return result;
  result.answered = result.answer.trim().length > 0;
  const expectations = evalCase.expect ?? [];
  result.missing = expectations.filter((expectation) => !mentions(result.answer, expectation)).map(describeExpectation);
  result.recall = expectations.length === 0 ? 1 : (expectations.length - result.missing.length) / expectations.length;

  const links = [...new Set(linksIn(result.answer))];
  const working = await Promise.all(links.map(linkWorks));
  result.brokenLinks = links.filter((link, index) => !working[index] || /\/latest(\/|$)/.test(link));

  const diagrams = diagramsIn(result.answer);
  const errors = await Promise.all(diagrams.map(diagramError));
  result.diagrams = diagrams.length;
  result.invalidDiagrams = errors.filter((error): error is string => !!error);
  result.missingDiagram = evalCase.diagram === 'expected' && diagrams.length === result.invalidDiagrams.length;

  result.passed =
    !result.error &&
    result.answered &&
    result.recall >= (evalCase.minRecall ?? 1) &&
    result.brokenLinks.length === 0 &&
    result.invalidDiagrams.length === 0 &&
    !result.missingDiagram;
  return result;
}

// --- Reporting ----------------------------------------------------------------------------------------------------

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const average = (values: number[]) => (values.length === 0 ? 0 : sum(values) / values.length);
const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function summarise(results: TrialResult[]): Summary {
  // Costs and times are of the answers that ran: a failed request costs nothing, which isn't an improvement
  const ran = results.filter((result) => !result.error);
  const withStats = ran.filter((result) => result.stats);
  const usage = (key: keyof Usage) => withStats.map((result) => result.stats!.usage[key]);
  const inputTokens = sum(usage('inputTokens'));
  const byCase = Map.groupBy(results, (result) => result.caseId);
  const groups = Object.fromEntries(
    [...Map.groupBy(results, (result) => result.group)].map(([group, trials]) => [
      group,
      {
        trials: trials.length,
        passed: trials.filter((result) => result.passed).length,
        avgSteps: average(trials.flatMap((result) => result.stats?.steps ?? [])),
        avgInputTokens: average(trials.flatMap((result) => result.stats?.usage.inputTokens ?? [])),
      },
    ])
  );
  const toolCalls: Summary['toolCalls'] = {};
  for (const result of results) {
    for (const tool of result.toolCalls) {
      toolCalls[tool] ??= {};
      toolCalls[tool][result.group] = (toolCalls[tool][result.group] ?? 0) + 1;
    }
  }
  return {
    model: withStats[0]?.stats?.model,
    groups,
    toolCalls,
    trials: results.length,
    passed: results.filter((result) => result.passed).length,
    passRate: results.filter((result) => result.passed).length / results.length,
    casesPassedEveryTrial: [...byCase.values()].filter((trials) => trials.every((result) => result.passed)).length,
    emptyAnswers: results.filter((result) => !result.error && !result.answered).length,
    errors: results.filter((result) => result.error).length,
    fallbacks: withStats.filter((result) => result.stats!.fallback).length,
    stepLimitReached: withStats.filter((result) => result.stats!.steps >= MAX_STEPS).length,
    brokenLinks: sum(results.map((result) => result.brokenLinks.length)),
    answersWithDiagrams: ran.filter((result) => result.diagrams > 0).length,
    invalidDiagrams: sum(ran.map((result) => result.invalidDiagrams?.length ?? 0)),
    missingDiagrams: ran.filter((result) => result.missingDiagram).length,
    unneededDiagrams: ran.filter(
      (result) => result.diagrams > 0 && cases.find((evalCase) => evalCase.id === result.caseId)?.diagram === 'unneeded'
    ).length,
    avgSteps: average(withStats.map((result) => result.stats!.steps)),
    avgToolCalls: average(ran.map((result) => result.toolCalls.length)),
    avgToolOutputChars: average(ran.map((result) => result.toolOutputChars)),
    avgInputTokens: average(usage('inputTokens')),
    cachedShare: inputTokens ? sum(usage('cacheReadTokens')) / inputTokens : 0,
    avgOutputTokens: average(usage('outputTokens')),
    totalInputTokens: inputTokens,
    totalOutputTokens: sum(usage('outputTokens')),
    medianMs: median(ran.map((result) => result.totalMs)),
    medianTimeToFirstTextMs: median(ran.flatMap((result) => result.timeToFirstTextMs ?? [])),
  };
}

const round = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function printResults(results: TrialResult[]) {
  console.log(
    '\n' +
      [
        'case'.padEnd(30),
        'pass'.padEnd(5),
        'recall'.padStart(6),
        'steps'.padStart(6),
        'tools'.padStart(6),
        'in tok'.padStart(8),
        'cached'.padStart(8),
        'out tok'.padStart(8),
        'time'.padStart(7),
      ].join(' ')
  );
  for (const result of results) {
    const usage = result.stats?.usage;
    console.log(
      [
        `${result.caseId}${result.trial > 1 ? ` #${result.trial}` : ''}`.padEnd(30),
        (result.passed ? 'yes' : 'NO').padEnd(5),
        `${Math.round(result.recall * 100)}%`.padStart(6),
        `${result.stats?.steps ?? '?'}${result.stats?.fallback ? '+f' : ''}`.padStart(6),
        String(result.toolCalls.length).padStart(6),
        String(usage?.inputTokens ?? '?').padStart(8),
        String(usage?.cacheReadTokens ?? '?').padStart(8),
        String(usage?.outputTokens ?? '?').padStart(8),
        seconds(result.totalMs).padStart(7),
      ].join(' ')
    );
    if (result.error) console.log(`    error: ${result.error}`);
    else if (!result.answered) console.log('    no answer');
    if (result.missing.length) console.log(`    missing: ${result.missing.join(', ')}`);
    if (result.brokenLinks.length) console.log(`    broken links: ${result.brokenLinks.join(', ')}`);
    if (result.invalidDiagrams?.length) console.log(`    invalid diagrams: ${result.invalidDiagrams.join(' | ')}`);
    if (result.missingDiagram) console.log('    no diagram');
  }
}

const SUMMARY_ROWS: [keyof Summary, string, 'higher' | 'lower'][] = [
  ['passRate', 'pass rate', 'higher'],
  ['emptyAnswers', 'empty answers', 'lower'],
  ['errors', 'errors', 'lower'],
  ['brokenLinks', 'broken links', 'lower'],
  ['answersWithDiagrams', 'answers with a diagram', 'higher'],
  ['missingDiagrams', 'missing diagrams', 'lower'],
  ['invalidDiagrams', 'invalid diagrams', 'lower'],
  ['unneededDiagrams', 'unneeded diagrams', 'lower'],
  ['stepLimitReached', 'reached the step limit', 'lower'],
  ['fallbacks', 'needed the fallback', 'lower'],
  ['avgSteps', 'model calls / answer', 'lower'],
  ['avgToolCalls', 'tool calls / answer', 'lower'],
  ['avgToolOutputChars', 'tool output chars / answer', 'lower'],
  ['avgInputTokens', 'input tokens / answer', 'lower'],
  ['cachedShare', 'of which cached', 'higher'],
  ['avgOutputTokens', 'output tokens / answer', 'lower'],
  ['medianMs', 'median time', 'lower'],
  ['medianTimeToFirstTextMs', 'median time to first text', 'lower'],
];

const formatValue = (key: keyof Summary, value: number) =>
  key === 'passRate' || key === 'cachedShare'
    ? `${Math.round(value * 100)}%`
    : key.endsWith('Ms')
      ? seconds(value)
      : round(value);

function printSummary(summary: Summary, previous?: { label: string; summary: Summary; results: TrialResult[] }) {
  console.log(`\nModel: ${summary.model ?? 'unknown (is the catalog running in dev mode?)'}`);
  console.log(`Passed ${summary.passed}/${summary.trials} (${summary.casesPassedEveryTrial} cases passed every trial)\n`);
  for (const [key, label, better] of SUMMARY_ROWS) {
    const value = summary[key] as number;
    let line = `  ${label.padEnd(28)} ${formatValue(key, value).padStart(9)}`;
    // A run from an older version of this script may not have every number
    const before = previous?.summary[key];
    if (typeof before === 'number') {
      const change = before === 0 ? (value === 0 ? 0 : Infinity) : (value - before) / before;
      const improved = better === 'lower' ? value < before : value > before;
      const sign = value === before ? '' : improved ? '  better' : '  worse';
      line += `   was ${formatValue(key, before).padStart(9)}${
        Number.isFinite(change) && change !== 0 ? ` (${change > 0 ? '+' : ''}${Math.round(change * 100)}%)` : ''
      }${sign}`;
    }
    console.log(line);
  }

  console.log(
    `\n  ${'by group'.padEnd(14)} ${'passed'.padStart(9)} ${'calls'.padStart(6)} ${'in tok'.padStart(8)}${previous ? '   was' : ''}`
  );
  for (const [group, now] of Object.entries(summary.groups)) {
    const before: GroupSummary | undefined = previous?.summary.groups?.[group];
    const row = (g: GroupSummary) =>
      `${`${g.passed}/${g.trials}`.padStart(9)} ${round(g.avgSteps).padStart(6)} ${String(Math.round(g.avgInputTokens)).padStart(8)}`;
    console.log(`  ${group.padEnd(14)} ${row(now)}${before ? `   ${row(before).trim()}` : ''}`);
  }

  console.log('\n  tool calls (by the group of the question)');
  for (const [tool, byGroup] of Object.entries(summary.toolCalls).sort(
    ([, a], [, b]) => sum(Object.values(b)) - sum(Object.values(a))
  )) {
    const groups = Object.entries(byGroup)
      .map(([group, count]) => `${group} ${count}`)
      .join(', ');
    console.log(`  ${tool.padEnd(40)} ${String(sum(Object.values(byGroup))).padStart(4)}  (${groups})`);
  }
}

// --- Running ------------------------------------------------------------------------------------------------------

async function runAll<T>(tasks: (() => Promise<T>)[], concurrency: number) {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (next < tasks.length) {
        const index = next++;
        results[index] = await tasks[index]();
      }
    })
  );
  return results;
}

/** An earlier run: a path from where the command was run (pnpm runs this from packages/core), or a name in results/ */
const findResults = (name: string) =>
  [
    path.resolve(process.env.INIT_CWD ?? process.cwd(), name),
    path.join(RESULTS_DIR, name),
    path.join(RESULTS_DIR, `${name}.json`),
  ].find((candidate) => fs.existsSync(candidate));

const selected = args.case?.length ? cases.filter((evalCase) => args.case!.includes(evalCase.id)) : cases;
if (selected.length === 0) {
  console.error(`No cases called ${args.case?.join(', ')}. Cases: ${cases.map((evalCase) => evalCase.id).join(', ')}`);
  process.exit(1);
}

// Checked first, so a catalog that isn't running, or has no model, doesn't fail every case (links are checked against it too)
const preflight = await fetch(`${baseUrl}/api/chat`).catch((error) => error as Error);
if (preflight instanceof Error || !preflight.ok) {
  const reason = preflight instanceof Error ? preflight.message : `${preflight.status} ${(await preflight.text()).slice(0, 300)}`;
  console.error(`The assistant at ${baseUrl}/api/chat isn't working: ${reason}`);
  console.error('Start the example catalog in dev mode with a model configured (see evals/chat/README.md).');
  process.exit(1);
}

let label: string;
let results: TrialResult[];

if (args.rescore) {
  // Saved answers checked against the cases as they are now, without asking the model again
  const rescoreFile = findResults(args.rescore);
  if (!rescoreFile) {
    console.error(`No results called ${args.rescore} to re-check`);
    process.exit(1);
  }
  const saved = JSON.parse(fs.readFileSync(rescoreFile, 'utf-8'));
  label = saved.label;
  results = await Promise.all(
    (saved.results as TrialResult[]).map((result) => {
      const evalCase = cases.find((candidate) => candidate.id === result.caseId);
      return evalCase ? score(evalCase, { ...result, group: evalCase.group ?? 'core' }) : result;
    })
  );
  console.log(`Re-checked ${results.length} saved answers from ${saved.label}`);
} else {
  const trials = Number(args.trials);
  console.log(`Asking ${baseUrl}: ${selected.length} cases x ${trials} trial(s)...`);
  const tasks = selected.flatMap((evalCase) =>
    Array.from({ length: trials }, (_, index) => async () => {
      const result = await check(evalCase, index + 1);
      process.stdout.write(result.passed ? '.' : 'x');
      return result;
    })
  );
  results = await runAll(tasks, Number(args.concurrency));
  label = args.label ?? new Date().toISOString().replace(/[:.]/g, '-');
  console.log();
}

const summary = summarise(results);
printResults(results);

// Saved before anything else can go wrong: the answers cost tokens
fs.mkdirSync(RESULTS_DIR, { recursive: true });
const file = path.join(RESULTS_DIR, `${label}.json`);
fs.writeFileSync(file, JSON.stringify({ label, url: baseUrl, at: new Date().toISOString(), summary, results }, null, 2));

const previousFile = args.compare ? findResults(args.compare) : undefined;
if (args.compare && !previousFile) console.error(`\nNo results called ${args.compare} to compare with`);
const previous = previousFile ? JSON.parse(fs.readFileSync(previousFile, 'utf-8')) : undefined;
if (previous) console.log(`\nCompared with ${previous.label} (${previous.summary.model ?? 'unknown model'})`);
printSummary(summary, previous);

if (previous) {
  for (const result of results) {
    const before = previous.results.find((other: TrialResult) => other.caseId === result.caseId && other.trial === result.trial);
    if (before && before.passed !== result.passed) {
      console.log(`  ${result.caseId}: ${result.passed ? 'now passes' : 'now FAILS'}`);
    }
  }
}

console.log(`\nSaved ${path.relative(process.env.INIT_CWD ?? process.cwd(), file)}`);

process.exitCode = summary.passed === summary.trials ? 0 : 1;
