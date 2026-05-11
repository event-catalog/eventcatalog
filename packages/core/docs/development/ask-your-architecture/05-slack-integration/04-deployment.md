---
sidebar_position: 4
keywords:
- Slack Bot
- Deployment
- Docker
sidebar_label: Deployment
title: Deployment
description: Deploy the bot to production
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PlanBanner plan="Scale" />

Deploy the EventCatalog Slack Bot to your infrastructure. The bot uses Socket Mode, so it maintains an outbound connection to Slack without requiring a public URL, load balancer, or SSL certificates.

## Docker

The simplest way to deploy is using Docker. The bot includes a Dockerfile and docker-compose configuration.

### Build the image

```bash
docker build -t eventcatalog-slack-bot .
```

### Run with docker-compose

```bash
docker compose up -d
```

### View logs

```bash
docker compose logs -f
```

The `docker-compose.yml` file mounts your config and reads environment variables from `.env`:

```yaml
services:
  eventcatalog-slack-bot:
    build: .
    container_name: eventcatalog-slack-bot
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./eventcatalog-bot.config.ts:/app/eventcatalog-bot.config.ts:ro
    environment:
      - NODE_ENV=production
```

## Docker networking

When running the bot in Docker, the container needs network access to your EventCatalog server. Configuration depends on where EventCatalog runs.

### EventCatalog on localhost

Docker containers cannot use `localhost` to reach the host machine. Use one of these approaches:

**Option 1: Use host.docker.internal (recommended)**

Update your config to use the special Docker hostname:

```typescript
eventCatalog: {
  url: 'http://host.docker.internal:3000',
}
```

:::info
Your EventCatalog server must bind to all interfaces (`0.0.0.0`), not just `localhost`. Check your EventCatalog startup logs. If it shows `localhost:3000`, you may need to start it with a `--host 0.0.0.0` flag.
:::

**Option 2: Run the bot outside Docker**

For local development, skip Docker and run the bot directly:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm install
    npm run dev
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm install
    pnpm dev
    ```
  </TabItem>
</Tabs>

This avoids networking complexity during development.

### EventCatalog in Docker

Put both containers on the same Docker network and use the container name as hostname:

```yaml
services:
  eventcatalog:
    # your EventCatalog config
    networks:
      - app-network

  eventcatalog-slack-bot:
    build: .
    env_file:
      - .env
    volumes:
      - ./eventcatalog-bot.config.ts:/app/eventcatalog-bot.config.ts:ro
    networks:
      - app-network

networks:
  app-network:
```

Configure the bot to use the container name:

```typescript
eventCatalog: {
  url: 'http://eventcatalog:3000',
}
```

### EventCatalog at public URL

Use the public URL directly - no special configuration needed:

```typescript
eventCatalog: {
  url: 'https://your-catalog.example.com',
}
```

## Other deployment options

<details>
<summary>Railway</summary>

Railway automatically detects the Dockerfile and deploys the bot.

1. Create a new project and connect your repository
2. Add environment variables in the Railway dashboard:
   - `EVENTCATALOG_SCALE_LICENSE_KEY`
   - `SLACK_BOT_TOKEN`
   - `SLACK_APP_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `ANTHROPIC_API_KEY` (or your chosen provider)
3. Add your `eventcatalog-bot.config.ts` to the repository
4. Deploy - Railway detects the Dockerfile automatically

</details>

<details>
<summary>Fly.io</summary>

Deploy to Fly.io using their CLI.

**Initialize:**

```bash
fly launch --no-deploy
```

**Set secrets:**

```bash
fly secrets set EVENTCATALOG_SCALE_LICENSE_KEY=your-key
fly secrets set SLACK_BOT_TOKEN=xoxb-...
fly secrets set SLACK_APP_TOKEN=xapp-...
fly secrets set SLACK_SIGNING_SECRET=...
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
```

**Deploy:**

```bash
fly deploy
```

</details>

<details>
<summary>Render</summary>

Deploy as a Background Worker on Render.

1. Create a new **Background Worker** (not a Web Service)
2. Connect your repository
3. Set the build and start commands:

<Tabs>
  <TabItem value="npm" label="npm" default>
    - Build command: `npm install && npm run build`
    - Start command: `npm start`
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    - Build command: `pnpm install && pnpm build`
    - Start command: `pnpm start`
  </TabItem>
</Tabs>

4. Add environment variables in the Render dashboard
5. Deploy

</details>

<details>
<summary>AWS, GCP, or Azure</summary>

Deploy as a container or long-running process. The bot requires:

- Outbound HTTPS/WSS connections to Slack
- No inbound connections (Socket Mode handles communication)
- No load balancers or public endpoints needed

Suitable services include:

- **AWS:** ECS, EKS, EC2
- **GCP:** Cloud Run (always running), GKE, Compute Engine
- **Azure:** Container Instances, AKS, Virtual Machines

Ensure the process stays running and can make outbound connections to:
- `slack.com` (Socket Mode connection)
- Your EventCatalog instance
- Your AI provider API

</details>
