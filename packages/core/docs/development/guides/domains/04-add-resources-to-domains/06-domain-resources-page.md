---
sidebar_position: 6
keywords:
  - EventCatalog domains
  - Domain resources
  - Resources page
sidebar_label: Domain resources page
title: Domain resources page
description: See every subdomain, system, service, message, and decision record attached to a domain in one table.
---

Every domain with resources gets a **Resources** page that lists them in one table. Open it from **Quick Reference** > **Resources** in the domain's sidebar, or go to:

```txt
/docs/domains/{domain-id}/{version}/resources
```

## What the page lists

The page lists the resources attached directly to the domain. Resources inside a child system or subdomain are listed on that system's or subdomain's own Resources page.

| Resource | Where it comes from | Relationship |
|----------|---------------------|--------------|
| Subdomains | The domain's [`domains`](/docs/development/guides/domains/reference#domains) | **Contains** |
| Systems | The domain's [`systems`](/docs/development/guides/domains/reference#systems) | **Contains** |
| Agents | The domain's [`agents`](/docs/development/guides/domains/reference#agents) | **Contains** |
| Data products | The domain's [`data-products`](/docs/development/guides/domains/reference#data-products) | **Contains** |
| Services | The domain's [`services`](/docs/development/guides/domains/reference#services) | **Contains** |
| Flows | The domain's [`flows`](/docs/development/guides/domains/reference#flows) | **Contains** |
| Entities | The domain's [`entities`](/docs/development/guides/domains/reference#entities) | **Owns** |
| Events, commands and queries | The domain's [`sends`](/docs/development/guides/domains/reference#sends) and [`receives`](/docs/development/guides/domains/reference#receives) | **Sends**, **Receives** or **Sends & receives** |
| Decision records | Any ADR whose `appliesTo` includes the domain ([add ADRs to resources](/docs/development/guides/resources/adrs/linking-resources)) | **Governed by** |

The **Resources** link only shows in the sidebar when the domain has at least one resource to list.

The table has the same filters, sorting and row actions as the service Resources page. See [Service resources page](/docs/development/guides/resources/services/resources-page).

:::info Changed in EventCatalog v5
The sidebar link was called **Domain Resources** and is now **Resources**. The page now lists decision records and has a **Relationship** column. The domain architecture overview page (`/architecture/domains/{domain-id}/{version}`) is removed. Old links redirect to the Resources page, or to the domain's docs page when it has nothing to list.
:::
