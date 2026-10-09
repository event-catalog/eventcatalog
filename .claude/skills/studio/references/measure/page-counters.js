// Injected into a page before it loads (CDP Page.addScriptToEvaluateOnNewDocument, or chrome-devtools
// navigate_page's initScript, which only applies to the next navigation): counts React commits and renders, and the
// page's own JS time, and adds scenarios to run. See ../verification.md.
//
//   window.__measure.reset()            start counting again
//   window.__measure.read()             { jsMs, commits, renders, top: [[component, renders], ...] }
//   await window.__scenarios.drag()     idle | mouse | pan | drag, about 3 seconds each (ms as the first argument)
(() => {
  // ---- JS time: every callback the page runs (scheduler tasks, microtasks, frames, timers, events), once ----
  const time = { ms: 0, depth: 0 };
  const timed = (fn) =>
    function (...args) {
      if (time.depth) return fn.apply(this, args);
      time.depth++;
      const start = performance.now();
      try {
        return fn.apply(this, args);
      } finally {
        time.ms += performance.now() - start;
        time.depth--;
      }
    };
  for (const name of ['setTimeout', 'setInterval', 'requestAnimationFrame', 'queueMicrotask', 'requestIdleCallback']) {
    const original = window[name];
    if (!original) continue;
    window[name] = function (callback, ...rest) {
      return original.call(this, typeof callback === 'function' ? timed(callback) : callback, ...rest);
    };
  }
  // React's scheduler runs renders from a MessageChannel
  const onmessage = Object.getOwnPropertyDescriptor(MessagePort.prototype, 'onmessage');
  Object.defineProperty(MessagePort.prototype, 'onmessage', {
    configurable: true,
    get() {
      return onmessage.get.call(this);
    },
    set(fn) {
      onmessage.set.call(this, typeof fn === 'function' ? timed(fn) : fn);
    },
  });
  const listeners = new WeakMap();
  const addEventListener = EventTarget.prototype.addEventListener;
  const removeEventListener = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, options) {
    if (typeof fn !== 'function') return addEventListener.call(this, type, fn, options);
    if (!listeners.has(fn)) listeners.set(fn, timed(fn));
    return addEventListener.call(this, type, listeners.get(fn), options);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, options) {
    return removeEventListener.call(this, type, (typeof fn === 'function' && listeners.get(fn)) || fn, options);
  };

  // ---- React commits and renders: a stand-in DevTools hook ----
  // A component rendered in a commit has PerformedWork (1) in its flags. Subtrees React didn't clone (bailed out)
  // keep the flags of the commit they last rendered in, so they're skipped, as React DevTools does.
  const counts = { commits: 0, renders: 0, byName: {} };
  const nameOf = (fiber) => {
    const type = fiber.type;
    if (!type) return 'anonymous';
    return (
      type.displayName ||
      type.name ||
      type.render?.displayName ||
      type.render?.name ||
      type.type?.displayName ||
      type.type?.name ||
      'anonymous'
    );
  };
  const isComponent = (fiber) => [0, 1, 11, 14, 15].includes(fiber.tag);
  const noop = () => {};
  let rendererId = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    isDisabled: false,
    inject(renderer) {
      this.renderers.set(++rendererId, renderer);
      return rendererId;
    },
    onCommitFiberRoot(_id, root) {
      const start = performance.now();
      counts.commits++;
      const stack = [root.current];
      while (stack.length) {
        const fiber = stack.pop();
        if (isComponent(fiber) && fiber.flags & 1) {
          counts.renders++;
          const name = nameOf(fiber);
          counts.byName[name] = (counts.byName[name] ?? 0) + 1;
        }
        if (fiber.sibling) stack.push(fiber.sibling);
        if (fiber.child && !(fiber.alternate && fiber.alternate.child === fiber.child)) stack.push(fiber.child);
      }
      // Counting isn't the page's own time
      time.ms -= performance.now() - start;
    },
    onCommitFiberUnmount: noop,
    onPostCommitFiberRoot: noop,
    checkDCE: noop,
    onScheduleFiberRoot: noop,
    setStrictMode: noop,
  };

  window.__measure = {
    reset() {
      time.ms = 0;
      counts.commits = 0;
      counts.renders = 0;
      counts.byName = {};
    },
    read() {
      return {
        jsMs: Math.round(time.ms),
        commits: counts.commits,
        renders: counts.renders,
        top: Object.entries(counts.byName)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
      };
    },
  };

  // ---- Scenarios (Studio's canvas, else the page's first React Flow) ----
  const canvas = () => document.querySelector('.studio-canvas') ?? document.querySelector('.react-flow')?.parentElement;
  const pane = () => canvas().querySelector('.react-flow__pane');
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const fire = (target, type, x, y, extra = {}) => {
    const Event = type.startsWith('pointer') ? PointerEvent : type === 'wheel' ? WheelEvent : MouseEvent;
    target.dispatchEvent(
      new Event(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type.endsWith('up') ? 0 : 1,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        view: window,
        ...extra,
      })
    );
  };
  // Runs `step` once a frame for `ms`, measuring from a clean count; returns the frames run and the counts
  const run = async (ms, step) => {
    window.__measure.reset();
    const start = performance.now();
    let frames = 0;
    while (performance.now() - start < ms) {
      step(frames++, (performance.now() - start) / ms);
      await nextFrame();
    }
    return { frames, ...window.__measure.read() };
  };
  // The node nearest the middle of the canvas: a drag that gets within 40px of an edge makes React Flow pan the
  // canvas (auto-pan), which is a second update per frame and moves everything
  const middleNode = () => {
    const rect = pane().getBoundingClientRect();
    const middle = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const distance = (element) => {
      const box = element.getBoundingClientRect();
      return Math.hypot(box.left + box.width / 2 - middle.x, box.top + box.height / 2 - middle.y);
    };
    return [...canvas().querySelectorAll('.react-flow__node')].sort((a, b) => distance(a) - distance(b))[0];
  };
  window.__scenarios = {
    idle: (ms = 3000) => run(ms, () => {}),
    mouse: (ms = 3000) => {
      const rect = pane().getBoundingClientRect();
      return run(ms, (frame, progress) => {
        const x = rect.left + 80 + progress * (rect.width - 160);
        const y = rect.top + rect.height / 2 + Math.sin(frame / 10) * 100;
        fire(pane(), 'pointermove', x, y, { buttons: 0 });
        fire(pane(), 'mousemove', x, y, { buttons: 0 });
      });
    },
    pan: (ms = 3000) => {
      const rect = pane().getBoundingClientRect();
      return run(ms, (frame) =>
        fire(pane(), 'wheel', rect.left + rect.width / 2, rect.top + rect.height / 2, {
          deltaX: frame % 60 < 30 ? 8 : -8,
          deltaY: frame % 40 < 20 ? 4 : -4,
          buttons: 0,
        })
      );
    },
    drag: async (ms = 3000) => {
      const node = middleNode();
      const box = node.getBoundingClientRect();
      const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      fire(node, 'pointerdown', from.x, from.y);
      fire(node, 'mousedown', from.x, from.y);
      const result = await run(ms, (_frame, progress) => {
        const x = from.x + Math.sin(progress * Math.PI * 4) * 120;
        const y = from.y + Math.sin(progress * Math.PI * 2) * 80;
        fire(window, 'pointermove', x, y);
        fire(window, 'mousemove', x, y);
      });
      fire(window, 'pointerup', from.x, from.y);
      fire(window, 'mouseup', from.x, from.y);
      return { node: node.dataset.id, ...result };
    },
  };
})();
