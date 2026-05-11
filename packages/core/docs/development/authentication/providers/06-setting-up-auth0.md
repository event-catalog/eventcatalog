---
sidebar_position: 6
keywords:
- EventCatalog components
sidebar_label: Auth0 
title: Setting up Auth0
description: Setting up Auth0 authentication for EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="2.43.1" />
<PlanBanner plan="Enterprise" />

:::info
This guide takes your through setting up a protected sign-in screen for your docs. Before going through this guide, make sure you've first gone through [Enabling authentication](/docs/development/authentication/enabling-authentication).
:::

To setup your EventCatalog site with visitor authentication using [Auth0](https://auth0.com/), the process looks as follows:

1. [Create a new Auth0 application](#create-a-new-auth0-application)
2. [Configure the Auth0 app in EventCatalog](#configure-the-auth0-app-in-eventcatalog)
3. [Test the authentication](#test-the-authentication)

## Create a new Auth0 application

First, you will need to create a new Auth0 application in your Auth0 Dashboard.

1. Go to [auth0.com](https://auth0.com) and sign up for a free account or login
2. In the Auth0 Dashboard, navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Fill in the application details:
   - **Name:** `EventCatalog`
   - **Application Type:** Select **Regular Web Applications**
5. Click **Create**
6. In your new application's **Settings** tab, configure the following:
   - **Allowed Callback URLs:**
       - Production: `{YOUR_EVENTCATALOG_SITE_URL}/api/auth/callback/auth0`
       - Local development: `http://localhost:3000/api/auth/callback/auth0`
   - **Allowed Logout URLs:**
       - Production: `{YOUR_EVENTCATALOG_SITE_URL}`
       - Local development: `http://localhost:3000`
   - **Allowed Web Origins:**
       - Production: `{YOUR_EVENTCATALOG_SITE_URL}`
       - Local development: `http://localhost:3000`
   - **Allowed Origins (CORS):**
       - Production: `{YOUR_EVENTCATALOG_SITE_URL}`
       - Local development: `http://localhost:3000`
7. Leave **Initiate Login URI** empty (not required)
8. Click **Save Changes**
9. Copy the **Domain**, **Client ID**, and **Client Secret** from the app settings

## Configure the Auth0 app in EventCatalog

Add your Auth0 Domain, Client ID, and Client Secret to your `.env` file.

```env title=".env"
AUTH_AUTH0_ID={YOUR_AUTH0_CLIENT_ID}
AUTH_AUTH0_SECRET={YOUR_AUTH0_CLIENT_SECRET}
AUTH_AUTH0_ISSUER=https://{YOUR_AUTH0_DOMAIN}
```

Your Auth0 issuer URL should be in the format: https://your-tenant.auth0.com (this is the Domain from your Auth0 application settings).

In your eventcatalog.auth.js file, add the following:

```js title="eventcatalog.auth.js"
export default {
  enabled: true,
  providers: {
    auth0: {
      clientId: process.env.AUTH_AUTH0_ID,
      clientSecret: process.env.AUTH_AUTH0_SECRET,
      issuer: process.env.AUTH_AUTH0_ISSUER,
    },
  },
};
```

## Test the authentication

![Okta authentication](./img/auth0-auth.png)

Restart your EventCatalog server and test the authentication.

```bash
npm run dev
```

All pages should now be protected and require an Auth0 account to access.

1. Navigate to your EventCatalog site
1. You should be redirected to the sign-in page
1. Click Sign in with Auth0
1. You'll be redirected to your Auth0 login page
1. Enter your credentials or sign up for a new account
1. After successful authentication, you'll be redirected back to EventCatalog

## Found an issue?

Remember to setup the prerequisites for this guide:

- [Enabling authentication](/docs/development/authentication/enabling-authentication)

If you still have problems, please [let us know](https://github.com/eventcatalog/eventcatalog/issues/new/choose).