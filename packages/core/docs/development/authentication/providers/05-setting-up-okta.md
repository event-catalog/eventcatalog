---
sidebar_position: 5
keywords:
- EventCatalog components
sidebar_label: Okta 
title: Setting up Okta
description: Setting up Okta authentication for EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="2.43.0" />
<PlanBanner plan="Enterprise" />

:::info
This guide takes your through setting up a protected sign-in screen for your docs. Before going through this guide, make sure you've first gone through [Enabling authentication](/docs/development/authentication/enabling-authentication).
:::

To setup your EventCatalog site with visitor authentication using [Okta](https://www.okta.com/), the process looks as follows:

1. Create a new Okta OAuth app
2. Configure the OAuth app in EventCatalog
3. Test the authentication

## Create a new Okta OAuth app

First, you will need to create a new Okta OAuth app in your Okta Admin Console.

1. Log in to your **[Okta Admin Console](https://login.okta.com/signin)**
2. Navigate to **Applications** → **Applications**
3. Click **Create App Integration**
4. Select **OIDC - OpenID Connect** as the sign-in method
5. Select **Web Application** as the application type
6. Click **Next**
7. Fill in the application details:
    - **App integration name:** `EventCatalog`
    - **Grant types:** Check `Authorization Code`
    - **Sign-in redirect URIs:** 
        - Production: `{YOUR_EVENTCATALOG_SITE_URL}/api/auth/callback/okta`
        - Local development: `http://localhost:3000/api/auth/callback/okta`
    - **Sign-out redirect URIs:**
        - Production: `{YOUR_EVENTCATALOG_SITE_URL}`
        - Local development: `http://localhost:3000`
8. Under **Assignments**, choose who can access this application:
    - **Allow everyone in your organization to access** (recommended)
    - Or assign to specific groups
9. Click **Save**
10. Copy the **Client ID** and **Client Secret** from the app settings
11. Note your **Okta domain** (e.g., `https://your-domain.okta.com`)

## Configure the OAuth app in EventCatalog

Add your Okta Client ID, Client Secret, and Issuer to your `.env` file.

```env title=".env"
AUTH_OKTA_CLIENT_ID={YOUR_OKTA_CLIENT_ID}
AUTH_OKTA_CLIENT_SECRET={YOUR_OKTA_CLIENT_SECRET}
AUTH_OKTA_ISSUER=https://{YOUR_OKTA_DOMAIN}
```

Your Okta issuer URL should be in the format: https://your-domain.okta.com (without /oauth2/default unless you're using a custom authorization server).
In your eventcatalog.auth.js file, add the following:

```js title="eventcatalog.auth.js"
export default {
  enabled: true,
  providers: {
    okta: {
      clientId: process.env.AUTH_OKTA_CLIENT_ID,
      clientSecret: process.env.AUTH_OKTA_CLIENT_SECRET,
      issuer: process.env.AUTH_OKTA_ISSUER,
    },
  },
};
```

## Test the authentication

![Okta authentication](./img/okta-auth.png)

Restart your EventCatalog server and test the authentication.

```bash
npm run dev
```

All pages should now be protected and require an Okta account to access.

1. Navigate to your EventCatalog site
1. You should be redirected to the sign-in page
1. Click Sign in with Okta
1. You'll be redirected to your Okta login page
1. Enter your Okta credentials
1. After successful authentication, you'll be redirected back to EventCatalog


## Found an issue?

Remember to setup the prerequisites for this guide:

- [Enabling authentication](/docs/development/authentication/enabling-authentication)

If you still have problems, please [let us know](https://github.com/eventcatalog/eventcatalog/issues/new/choose).

