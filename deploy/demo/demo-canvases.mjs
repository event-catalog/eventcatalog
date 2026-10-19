// Keeps the demo's Studio tidy: once the server answers, it puts the demo canvases (./canvases, one Studio API request
// each) on it, and every hour deletes every canvas and puts them back, so what visitors add doesn't pile up.
// Canvases are kept in memory on the demo, so a restart starts empty too: this runs again with the server.
import fs from "node:fs";
import path from "node:path";

const API = `http://127.0.0.1:${process.env.PORT || 3000}/api/studio/canvases`;
const RESET_EVERY_MS =
  Number(process.env.DEMO_RESET_HOURS || 1) * 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;

const canvasesDirectory = path.join(import.meta.dirname, "canvases");
// Created last first, so the first one is the most recently changed and is listed first
const seeds = fs
  .readdirSync(canvasesDirectory)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .reverse()
  .map((file) => ({
    file,
    body: fs.readFileSync(path.join(canvasesDirectory, file), "utf8"),
  }));

const log = (message) => console.log(`[demo] ${message}`);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (url, init) => {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error(
      body?.error ??
        `${init?.method ?? "GET"} ${url} answered ${response.status}`,
    );
  return body;
};

const waitForStudio = async () => {
  for (;;) {
    try {
      await request(API);
      return;
    } catch {
      await wait(2000);
    }
  }
};

const listCanvases = async () => {
  const canvases = [];
  let cursor;
  do {
    const page = await request(
      `${API}?pageSize=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    canvases.push(...page.canvases);
    cursor = page.nextCursor;
  } while (cursor);
  return canvases;
};

const reset = async () => {
  const existing = await listCanvases();
  for (const canvas of existing)
    await request(`${API}/${canvas.id}`, { method: "DELETE" });
  let created = 0;
  for (const seed of seeds) {
    try {
      await request(API, { method: "POST", body: seed.body });
      created += 1;
    } catch (error) {
      // e.g. a resource it shows was renamed in the example catalog: the others still go on
      log(`Could not create the canvas in ${seed.file}: ${error.message}`);
    }
  }
  log(
    `Deleted ${existing.length} canvases, created ${created} of ${seeds.length} demo canvases`,
  );
};

await waitForStudio();
for (;;) {
  try {
    await reset();
    await wait(RESET_EVERY_MS);
  } catch (error) {
    log(`Reset failed, trying again in a minute: ${error.message}`);
    await wait(RETRY_MS);
  }
}
