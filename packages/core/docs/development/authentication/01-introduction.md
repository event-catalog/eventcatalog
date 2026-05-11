---
sidebar_position: 1
keywords:
- EventCatalog components
sidebar_label: Introduction
title: Introduction
description: Introduction to EventCatalog Authentication
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import EventCatalogPro from '@site/src/components/MDX/EventCatalogPro';

# Authentication Guide

<EventCatalogPro />
<AddedIn version="2.43.0" />


EventCatalog provides secure authentication to control access to your event-driven architecture documentation. Whether you're a small team getting started or a large enterprise with complex identity requirements, EventCatalog's flexible authentication system grows with your needs.

<iframe width="100%" height="455" src="https://www.youtube.com/embed/OVbXNP0Ns_U?si=TagMKL49ZD_G_HYE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>




## How it works

EventCatalog uses industry-standard **OpenID Connect (OIDC)** and **OAuth 2.0** protocols to integrate with your identity provider. Here's the authentication flow:

1. **User visits EventCatalog** and attempts to access protected documentation
2. **Redirected to your identity provider** (GitHub, Google, Auth0, etc.)
3. **User authenticates** with their existing credentials
4. **Provider confirms identity** and sends user back to EventCatalog
5. **User gains access** to your documentation and architecture

![Authentication](./img/auth.png)

EventCatalog runs in **SSR mode** to handle authentication sessions and uses [Auth.js](https://authjs.dev/) to manage the authentication flow securely.

## Authentication by Plan

EventCatalog Authentication is a **paid feature** available in Scale and Enterprise plans.

#### Scale Plan
Perfect for growing teams that need secure collaboration with popular business providers:

- **GitHub** - Ideal for development teams already using GitHub
<!-- - **Google** - For teams using Gmail and Google Workspace -->

#### Enterprise Plan
Designed for large organizations with dedicated identity management systems:

- **Microsoft Azure AD (Entra ID)** - For organizations using Office 365 and Azure
- **Auth0** - Developer-friendly identity platform with advanced features
- **Okta** - Popular enterprise identity platform with custom claims
- **Custom OIDC** - Contact us to add your provider at [hello@eventcatalog.cloud](mailto:hello@eventcatalog.cloud)

## Why EventCatalog Authentication?

- ✅ **No new passwords** - Users authenticate with accounts they already have
- ✅ **Secure by default** - Leverage enterprise-grade security from major providers
- ✅ **Single sign-on experience** - Seamless access across your tools
- ✅ **Centralized management** - Control access through your existing identity systems
- ✅ **Team collaboration** - Secure access for distributed teams

## Getting Started

Ready to secure your EventCatalog with authentication?

**New to EventCatalog?** Start your **14-day free trial** at [EventCatalog.cloud](https://eventcatalog.cloud) to explore all authentication features.

## Next steps

Ready to get started? Let's enable authentication in your EventCatalog project:

→ [Enabling Authentication](/docs/development/authentication/enabling-authentication)

**Questions?** Join our [Discord community](https://discord.gg/eventcatalog) for support and guidance.