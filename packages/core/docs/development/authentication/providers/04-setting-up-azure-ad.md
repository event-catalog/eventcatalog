---
sidebar_position: 4
keywords:
- EventCatalog components
sidebar_label: Azure AD (Entra ID)
title: Setting up Azure AD (Entra ID)
description: Setting up Microsoft Entra ID authentication for EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="2.43.1" />
<PlanBanner plan="Enterprise" />

:::info
This guide takes your through setting up a protected sign-in screen for your docs. Before going through this guide, make sure you've first gone through [Enabling authentication](/docs/development/authentication/enabling-authentication).
:::

To setup your EventCatalog site with visitor authentication using [Microsoft Entra ID](https://entra.microsoft.com/) (formerly Azure Active Directory), the process looks as follows:

1. [Create a new Azure app registration](#create-a-new-azure-app-registration)
2. [Configure the Azure app in EventCatalog](#configure-the-azure-app-in-eventcatalog)
3. [Test the authentication](#test-the-authentication)

## Create a new Azure app registration

First, you will need to create a new app registration in the Azure portal.

1. Go to [portal.azure.com](https://portal.azure.com) and sign up for a free account or login
2. Search for **Microsoft Entra ID** (or **Azure Active Directory**) in the top search bar
3. Navigate to **App registrations** → **New registration**
4. Fill in the application details:
  - **Name:** `EventCatalog`
  - **Supported account types:** Select **Accounts in any organizational directory and personal Microsoft accounts** (for broader compatibility)
  - **Redirect URI:** Select **Web** and enter:
    - Local development: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
5. Click **Register**
6. After registration, note the **Application (client) ID** and **Directory (tenant) ID** from the Overview page
7. Navigate to **Certificates & secrets** → **New client secret**
8. Add a description (e.g., "EventCatalog Secret") and choose an expiration period
9. Click **Add** and immediately copy the secret **Value** (you won't see it again)
10. Go to **Authentication** in the sidebar and configure:
   - Add additional redirect URIs for production: `{YOUR_EVENTCATALOG_SITE_URL}/api/auth/callback/microsoft-entra-id`
   - Under **Implicit grant and hybrid flows**, check **ID tokens**
   - Click **Save**

## Configure the Azure app in EventCatalog

Add your Azure AD Client ID, Client Secret, and Tenant ID to your `.env` file.

```env title=".env"
AUTH_MICROSOFT_ENTRA_ID_ID={YOUR_AZURE_CLIENT_ID}
AUTH_MICROSOFT_ENTRA_ID_SECRET={YOUR_AZURE_CLIENT_SECRET}
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/{YOUR_AZURE_TENANT_ID}/v2.0
```

Your Azure AD tenant ID can be found in your app registration's Overview page in the Azure portal.

In your eventcatalog.auth.js file, add the following:

```js title="eventcatalog.auth.js"
export default {
  enabled: true,
  providers: {
    entra: {
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    },
  },
};
```

## Test the authentication

![Okta authentication](./img/microsoft-auth.png)

Restart your EventCatalog server and test the authentication.

```bash
npm run dev
```

All pages should now be protected and require a Microsoft account to access.

1. Navigate to your EventCatalog site
1. You should be redirected to the sign-in page
1. Click Sign in with Azure AD
1. You'll be redirected to Microsoft's login page
1. Enter your Microsoft account credentials (personal or organizational)
1. After successful authentication, you'll be redirected back to EventCatalog

## Found an issue?

Remember to setup the prerequisites for this guide:

- [Enabling authentication](/docs/development/authentication/enabling-authentication)

If you still have problems, please [let us know](https://github.com/eventcatalog/eventcatalog/issues/new/choose).