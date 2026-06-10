# @eventcatalog/connectors

## 0.2.1

### Patch Changes

- a793c2e: Add support for external schema sources, including a new git schema source connector. Messages can now reference schemas by `ref` resolved through configurable schema sources, and the sidebar reflects the resolved schema format.

## 0.2.0

### Minor Changes

- 3334ab1: Add Microsoft Entra directory connector for syncing users and teams from Microsoft Entra ID (Azure AD).
  - `@eventcatalog/connectors`: new `microsoftEntraDirectory` connector export and docs
  - `@eventcatalog/sdk`: `Team`/`User` source now supports an optional `id`, and `User.avatarUrl` is now optional
  - `@eventcatalog/core`: render the Microsoft Entra directory source badge with an Azure icon

## 0.1.0

### Minor Changes

- 6b7fc3c: Add directory connectors for syncing users and teams from external sources (e.g. GitHub organizations) into EventCatalog collections. Introduces the new `@eventcatalog/connectors` package and `directory.sources` configuration in `eventcatalog.config`.
