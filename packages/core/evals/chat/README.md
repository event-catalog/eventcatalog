# Assistant evals

Questions for the assistant (Ask AI) about the example catalog, checked against what the catalog says. Run them before and
after changing the assistant (its prompt, tools, loop or model) to see whether answers got better or worse, and what they
cost in model calls, tokens and time.

They call a real model, so they cost tokens and aren't run in CI. Each run of all cases is roughly 13 answers' worth of
tokens for the model you configure.

## Running

1. Give the example catalog a model: an `examples/default/eventcatalog.chat.js` (it's gitignored) and the provider's API
   key in `examples/default/.env`, with `output: 'server'` in its config. See the
   [assistant docs](https://www.eventcatalog.dev/docs/development/ask-your-architecture/eventcatalog-assistant/configuration).
2. Start it in dev mode, so answers report their model calls and tokens: `pnpm run start:catalog`
3. Run the evals against it:

```bash
pnpm run eval:chat -- --url http://localhost:3000
```

| Option | |
|---|---|
| `--url` | The running catalog (default `http://localhost:3000`) |
| `--case <id>` | Only this case; repeat for more |
| `--trials <n>` | Ask each question n times: models don't answer the same way twice, so use 3+ before trusting a change |
| `--label <name>` | Name the results file (default: the time) |
| `--compare <run>` | Show what changed since an earlier run: its `--label` (e.g. `before`) or a results file |
| `--concurrency <n>` | Questions asked at once (default 3) |
| `--rescore <run>` | Re-check a saved run's answers against the cases as they are now, without asking the model (free). Use it on both runs you compare when you change a case |

Results are saved in `results/` (gitignored), with every answer, so you can read what the model actually said.

### Comparing a change

```bash
pnpm run eval:chat -- --trials 3 --label before
# make the change
pnpm run eval:chat -- --trials 3 --label after --compare before
```

## What's checked

An answer passes when it:

- isn't empty, and the request didn't fail
- mentions everything the case expects (or `minRecall` of it): a resource by its link, id or name, or a phrase
- has no broken links: every `/docs`, `/visualiser` and `/architecture` link in it opens a page in the catalog

For each run you also get: answers that reached the step limit or needed the fallback, model calls and tool calls per
answer, tool output size, input tokens (and how many were read from the provider's cache), output tokens, and time.

## Adding a case

Add it to `cases.ts`. Start from real questions, especially ones the assistant got wrong. Take what a good answer must
contain from the catalog itself (the MCP server's tools are a quick way to look it up), not from a model's answer.
