---
sidebar_position: 1
keywords:
  - EventCatalog custom pages
  - EventCatalog API routes
  - Astro pages
  - custom routes
sidebar_label: Introduction
title: Custom pages and API routes
description: Understand custom pages and API routes in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="4.1.1" />
<PlanBanner plan="Scale" />

EventCatalog gives you a structured catalog out of the box, but every organization eventually needs pages that are specific to how they work.

Custom pages and API routes let you extend EventCatalog beyond the built-in catalog views. You can create any page you need, reuse your own components, keep pages static when the content is simple, or connect pages to other systems when you need live data.

Use this when you want EventCatalog to become the place for catalog-specific tools and experiences, such as:

- Internal reports and dashboards.
- Team onboarding pages.
- Architecture review workflows.
- Scorecards and ownership views.
- Lightweight API routes for catalog data.
- Pages that combine EventCatalog resources with data from systems such as service catalogs, deployment platforms, observability tools, or internal APIs.

## What are custom pages?

Custom pages are `.astro` files that EventCatalog turns into routes in your generated catalog.

For example, `pages/reports.astro` becomes `/custom/reports` by default.

Custom pages are useful when markdown is not enough. Use them when you need layout control, custom components, conditional rendering, or a small internal tool that belongs inside the catalog.

They can be static pages built entirely from catalog data, or pages that call API routes and other systems to show live information.

## What are API routes?

API routes are server endpoints that live in `pages/api`.

For example, `pages/api/services.ts` becomes `/custom/api/services` by default.

API routes are useful when you want to expose catalog data, receive form submissions, power a custom page, or connect a catalog workflow to another internal system.

For example, a custom page could show service ownership from EventCatalog, deployment status from your platform, and incidents from your observability tool in one view.

## Custom pages, custom docs, and custom components

EventCatalog has a few customization features. Pick the smallest one that fits the job.

| Feature | Use it when |
| --- | --- |
| [Custom documentation](/docs/development/bring-your-own-documentation/custom-pages/introduction) | You want markdown documentation under `/docs/custom`. |
| [Custom components](/docs/development/components/custom-components/introduction) | You want reusable UI inside markdown or MDX pages. |
| [Custom homepage](/docs/development/customization/customize-landing-page) | You want to replace the catalog homepage at `/`. |
| Custom pages | You want new catalog routes with custom Astro code. |
| API routes | You want server endpoints inside the catalog. |

:::info Custom homepage

`pages/homepage.astro` is still the way to customize the catalog homepage. That file is rendered at `/` and is not served under the custom pages prefix.

This section covers additional custom pages and API routes.

:::

## How routing works

EventCatalog uses [Astro](https://astro.build/) under the hood. Files in your catalog's top-level `pages` directory become routes in your generated catalog.

By default, custom pages are served under `/custom`. You can change this prefix.

| File | Route |
| --- | --- |
| `pages/reports.astro` | `/custom/reports` |
| `pages/reports/index.astro` | `/custom/reports` |
| `pages/reports/[id].astro` | `/custom/reports/[id]` |
| `pages/api/teams.ts` | `/custom/api/teams` |
| `pages/data.json.ts` | `/custom/data.json` |

EventCatalog supports Astro-style dynamic route segments such as `[id]` and `[...slug]`.

After you create a custom page, you can add it to your catalog navigation by customizing the [application sidebar](/docs/development/customization/application-sidebar).

## Next steps

- [Create a custom page](/docs/development/customization/custom-pages-and-api-routes/create-a-custom-page)
- [Create an API route](/docs/development/customization/custom-pages-and-api-routes/create-an-api-route)
- [Routing and configuration reference](/docs/development/customization/custom-pages-and-api-routes/reference)
