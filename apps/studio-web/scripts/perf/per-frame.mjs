#!/usr/bin/env node
// Reads measure.mjs's scenario lines (stdin) and prints renders per frame by component, most first
import fs from 'node:fs';

for (const line of fs.readFileSync(0, 'utf8').split('\n').filter((l) => l.startsWith('{'))) {
  const result = JSON.parse(line);
  console.log(`${result.scenario}: ${result.frames} frames, ${result.renders} renders (${(result.renders / result.frames).toFixed(1)} a frame), ${result.commits} commits, JS ${result.jsMs} ms, main thread ${result.taskMs} ms`);
  for (const entry of (result.top ?? '').split(', ').filter(Boolean)) {
    const at = entry.lastIndexOf(' ');
    const perFrame = Number(entry.slice(at + 1)) / result.frames;
    if (perFrame >= 0.5) console.log(`  ${perFrame.toFixed(1).padStart(5)}  ${entry.slice(0, at)}`);
  }
}
