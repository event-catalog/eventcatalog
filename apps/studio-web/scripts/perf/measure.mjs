#!/usr/bin/env node
// Measures one tab of a running Chrome over CDP (attached to that tab only, so a browser in use isn't traced).
// Node 22+ (built-in WebSocket). See ../verification.md.
//
//   node measure.mjs scenarios <tab> [idle,mouse,pan,drag]   renders, JS and main-thread time per scenario
//   node measure.mjs idle <tab>                              main-thread time doing nothing, and what's animating
//   node measure.mjs heap <tab> [rounds]                     heap after GC across rounds of dragging and panning
//   node measure.mjs load <tab> [runs]                       when the first node shows on opening, and long tasks
//   node measure.mjs profile <tab> [scenario]                where the JS time goes (self time by function) for 3
//                                                            seconds, idle or during a scenario; PROFILE_OUT=x.cpuprofile
//                                                            keeps it (callers.mjs: who calls a function in it)
//
// <tab> is part of an open tab's URL, or a full URL (opened if no tab has it). Chrome is found from its
// DevToolsActivePort file (remote debugging on in chrome://inspect/#remote-debugging), or CDP_PORT for a Chrome
// started with --remote-debugging-port.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [command, tab, option] = process.argv.slice(2);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browserUrl = async () => {
  if (process.env.CDP_PORT) {
    const version = await fetch(`http://127.0.0.1:${process.env.CDP_PORT}/json/version`).then((res) => res.json());
    return version.webSocketDebuggerUrl;
  }
  const file = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/DevToolsActivePort');
  const [port, browserPath] = fs.readFileSync(file, 'utf8').split('\n');
  return `ws://127.0.0.1:${port}${browserPath}`;
};

const connect = async () => {
  const socket = new WebSocket(await browserUrl());
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Chrome refused the connection (allow it in Chrome?)')));
    setTimeout(() => reject(new Error('Timed out connecting to Chrome (is it asking to allow remote debugging?)')), 15000);
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const waiting = message.id && pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.error) waiting.reject(new Error(message.error.message));
    else waiting.resolve(message.result);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    });
  return { send, close: () => socket.close() };
};

const attach = async (browser, urlPart) => {
  const { targetInfos } = await browser.send('Target.getTargets');
  let target = targetInfos.find((info) => info.type === 'page' && info.url.includes(urlPart));
  if (!target && /^https?:/.test(urlPart)) {
    target = await browser.send('Target.createTarget', { url: urlPart });
    await wait(3000);
  }
  if (!target) throw new Error(`No tab with "${urlPart}"`);
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed');
    return result.result.value;
  };
  await send('Performance.enable', { timeDomain: 'threadTicks' });
  // Background tabs don't draw frames: measure the tab in front
  await send('Page.bringToFront');
  return { send, evaluate };
};

// Main-thread time while `run` runs: all of it (tasks), and the parts in style, layout and script
const timing = async (page, run) => {
  const read = async () =>
    Object.fromEntries((await page.send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]));
  const before = await read();
  const result = await run();
  const after = await read();
  const ms = (name) => Math.round((after[name] - before[name]) * 1000);
  return {
    ...result,
    taskMs: ms('TaskDuration'),
    styleMs: ms('RecalcStyleDuration'),
    layoutMs: ms('LayoutDuration'),
    scriptMs: ms('ScriptDuration'),
  };
};

// Reloads with page-counters.js in the page, and waits for a canvas
const reloadMeasured = async (page) => {
  await page.send('Page.enable');
  const source = fs.readFileSync(new URL('./page-counters.js', import.meta.url), 'utf8');
  const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source });
  await page.send('Page.reload');
  await wait(1500);
  for (let tries = 0; tries < 60; tries++) {
    try {
      if (await page.evaluate("!!document.querySelector('.react-flow__node') && !!window.__scenarios")) break;
    } catch {
      // Still loading
    }
    await wait(500);
  }
  await wait(2500);
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
};

const ANIMATIONS = `(() => {
  const running = {};
  for (const animation of document.getAnimations()) {
    if (animation.playState !== 'running') continue;
    const target = animation.effect?.target;
    const where = target ? target.tagName.toLowerCase() + [...target.classList].slice(0, 2).map((name) => '.' + name).join('') : '?';
    const key = (animation.animationName || animation.transitionProperty || 'animation') + ' on ' + where + (animation.effect?.pseudoElement ?? '');
    running[key] = (running[key] ?? 0) + 1;
  }
  return { css: running, smil: document.querySelectorAll('animate, animateMotion, animateTransform').length };
})()`;

