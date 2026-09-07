# perf-large catalog

Synthetic EventCatalog used to measure static build time, peak RSS, and HTML payload size.

It is **not** a product example. Generated content (`domains/`, `users/`, `teams/`, `dist/`) is gitignored.

## Reproduce the benchmark

From the repository root, with workspace dependencies and the core CLI already built:

```bash
pnpm --filter @eventcatalog/sdk run build
pnpm --filter @eventcatalog/visualiser run build
pnpm --filter @eventcatalog/core run build:bin

# 8 domains × 8 services × 10 events = 64 services and 640 events
node examples/perf-large/generate.mjs

node examples/perf-large/benchmark.mjs --label after --skip-generate
```

Scale the catalog with `--domains`, `--services`, and `--events` if you need a larger run.

The script writes `examples/perf-large/benchmark-<label>.json` and prints wall-clock build time, peak RSS, total HTML bytes, and the largest pages.
