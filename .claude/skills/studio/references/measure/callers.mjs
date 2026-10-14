#!/usr/bin/env node
// Who calls a function in a CPU profile (from `measure.mjs profile` with PROFILE_OUT=…): its self time by call stack.
// E.g. what calls querySelector or getBoundingClientRect on every frame.
//
//   node callers.mjs <file.cpuprofile> <function name> [stack depth, default 4]
//
// Inline scripts (Studio on the web's page is one) report lines from the top of the HTML: in its bundle the function
// is about 14 lines above the line shown (find it with `grep -n "function Name" dist/view.html`).
import fs from 'node:fs';

const [file, name, depth = 4] = process.argv.slice(2);
if (!file || !name) throw new Error('Usage: node callers.mjs <file.cpuprofile> <function name> [depth]');
const profile = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(profile.nodes.map((node) => [node.id, node]));
const parent = new Map();
profile.nodes.forEach((node) => (node.children ?? []).forEach((child) => parent.set(child, node.id)));
const sampled = new Map();
profile.samples.forEach((id, i) => sampled.set(id, (sampled.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
const frame = ({ functionName, url, lineNumber }) =>
  `${functionName || '(anonymous)'}@${url.split('/').pop().split('?')[0]}:${lineNumber + 1}`;

const stacks = new Map();
for (const [id, micros] of sampled) {
  if (byId.get(id).callFrame.functionName !== name) continue;
  const chain = [];
  for (let at = parent.get(id); at && chain.length < Number(depth); at = parent.get(at))
    chain.push(frame(byId.get(at).callFrame));
  const key = chain.join(' < ');
  stacks.set(key, (stacks.get(key) ?? 0) + micros);
}
[...stacks]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([stack, micros]) => console.log(`${(micros / 1000).toFixed(1).padStart(7)} ms  ${stack}`));
