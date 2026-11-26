---
'@eventcatalog/core': minor
'@eventcatalog/create-eventcatalog': patch
---

Sign in with any OpenID Connect provider (JumpCloud, Keycloak, PingIdentity, OneLogin, ...) by adding `providers.oidc` to `eventcatalog.auth.js` with its `issuer`, `clientId` and `clientSecret`. Give it a `name` for the login button, and set `groupsClaim` and `rolesClaim` to say which claims hold the user's groups and roles, for access rules in your middleware. The authorize request sends a `state` parameter as well as PKCE by default, so strict identity providers such as JumpCloud accept it; set `checks` to use a different set. New catalogs include a commented-out example.
