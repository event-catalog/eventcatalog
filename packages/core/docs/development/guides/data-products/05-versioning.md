---
sidebar_position: 5
keywords:
- EventCatalog data products
sidebar_label: Versioning
title: Versioning
description: Version data products and track changes
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.8.0" />

Data products follow semantic versioning to track schema changes, input/output modifications, and business logic updates.

## Why version data products?

Versioning helps teams:

- Track schema evolution over time
- Identify breaking changes before deployment
- Support multiple versions simultaneously
- Communicate changes to consumers
- Maintain historical documentation

## Semantic versioning

Data products use semantic versioning with the format `MAJOR.MINOR.PATCH`.

**MAJOR** version changes indicate breaking changes to outputs, schemas, or contracts.

**MINOR** version changes add new outputs or non-breaking enhancements.

**PATCH** version changes fix bugs or update documentation without affecting outputs.

```md
---
id: payment-analytics
name: Payment Analytics
version: 1.0.0  # MAJOR.MINOR.PATCH
---
```

## Creating versions

Create a `versioned` folder within your data product directory to store previous versions.

```
/data-products
  /PaymentAnalytics
    index.mdx                    # Current version (1.2.0)
    payment-contract.json
    /versioned
      /1.0.0
        index.mdx
        payment-contract.json
      /1.1.0
        index.mdx
        payment-contract.json
```

The root `index.mdx` always represents the latest version.

## Versioning workflow

When making changes to a data product:

1. Copy the current `index.mdx` and related files to a new versioned folder
2. Update the version number in the root `index.mdx`
3. Make your changes to the root files
4. Document changes in the changelog

```bash
# Create new version folder
mkdir -p data-products/PaymentAnalytics/versioned/1.1.0

# Copy current files
cp data-products/PaymentAnalytics/index.mdx data-products/PaymentAnalytics/versioned/1.1.0/
cp data-products/PaymentAnalytics/payment-contract.json data-products/PaymentAnalytics/versioned/1.1.0/

# Update root version
# Edit index.mdx: version: 1.2.0
```

## Breaking changes

Breaking changes require a major version bump and clear communication to consumers.

Examples of breaking changes:

- Removing or renaming output fields
- Changing field types
- Removing outputs
- Modifying contract requirements
- Changing input dependencies significantly

```md title="Breaking change example"
---
id: payment-analytics
version: 2.0.0  # Major version bump
summary: Breaking change - renamed fraud_score to risk_score
---

## Breaking Changes in v2.0.0

- **Renamed field**: `fraud_score` → `risk_score`
- **Removed field**: `legacy_status` (deprecated in v1.5.0)
- **Type change**: `transaction_date` now returns ISO 8601 format
```

## Non-breaking changes

Minor versions add functionality without breaking existing consumers.

Examples of non-breaking changes:

- Adding new output fields
- Adding new outputs
- Adding new inputs
- Enhancing documentation
- Adding optional filters or parameters

```md title="Non-breaking change example"
---
id: payment-analytics
version: 1.3.0  # Minor version bump
summary: Added chargeback metrics to output schema
---

## What's New in v1.3.0

- **New field**: `chargeback_rate` added to output schema
- **New output**: `ChargebackAlert` event for high-risk transactions
```

## Version references

When referencing data products from other resources, you can pin to specific versions or use `latest`.

```md title="Service referencing data product"
---
id: reporting-service
name: Reporting Service
version: 1.0.0

# Pin to specific version
inputs:
  - id: payment-analytics
    version: 1.2.0

# Use latest version (default)
inputs:
  - id: order-analytics
    version: latest
---
```

Omitting the version defaults to `latest`:

```md
inputs:
  - id: payment-analytics  # Defaults to latest
```

## Changelog

Document version changes in a `changelog.mdx` file within your data product directory.

```
/data-products
  /PaymentAnalytics
    index.mdx
    changelog.mdx
    payment-contract.json
```

```md title="changelog.mdx"
---
createdAt: 2026-01-15
---

## 1.3.0

### Added
- Chargeback metrics to output schema
- ChargebackAlert event for high-risk transactions

### Changed
- Improved fraud detection model accuracy

## 1.2.0

### Added
- Revenue attribution by channel
- Gateway performance metrics

### Fixed
- Currency conversion edge cases

## 1.1.0

### Added
- Real-time payment success rate
- Authorization rate metrics

## 1.0.0

Initial release of Payment Analytics data product.
```

EventCatalog automatically links changelogs to data product pages.

## Deprecation

Mark data products as deprecated when planning to sunset them.

```md
---
id: payment-analytics-v1
version: 1.0.0
deprecated:
  message: Migrate to PaymentAnalyticsV2 for improved performance
  date: 2026-06-01
badges:
  - content: Deprecated
    backgroundColor: red
    textColor: red
---

:::warning Deprecation Notice

This data product will be sunset on June 1, 2026. Migrate to PaymentAnalyticsV2.

:::
```
## Next steps

- [Add to domains](/docs/development/guides/data-products/adding-to-domains)
- [Changelog documentation](/docs/development/guides/changelogs/introduction)
- [Data product API reference](/docs/api/data-product-api)
