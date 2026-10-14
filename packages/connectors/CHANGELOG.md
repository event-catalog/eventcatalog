# @eventcatalog/connectors

## 0.2.2-beta.0

### Patch Changes

- 3b46a41: `@eventcatalog/core` 5.0.0 (including its pre-releases) and later is licensed under the Business Source License 1.1 (`BUSL-1.1`), replacing the MIT License and the separate EventCatalog Commercial License for the enterprise and federation code. Releases up to and including 4.x remain available under the MIT License, and their notice is kept in `NOTICE`.

  The ecosystem packages, including `@eventcatalog/create-eventcatalog`, stay MIT and now ship their own `LICENSE` file. New catalogs get a License section in their README that links to the Business Source License and notes that the catalog's own content belongs to its authors. `@eventcatalog/breaking-changes` moves from ISC to MIT.

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
