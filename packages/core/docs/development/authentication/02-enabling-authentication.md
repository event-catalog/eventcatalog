---
sidebar_position: 1
keywords:
- EventCatalog authentication
sidebar_label: Enabling authentication
title: Enabling authentication
description: Enabling authentication for EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';
import { Card, CardGrid, GitHubIcon, OktaIcon, AzureIcon, GoogleIcon, Auth0Icon, GitLabIcon } from '@site/src/components/MDX/Card';

<AddedIn version="2.43.0" />
<PlanBanner plan="Scale" />

To enable authentication for your site, you will need to do three things:

1. [Setup Environment](#setup-environment)
1. [Enable EventCatalog Server Side Rendering (SSR)](#enable-eventcatalog-server-side-rendering-ssr)
1. [Create your `eventcatalog.auth.js` file](#create-your-eventcatalogauthjs-file)

:::info Authentication is a paid feature
Authentication is a paid feature, and is available on EventCatalog Scale and Enterprise plans.

You can get a 30-day free trial of EventCatalog Scale and Enterprise [here](https://www.eventcatalog.dev/pricing).

You will need to set your license key in your `.env` file.

```env title=".env"
EVENTCATALOG_LICENSE_KEY=your-license-key
```
:::

### Setup Environment

EventCatalog uses [Auth.js](https://authjs.dev/) to handle the authentication flow.

Auth.js libraries require you to set an `AUTH_SECRET` environment variable. This is used to encrypt cookies and tokens. It should be a cryptographically secure random string of at least 32 characters:

This is the only strictly required environment variable. It is the secret used to encode the JWT and encrypt things in transit. We recommend at least a 32 character random string. This can be generated via openssl with `openssl rand -base64 33`.

```env title=".env"
AUTH_SECRET=your-secret
```

#### AUTH_TRUST_HOST {#auth_trust_host}

When running EventCatalog behind a reverse proxy (Kubernetes/AKS, Nginx, Cloudflare, AWS ALB, etc.), you must set `AUTH_TRUST_HOST=true`. Without it, Auth.js falls back to the internal container URL (e.g. `http://localhost:3000`) instead of the real domain, which causes login and sign-out to fail with CSRF/cross-site errors such as "Cross-site POST form submissions are forbidden".

```env title=".env"
AUTH_TRUST_HOST=true
```

Setting this tells Auth.js to trust the `x-forwarded-host` and `x-forwarded-proto` headers forwarded by your proxy so it can resolve the correct callback URL.

:::tip Vercel and Cloudflare Pages
You do not need to set `AUTH_TRUST_HOST` when deploying to Vercel or Cloudflare Pages - it is inferred automatically. It is also not required in local development.
:::

To learn more, refer to the [Auth.js deployment documentation](https://authjs.dev/getting-started/deployment#auth_trust_host).


### Enable EventCatalog Server Side Rendering (SSR)

Authentication requires EventCatalog to be SSR enabled. This is because EventCatalog needs to be able to access the user's session to determine if they are authenticated.

To enable SSR, you will need to add the following to your `eventcatalog.config.js` file:

```js title="eventcatalog.config.js"
module.exports = {
  // ... other config options
  output: 'server',
};
```

This will ensure that EventCatalog is rendered on the server side, and that the user's session is available to the client.

:::info Deploying EventCatalog in SSR mode
You will be running EventCatalog in SSR mode when you deploy your site. This means the output of your site will require a server to be running. You can use EventCatalog Docker file to deploy your site or read our [deployment guide](https://www.eventcatalog.dev/docs/deployment/overview) for more information.
:::

### Create your `eventcatalog.auth.js` file

The `eventcatalog.auth.js` file is used to configure the authentication for your site, and is created in the root of your EventCatalog project.

```js title="eventcatalog.auth.js"
module.exports = {
  // Enable debug mode for development
  debug: false,
  // List of providers you want to enable
  providers: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
  // Optional session configuration
  session?: {
    // 30 days default
    maxAge?: number;
  };
};
```

Once you have these three things, you can start setting up your authentication providers.

### Setting up your authentication providers

EventCatalog supports a range of authentication providers, and you can find the documentation for each provider below.

<CardGrid columns={2}>
  <Card
    title="Setting up GitHub"
    icon={<GitHubIcon />}
    badge="Scale"
    href="/docs/development/authentication/providers/setting-up-github"
  />
  <Card
    title="Setting up Google"
    icon={<GoogleIcon />}
    badge="Scale"
    href="/docs/development/authentication/providers/setting-up-google"
  />
  <Card
    title="Setting up Azure AD"
    icon={<AzureIcon />}
    badge="Enterprise"
    href="/docs/development/authentication/providers/setting-up-azure-ad"
  />
  <!-- <Card
    title="Setting up Google"
    icon={<GoogleIcon />}
    href="/docs/auth/google"
  /> -->
  
  <Card
    title="Setting up Okta"
    icon={<OktaIcon />}
    href="/docs/development/authentication/providers/setting-up-okta"
    badge="Enterprise"
  />
  <Card
    title="Setting up Auth0"
    icon={<Auth0Icon />}
    href="/docs/development/authentication/providers/setting-up-auth0"
    badge="Enterprise"
  />
</CardGrid>

Missing a provider? [Let us know](https://github.com/event-catalog/eventcatalog/issues/new) and we'll add it to the list.

