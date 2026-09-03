---
'@eventcatalog/core': patch
---

fix(auth): pin issuer on the GitHub auth provider so RFC 9207 `iss` validation no longer fails with `unexpected "iss" (issuer) response parameter value` when an older @auth/core copy is hoisted in user projects
