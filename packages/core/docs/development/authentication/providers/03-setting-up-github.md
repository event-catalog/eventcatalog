---
sidebar_position: 3
keywords:
- EventCatalog GitHub Authentication
sidebar_label: GitHub
title: Setting up GitHub
description: Setting up GitHub authentication for EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="2.43.0" />
<PlanBanner plan="Scale" />

:::info
This guide takes your through setting up a protected sign-in screen for your docs. Before going through this guide, make sure you’ve first gone through [Enabling authentication](/docs/development/authentication/enabling-authentication).
:::

To setup your EventCatalog site with visitor authentication using [GitHub](https://github.com/), the process looks as follows:

1. Create a new GitHub OAuth app
2. Configure the OAuth app in EventCatalog
3. Test the authentication

## Create a new GitHub OAuth app

First, you will need to create a new GitHub OAuth app.

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on "New OAuth App"
3. Fill in the details for your app
    - **Application name:** `EventCatalog`
    - **Homepage URL:** `{YOUR_EVENTCATALOG_SITE_URL}`
        - Local development: `http://localhost:3000`
    - **Authorization callback URL:** `{YOUR_EVENTCATALOG_SITE_URL}/api/auth/callback/github`
        - Local development: `http://localhost:3000/api/auth/callback/github`
4. Click on "Register application"
5. Copy the Client ID and Client Secret

## Configure the OAuth app in EventCatalog

Add your GitHub Client ID and Client Secret to your `.env` file.

```env title=".env"
AUTH_GITHUB_CLIENT_ID={YOUR_GITHUB_CLIENT_ID}
AUTH_GITHUB_CLIENT_SECRET={YOUR_GITHUB_CLIENT_SECRET}
```

In your `eventcatalog.auth.js` file, add the following:

```js title="eventcatalog.auth.js"
export default {
  providers: {
    github: {
      clientId: process.env.AUTH_GITHUB_CLIENT_ID,
      clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET,
    },
  },
};
```

## Test the authentication

Restart your EventCatalog server and test the authentication.

```bash
npm run dev
```

All pages should now be protected and require a GitHub account to access.

![GitHub authentication](./img/github-auth.png)

## Running behind a reverse proxy (`redirectProxyUrl`)

When running behind a reverse proxy or load balancer (Kubernetes/AKS, Nginx, Cloudflare, AWS ALB/ECS, etc.), GitHub sign-in can break with:

> The redirect_uri is not associated with this application.

This happens when the OAuth `redirect_uri` ends up as `http://` (or an internal host) instead of your real `https://` URL, because the proxy terminates TLS and forwards the request internally. You may also see `InvalidCheck: pkceCodeVerifier value could not be parsed` in your logs from the same wrong base URL.

[`AUTH_TRUST_HOST=true`](/docs/development/authentication/enabling-authentication#auth_trust_host) fixes this for most setups. If your proxy doesn't reliably forward the `x-forwarded-host` / `x-forwarded-proto` headers, set `redirectProxyUrl` to your canonical public URL to force the correct callback:

```js title="eventcatalog.auth.js"
export default {
  providers: {
    github: {
      clientId: process.env.AUTH_GITHUB_CLIENT_ID,
      clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET,
      // Canonical public URL of your site, including /api/auth
      redirectProxyUrl: 'https://catalog.example.com/api/auth',
    },
  },
};
```

The host must match the **Authorization callback URL** on your GitHub OAuth app (`https://catalog.example.com/api/auth/callback/github`). Not needed on Vercel, Cloudflare Pages, or local dev. See the [Auth.js reference](https://authjs.dev/reference/core#redirectproxyurl) for more.

## Found an issue?

Remember to setup the prerequisites for this guide:

- [Enabling authentication](/docs/development/authentication/enabling-authentication)

If you still have problems, please [let us know](https://github.com/eventcatalog/eventcatalog/issues/new/choose).

