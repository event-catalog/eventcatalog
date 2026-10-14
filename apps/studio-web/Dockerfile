# EventCatalog Studio on the web (the public MCP server and canvas): one long-running Node process (in-memory rate
# limits, no storage). Built from the repo root, as it uses workspace packages (the visualiser):
#   fly deploy . --config apps/studio-web/fly.toml --ha=false --remote-only
FROM node:22-slim AS base
RUN corepack enable

# Just this app and the workspace packages it uses, with a lockfile cut down to them
FROM base AS prune
WORKDIR /repo
COPY . .
RUN corepack pnpm dlx turbo@2.8.4 prune @eventcatalog/studio-web --docker

FROM base AS build
WORKDIR /repo
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
# The visualiser, then the view (dist/: the page, its social image) and the server, bundled (build/server.js)
RUN pnpm turbo run build --filter=@eventcatalog/studio-web
# Its production dependencies, on their own (the server bundle leaves packages in node_modules)
RUN pnpm --filter @eventcatalog/studio-web deploy --prod --legacy /prod

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /prod/package.json ./
COPY --from=build /prod/node_modules ./node_modules
COPY --from=build /repo/apps/studio-web/dist ./dist
COPY --from=build /repo/apps/studio-web/build ./build
USER node
EXPOSE 8080
# Plain node: the server's already compiled, so it starts in well under a second
CMD ["node", "--enable-source-maps", "build/server.js"]
