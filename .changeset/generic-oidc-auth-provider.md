---
'@eventcatalog/core': minor
'@eventcatalog/create-eventcatalog': patch
---

Sign in with any OpenID Connect provider (JumpCloud, Keycloak, PingIdentity, OneLogin, ...) by adding `providers.oidc` to `eventcatalog.auth.js` with its `issuer`, `clientId` and `clientSecret`. Give it a `name` for the login button, and set `groupsClaim` and `rolesClaim` to say which claims hold the user's groups and roles, for access rules in your middleware. New catalogs include a commented-out example.