const browser = await connect();
try {
  if (!tab) throw new Error('Usage: node measure.mjs <scenarios|idle|heap> <tab> [option]');
  const page = await attach(browser, tab);
  if (command === 'scenarios') {
    await reloadMeasured(page);
    for (const name of (option ?? 'idle,mouse,pan,drag').split(',')) {
      const { top, ...result } = await timing(page, () => page.evaluate(`window.__scenarios.${name}()`));
      console.log(
        JSON.stringify({
          scenario: name,
          ...result,
          top: top
            .slice(0, Number(process.env.TOP ?? 5))
            .map(([n, c]) => `${n} ${c}`)
            .join(', '),
        })
      );
    }
  } else if (command === 'load') {
    // Opening the page: when the first node shows, the main thread's work until then, and long tasks (median of 3)
    await page.send('Page.enable');
    const source = `(() => {
      window.__load = { longTasks: [], firstNodeAt: null };
      new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__load.longTasks.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true });
      const check = () => {
        if (document.querySelector('.react-flow__node')) window.__load.firstNodeAt = Math.round(performance.now());
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    })()`;
    const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source });
    const runs = [];
    for (let i = 0; i < Number(option ?? 3); i++) {
      const result = await timing(page, async () => {
        await page.send('Network.setCacheDisabled', { cacheDisabled: false });
        await page.send('Page.reload', { ignoreCache: false });
        await wait(500);
        for (let tries = 0; tries < 60; tries++) {
          try {
            if (await page.evaluate('!!(window.__load && window.__load.firstNodeAt)')) break;
          } catch {}
          await wait(250);
        }
        await wait(1500);
        const load = await page.evaluate('window.__load');
        const nav = await page.evaluate("(() => { const n = performance.getEntriesByType('navigation')[0]; return { responseEnd: Math.round(n.responseEnd), domContentLoaded: Math.round(n.domContentLoadedEventEnd) }; })()");
        return { ...nav, firstNodeAt: load.firstNodeAt, longTasks: load.longTasks.slice(0, 6), longTaskMs: load.longTasks.reduce((a, b) => a + b, 0) };
      });
      runs.push(result);
      console.log(JSON.stringify(result));
    }
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  } else if (command === 'profile') {
    // Where the page's JS time goes for 3 seconds (e.g. while others work on the canvas): self time by function,
    // from a sampling profile of this tab only (option: a scenario to run meanwhile, e.g. drag; default idle)
    await page.send('Profiler.enable');
    await page.send('Profiler.setSamplingInterval', { interval: 200 });
    await page.send('Profiler.start');
    await page.evaluate(option ? `window.__scenarios.${option}()` : 'new Promise((r) => setTimeout(r, 3000))');
    const { profile } = await page.send('Profiler.stop');
    // PROFILE_OUT=file.cpuprofile keeps it (opens in Chrome DevTools' Performance panel)
    if (process.env.PROFILE_OUT) fs.writeFileSync(process.env.PROFILE_OUT, JSON.stringify(profile));
    const byId = new Map(profile.nodes.map((node) => [node.id, node]));
    const sampled = new Map();
    profile.samples.forEach((id, i) => sampled.set(id, (sampled.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
    const self = new Map();
    let total = 0;
    for (const [id, micros] of sampled) {
      const { callFrame } = byId.get(id);
      if (['(idle)', '(program)'].includes(callFrame.functionName)) continue;
      const file = callFrame.url.split('/').pop()?.split('?')[0] || '';
      const key = `${callFrame.functionName || '(anonymous)'} ${file}:${callFrame.lineNumber + 1}`;
      self.set(key, (self.get(key) ?? 0) + micros);
      total += micros;
    }
    console.log(JSON.stringify({ busyMs: Math.round(total / 1000) }));
    [...self]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(process.env.TOP ?? 25))
      .forEach(([key, micros]) => console.log(`${(micros / 1000).toFixed(1).padStart(7)} ms  ${key}`));
  } else if (command === 'idle') {
    console.log(JSON.stringify(await timing(page, () => page.evaluate('new Promise((resolve) => setTimeout(resolve, 3000))'))));
    console.log(JSON.stringify({ animating: await page.evaluate(ANIMATIONS) }));
  } else if (command === 'heap') {
    await reloadMeasured(page);
    await page.send('HeapProfiler.enable');
    const heap = async () => {
      for (let i = 0; i < 3; i++) await page.send('HeapProfiler.collectGarbage');
      const { usedSize } = await page.send('Runtime.getHeapUsage');
      return {
        heapMB: +(usedSize / 1048576).toFixed(2),
        domNodes: await page.evaluate("document.getElementsByTagName('*').length"),
      };
    };
    console.log(JSON.stringify({ round: 'start', ...(await heap()) }));
    for (let round = 1; round <= Number(option ?? 4); round++) {
      await page.evaluate(
        // HEAP_SCENARIO=drag or pan runs just that (to tell which one grows the heap)
        `(async () => { for (let i = 0; i < 5; i++) { ${process.env.HEAP_SCENARIO !== 'pan' ? 'await __scenarios.drag(600);' : ''} ${process.env.HEAP_SCENARIO !== 'drag' ? 'await __scenarios.pan(400);' : ''} } })()`
      );
      console.log(JSON.stringify({ round, ...(await heap()) }));
    }
  } else {
    throw new Error(`Unknown command "${command}"`);
  }
} finally {
  browser.close();
}
