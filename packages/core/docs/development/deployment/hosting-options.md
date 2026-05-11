---
sidebar_position: 6
keywords:
- build
- deploy
sidebar_label: Hosting
title: Hosting
description: This document describes hosting options for EventCatalog.
---
import AddedIn from '@site/src/components/MDX/AddedIn';

### Hosting Options

EventCatalog can be hosted in two ways:

- [Hosting a static website output (default)](#hosting-a-static-website)
- [Hosting EventCatalog Server](#hosting-as-a-server)

### Hosting a static website

By default EventCatalog will build a static website.

Here are some guides and places you can host static content

- [Host with Docker](#hosting-with-docker)
- [Deploy to NextJS](https://nextjs.org/docs/deployment)
- [Host in AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [Deploying EventCatalog using Helm chart](https://github.com/osodevops/helm-charts/tree/main/charts/eventcatalog)

**Community posts**
- [Using AWS CDK to Deploy EventCatalog](https://matt.martz.codes/using-aws-cdk-to-deploy-eventcatalog)
- [Using Netlify to host Static Content](https://www.netlify.com/blog/2016/10/27/a-step-by-step-guide-deploying-a-static-site-or-single-page-app/)
- [How to create an EventCatlaog with Azure](https://www.kallemarjokorpi.fi/blog/how-to-create-and-event-catalog.html)
- [Autonomous EventCatalog for documenting EventBridge Events](https://medium.com/@wrennkieran/autonomous-eventcatalog-for-documenting-eventbridge-events-73e6334f2400)

### Hosting static website with Docker

EventCatalog comes with a DockerFile you can build the image and deploy the container. The container exposes ports `3000`.

To build the docker container you need to run:

```bash
# Builds the container
docker build -t eventcatalog .

# Runs the container locally
docker run -p 3000:80 -it eventcatalog
```

### Hosting as a server

<AddedIn version="2.35.4" />

First you need to update your `eventcatalog.config.js` file to use SSR mode.

```js title="eventcatalog.config.js"
export default {
  // defaults to static
  output: 'server', 
}
```

A server output is required if you are using any EventCatalog feature that requires a server, these include:

- [EventCatalog Chat (bring your own keys)](/features/ai-assistant)
- [EventCatalog Authentication](/docs/development/authentication/introduction)

You can use the server Docker image to run the server, this is the recommended way to run the server.

First you need to create a Dockerfile for the server (if you don't already have one).

```bash title="/Dockerfile.server"
FROM node:lts AS runtime
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Fix for Astro in Docker: https://github.com/withastro/astro/issues/2596
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Start the server
CMD npm run start
```

Then you can build the docker image with:

```bash
docker build -f Dockerfile.server -t eventcatalog-server .
```

Then you can run the server with:

```bash
docker run -p 3000:3000 eventcatalog-server
```

:::info "Why do I need a server to run EventCatalog?"

Some features of EventCatalog require a server to run (e.g. [EventCatalog Chat](/features/ai-assistant) and [EventCatalog Authentication](/docs/development/authentication/introduction)).

If you have a large catalog, you may want to use [SSR mode](/docs/development/deployment/build-ssr-mode) to reduce build times.

:::