# The demo (https://eventcatalog-demo.fly.dev): the default example catalog, built from the
# workspace packages on main and run as a server with Studio on. Built from the repo root:
#   fly deploy . --config deploy/demo/fly.toml --ha=false --remote-only
FROM node:22.23.4-slim AS base
RUN corepack enable

# Just core and the workspace packages it uses, with a lockfile cut down to them
FROM base AS prune
WORKDIR /repo
COPY . .
RUN corepack pnpm dlx turbo@2.8.4 prune @eventcatalog/core --docker

FROM base
WORKDIR /repo
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN pnpm turbo run build:bin --filter=@eventcatalog/core

# The example isn't a workspace package (prune leaves it out), so it comes straight from the repo
COPY examples/default ./examples/default
COPY deploy/demo/configure-catalog.mjs /repo/deploy/demo/configure-catalog.mjs
WORKDIR /repo/examples/default
# Server output with Studio on, and no AI chat (the demo is public; its config, gitignored, is kept out of the image)
RUN node /repo/deploy/demo/configure-catalog.mjs eventcatalog.config.js
# The server imports @eventcatalog/core from the catalog's node_modules, as it would from a catalog that installed it
RUN mkdir -p node_modules/@eventcatalog && ln -s /repo/packages/core node_modules/@eventcatalog/core
# Fix for Astro in Docker: https://github.com/withastro/astro/issues/2596
RUN NODE_OPTIONS=--max-old-space-size=4096 node ../../packages/core/bin/eventcatalog.js build
# The demo canvases and what puts them on Studio (after the build, so changing them doesn't build the catalog again)
COPY deploy/demo /repo/deploy/demo

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
# The server, with the demo canvases put on it once it answers (and reset every hour)
CMD ["sh", "-c", "node /repo/deploy/demo/demo-canvases.mjs & exec node ../../packages/core/bin/eventcatalog.js start"]
