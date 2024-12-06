# Docker file used for CI/CD pipeline to verify builds with their dependencies
FROM node:20.17 AS builder
WORKDIR /usr/eventcatalog/
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build:bin
RUN npm pack


FROM node:20.17 AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /usr/example/
COPY examples/default/ .
COPY --from=builder /usr/eventcatalog/*.tgz /usr/eventcatalog/
RUN pnpm init && \
    pnpm add /usr/eventcatalog/*.tgz
CMD ["pnpm", "exec", "eventcatalog", "build"]