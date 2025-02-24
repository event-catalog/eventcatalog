// Web Worker script
self.onmessage = (event) => {
    const { type, payload } = event.data;

    if (type === "calculate") {
    const result = payload.num * 2; // Simple example: double a number
    self.postMessage({ type: 'result', result: 100 });
  }
};
