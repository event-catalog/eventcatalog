---
sidebar_position: 5
sidebar_label: Share assets and components
title: Share public assets and custom components through Federation
description: Include source catalog images, files, and custom components in the organization catalog.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Federation includes top-level `public/` assets and `components/` custom components from source catalogs.

Use this guide when federated resource pages depend on images, downloadable files, or custom components owned by the source catalog.

## Add a public asset to a source catalog

Keep the asset under the source catalog's `public/` directory:

```text
payments-catalog/
├── public/
│   └── payments/
│       └── payment-flow.svg
└── services/
    └── payment-service/
        └── index.mdx
```

Reference it from the source documentation as you normally would:

```mdx
![Payment flow](/payments/payment-flow.svg)
```

Run Federation from the central catalog:

```bash
npx eventcatalog federate
```

The asset is composed into the central `public/` directory so the federated page can use the same URL.

## Avoid public asset collisions

Use namespaced paths such as `public/payments/` and `public/orders/` rather than generic names such as `public/diagram.svg`.

When remote sources publish different content to the same path:

1. Federation reports `federation/asset-collision`.
2. The last configured source wins.
3. Verbose output names the path, sources, and winner.

An existing public file owned by the central catalog is preserved instead of being overwritten by a remote source.

## Understand managed public files

`eventcatalog.lock` stores hashes and provenance for public files copied by Federation. On a later run, Federation can update or remove a file while avoiding deletion of a file that a user changed or the central catalog owns.

If a previously managed file has been edited directly in the central `public/` directory, Federation preserves it.

## Add a custom component to a source catalog

Keep the component under the source catalog's top-level `components/` directory:

```text
payments-catalog/
├── components/
│   └── PaymentStatus.astro
└── services/
    └── payment-service/
        └── index.mdx
```

Use it in source documentation through the normal EventCatalog custom component alias:

```mdx
import PaymentStatus from '@catalog/components/PaymentStatus.astro';

<PaymentStatus status="available" />
```

Federation creates a shared `federated/components/` layer. When EventCatalog prepares the site, it combines federated components with the central catalog's own `components/` directory.

## Override a federated component centrally

Create a component at the same relative path in the central catalog:

```text
central-catalog/
└── components/
    └── PaymentStatus.astro
```

The central component overrides the federated component. Use this deliberately when the organization view needs a shared presentation that differs from the team catalog.

Remote component path collisions are reported as asset collisions. Use source-specific component directories when components are not intended to be shared.

## Install component dependencies centrally

Federation copies component source files, not the source catalog's `package.json` dependencies. If a custom component imports an npm package, install a compatible dependency in the central catalog.

Prefer self-contained components or document their central dependencies clearly.

## Rerun after component changes

Rerun Federation after changing a source component:

```bash
npx eventcatalog federate
```

Local file watching does not currently resynchronize components from another catalog.

:::info Reusable snippets

Top-level `snippets/` dependencies are not federated in the current release. A federated page should not import a snippet that exists only in its source catalog.

:::

## Next steps

- [Understand generated Federation files](/docs/federation/reference/generated-output)
- [Configure asset collision severity](/docs/federation/how-to/configure-validation-rules#keep-asset-collisions-visible)
- [Troubleshoot asset and component problems](/docs/federation/reference/troubleshooting#public-assets-or-components-are-not-correct)
