# Docker file used for CI/CD pipeline to verify builds with their dependencies
FROM node:20-slim AS base

FROM base AS builder
RUN corepack enable pnpm && corepack install -g pnpm@9.14.4
WORKDIR /usr/eventcatalog/
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm run build:bin
RUN pnpm pack

FROM base
WORKDIR /usr/example/
COPY examples/default/ .
COPY --from=builder /usr/eventcatalog/*.tgz /usr/eventcatalog/
RUN npm install /usr/eventcatalog/*.tgz
CMD ["npx", "eventcatalog", "build"]