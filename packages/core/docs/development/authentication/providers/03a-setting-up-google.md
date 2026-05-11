---
sidebar_position: 3
keywords:
- EventCatalog Google Authentication
sidebar_label: Google
title: Setting up Google
description: Setting up Google authentication for EventCatalog
id: setting-up-google
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import EventCatalogPro from '@site/src/components/MDX/EventCatalogPro';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="2.43.3" />
<PlanBanner plan="Scale" />

:::info
This guide takes your through setting up a protected sign-in screen for your docs. Before going through this guide, make sure you've first gone through [Enabling authentication](/docs/development/authentication/enabling-authentication).
:::

To setup your EventCatalog site with visitor authentication using [Google](https://accounts.google.com/), the process looks as follows:

1. Create a new Google OAuth app
2. Configure the OAuth app in EventCatalog
3. Test the authentication

## Create a new Google OAuth app

First, you will need to create a new Google OAuth app in the Google Cloud Console.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Library"
4. Search for and enable the "Google+ API"
5. Go to "APIs & Services" → "Credentials"
6. Click "Create Credentials" → "OAuth client ID"
7. If prompted, configure the OAuth consent screen:
  - Choose "External" for testing
  - Fill in app name: `EventCatalog`
  - Add your user support email and developer contact email
  - Save and continue through the remaining screens
8. Create the OAuth client ID:
  - **Application type:** Web application
  - **Name:** `EventCatalog`
  - **Authorized JavaScript origins:** `{YOUR_EVENTCATALOG_SITE_URL}`
    - Local development: `http://localhost:3000`
  - **Authorized redirect URIs:** `{YOUR_EVENTCATALOG_SITE_URL}/api/auth/callback/google`
    - Local development: `http://localhost:3000/api/auth/callback/google`
9. Click "Create" and copy the Client ID and Client Secret

## Configure the OAuth app in EventCatalog

Add your Google Client ID and Client Secret to your `.env` file.

```env title=".env"
AUTH_GOOGLE_CLIENT_ID={YOUR_GOOGLE_CLIENT_ID}
AUTH_GOOGLE_CLIENT_SECRET={YOUR_GOOGLE_CLIENT_SECRET}
```

In your eventcatalog.auth.js file, add the following:

```js title="eventcatalog.auth.js"
export default {
  enabled: true,
  google: {
    clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
  },
}
```

## Test the authentication

Restart your EventCatalog server and test the authentication.

```bash
npm run dev
```

All pages should now be protected and require a Google account to access.

![Google authentication](./img/google-auth.png)

## Found an issue?

Remember to setup the prerequisites for this guide:

- [Enabling authentication](/docs/development/authentication/enabling-authentication)

If you still have problems, please [let us know](https://github.com/eventcatalog/eventcatalog/issues/new/choose).

