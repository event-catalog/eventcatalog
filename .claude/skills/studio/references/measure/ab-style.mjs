#!/usr/bin/env node
// A/B a CSS change in one tab, in the same session (machine load changes numbers between runs, so alternate rather
// than compare with another day): runs a scenario from page-counters.js with the CSS off, then on, `rounds` times.
// The tab needs page-counters.js loaded (run `measure.mjs scenarios <tab> idle` first, which reloads it with them).
//
//   CSS='.studio-live-cursor { will-change: transform }' node ab-style.mjs <tab> <scenario> [rounds, default 2]
//
// For an idle tab (e.g. others' cursors moving), use the `idle` scenario.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [urlPart, scenario, rounds = '2'] = process.argv.slice(2);
const css = process.env.CSS;
if (!urlPart || !scenario || !css) throw new Error("Usage: CSS='…' node ab-style.mjs <tab> <scenario> [rounds]");
const [port, browserPath] = fs
  .readFileSync(path.join(os.homedir(), 'Library/Application Support/Google/Chrome/DevToolsActivePort'), 'utf8')
  .split('\n');
const socket = new WebSocket(process.env.CDP_URL ?? `ws://127.0.0.1:${port}${browserPath}`);
let id = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    pending.set(++id, resolve);
    socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
  });
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  pending.get(message.id)?.(message.result);
});
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));

const { targetInfos } = await send('Target.getTargets');
const target = targetInfos.find((info) => info.type === 'page' && info.url.includes(urlPart));
if (!target) throw new Error(`No tab with "${urlPart}"`);
const { sessionId } = await send('Target.attachToTarget', {
  targetId: target.targetId,
  flatten: true,
});
await send('Performance.enable', { timeDomain: 'threadTicks' }, sessionId);
await send('Page.bringToFront', {}, sessionId);
const metrics = async () =>
  Object.fromEntries((await send('Performance.getMetrics', {}, sessionId)).metrics.map(({ name, value }) => [name, value]));

for (let round = 0; round < Number(rounds); round++) {
  for (const on of [false, true]) {
    await send(
      'Runtime.evaluate',
      {
        expression: `(() => { document.getElementById('__ab')?.remove(); if (${on}) { const s = document.createElement('style'); s.id = '__ab'; s.textContent = ${JSON.stringify(css)}; document.head.append(s); } })()`,
      },
      sessionId
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    const before = await metrics();
    const { result } = await send(
      'Runtime.evaluate',
      {
        expression: `window.__scenarios.${scenario}()`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId
    );
    const after = await metrics();
    const ms = (name) => Math.round((after[name] - before[name]) * 1000);
    const { frames, renders, jsMs } = result.value ?? {};
    console.log(
      JSON.stringify({
        css: on,
        frames,
        renders,
        jsMs,
        taskMs: ms('TaskDuration'),
        styleMs: ms('RecalcStyleDuration'),
        layoutMs: ms('LayoutDuration'),
      })
    );
  }
}
await send('Runtime.evaluate', { expression: "document.getElementById('__ab')?.remove()" }, sessionId);
socket.close();
