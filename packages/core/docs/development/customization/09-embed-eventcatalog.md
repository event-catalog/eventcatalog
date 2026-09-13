---
sidebar_position: 11
sidebar_label: Embed EventCatalog
title: Embed EventCatalog in other applications
description: Bring EventCatalog documentation, diagrams, schemas, messages, and flows into your internal applications.
keywords:
  - embed EventCatalog
  - iframe
  - developer portal
  - internal application
  - Scale
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

You can embed EventCatalog pages in developer portals, internal tools, intranets, and other web applications. Your teams can explore architecture information in the application where they already work while EventCatalog remains the source of the documentation.

Embedding EventCatalog requires an EventCatalog Scale license. See [Getting a license key for EventCatalog Scale](/docs/development/license-keys/plans).

## What you can embed

| Feature | What users can do in the embedded view |
| --- | --- |
| Resource documentation | Read the documentation for a domain, system, service, message, flow, team, or another catalog resource. |
| Resource visualizer | Explore the selected resource and its relationships. |
| Architecture Graph | Explore the catalog-wide graph or focus it on a resource with a relationship depth of 1, 2, or 3. |
| System Context Maps | View the catalog-wide system overview or the context surrounding one system. |
| Entity maps | Explore the entities and relationships associated with a resource. |
| Flows | Follow the steps, services, and messages in a business or technical flow. |
| Discovery tables | Browse and filter catalog resources such as services, events, commands, and queries. |
| Schema explorer | Search schemas, inspect their contents, and see the resources that use them. |

Embedded pages remain interactive. Controls belonging to the selected visualization or table stay available, while EventCatalog's application header and sidebars are removed so they do not compete with the host application's navigation.

## How embedding works

Add `embed=true` to a supported EventCatalog URL and load that URL in an iframe. For example:

```text
https://catalog.example.com/docs/services/order-service/1.0.0?embed=true
```

You can also request a light or dark color mode for an embed:

```text
https://catalog.example.com/docs/services/order-service/1.0.0?embed=true&theme=dark
```

The requested theme only affects that embedded page. It does not replace the visitor's saved EventCatalog theme.

## Before you embed

- Build and deploy EventCatalog with a valid Scale license.
- Use an EventCatalog URL that users of the host application can reach from their browsers.
- If EventCatalog is authenticated, verify that users can authenticate from the embedded context.
- Give the iframe's parent a defined height. EventCatalog fills the space the host application provides.
- Review the host application's Content Security Policy and iframe policy if the browser blocks the page.

## Embed a page

### 1. Choose the EventCatalog page

Open the page in EventCatalog and confirm that it contains the content you want users to see. Prefer an explicit resource version so the embedded URL is stable.

For example, a service visualizer may have this URL:

```text
https://catalog.example.com/visualiser/services/order-service/1.0.0
```

### 2. Enable embed mode

Add `embed=true` to the query string:

```text
https://catalog.example.com/visualiser/services/order-service/1.0.0?embed=true
```

Use `&embed=true` instead when the URL already has query parameters.

### 3. Add the iframe

Give the container a concrete height and let the iframe fill it:

```html
<div style="height: 700px; width: 100%;">
  <iframe
    src="https://catalog.example.com/visualiser/services/order-service/1.0.0?embed=true"
    title="Order service architecture"
    loading="lazy"
    style="border: 0; display: block; height: 100%; width: 100%;"
  ></iframe>
</div>
```

`height: 100%` only works when the iframe's ancestors have a defined height. Use a fixed, viewport-relative, or layout-controlled height in the host application.

### 4. Select a theme

Add `theme=light` or `theme=dark` to force the embedded page's color mode:

```html
<iframe
  src="https://catalog.example.com/schemas/explorer?embed=true&theme=dark"
  title="Schema explorer"
></iframe>
```

If you omit `theme`, EventCatalog uses the visitor's saved EventCatalog preference or their system preference.

## Embed URL reference

Replace `https://catalog.example.com` with the URL of your deployed catalog.

| Feature | URL pattern |
| --- | --- |
| Resource documentation | `/docs/{collection}/{id}/{version}?embed=true` |
| Resource visualizer | `/visualiser/{collection}/{id}/{version}?embed=true` |
| Discovery table | `/discover/{collection}?embed=true` |
| Entity map | `/visualiser/{collection}/{id}/{version}/entity-map?embed=true` |
| Data dependency view | `/visualiser/{collection}/{id}/{version}/data?embed=true` |
| Schema explorer | `/schemas/explorer?embed=true` |
| Schema details | `/schemas/{type}/{id}/{version}?embed=true` |
| Architecture Graph | `/visualiser/graph?embed=true` |
| System Context Map overview | `/visualiser/system-context-map?embed=true` |
| System-specific context map | `/visualiser/systems/{id}/{version}/context?embed=true` |
| Flow visualizer | `/visualiser/flows/{id}/{version}?embed=true` |

Collections use their plural route names, such as `domains`, `systems`, `services`, `events`, `commands`, `queries`, `flows`, and `entities`. Schema detail pages support message types such as `events`, `commands`, and `queries`, as well as data product contracts.

### Focus the Architecture Graph

Use `focus={collection}/{id}` to select the initial resource and `depth` to choose how many relationship hops are visible. `depth` accepts `1`, `2`, or `3`.

```text
https://catalog.example.com/visualiser/graph?embed=true&focus=services/order-service&depth=2
```

The Architecture Graph must be enabled in `eventcatalog.config.js`:

```js title="eventcatalog.config.js"
module.exports = {
  visualiser: {
    architectureGraph: {
      enabled: true,
    },
  },
};
```

## Troubleshooting

### EventCatalog shows a license overlay

Confirm that the deployed catalog was built or started with a valid Scale license. Add the key to the EventCatalog project's environment:

```bash title=".env"
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

Then rebuild and redeploy the catalog. See [Getting a license key for EventCatalog Scale](/docs/development/license-keys/plans).

### Navigation is still visible

Confirm that the URL contains `embed=true`, including the exact lowercase value `true`.

### The iframe is blank or blocked

Open the iframe URL directly in the same browser. Confirm that it is reachable and that the user can authenticate. Then check the browser console for Content Security Policy, mixed-content, or iframe permission errors from either application.

### The content does not fill the available height

Set an explicit height on the iframe's parent and keep the iframe at `height: 100%`. Check every ancestor if you use a percentage height.

## Backstage

If your host application is Backstage, use the [EventCatalog Backstage plugin](/docs/plugins/backstage/overview). It supplies React components, resolves EventCatalog resources from Backstage entity annotations, and constructs the embed URLs for you.
