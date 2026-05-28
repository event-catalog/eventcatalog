---
"@eventcatalog/connectors": minor
"@eventcatalog/core": patch
"@eventcatalog/sdk": patch
---

Add Microsoft Entra directory connector for syncing users and teams from Microsoft Entra ID (Azure AD).

- `@eventcatalog/connectors`: new `microsoftEntraDirectory` connector export and docs
- `@eventcatalog/sdk`: `Team`/`User` source now supports an optional `id`, and `User.avatarUrl` is now optional
- `@eventcatalog/core`: render the Microsoft Entra directory source badge with an Azure icon
