# Docker file used for CI/CD pipeline to verify builds with their dependencies
FROM node:20.17 AS builder
WORKDIR /usr/eventcatalog/
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
RUN npm pack


FROM node:20.17 AS runner
WORKDIR /usr/example/
COPY examples/default/ .
COPY --from=builder /usr/eventcatalog/*.tgz /usr/eventcatalog/
RUN npm init -y && \
    npm install /usr/eventcatalog/*.tgz
CMD ["npx", "eventcatalog", "build"]