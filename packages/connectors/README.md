# @eventcatalog/connectors

Connectors for syncing external systems into EventCatalog.

## GitHub

```js
// eventcatalog.config.js
import { githubDirectory } from "@eventcatalog/connectors";

export default {
  directory: {
    sources: [
      githubDirectory({
        org: "acme",
        teams: ["platform", "architecture"],
        users: true,
        token: process.env.GITHUB_TOKEN,
      }),
    ],
  },
};
```

## Microsoft Entra ID

Sync selected Microsoft Entra ID groups into EventCatalog teams, and sync their
direct user members into EventCatalog users.

```js
// eventcatalog.config.js
import { microsoftEntraDirectory } from "@eventcatalog/connectors";

export default {
  directory: {
    sources: [
      microsoftEntraDirectory({
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        groups: [
          {
            id: "00000000-0000-0000-0000-000000000000",
            alias: "platform",
          },
          {
            displayName: "Architecture Guild",
          },
        ],
      }),
    ],
  },
};
```

The connector uses Microsoft Graph with the OAuth client credentials flow.
Create an app registration in Microsoft Entra ID, add read-only Microsoft Graph
application permissions for reading groups, users, and group members, grant
admin consent, then create a client secret for the build environment.

Groups can be configured by stable `id` or exact `displayName`. Group IDs are
recommended. If a `displayName` lookup finds no groups or multiple groups, the
connector fails and asks you to use the group ID.

Selected groups become EventCatalog teams. Team IDs use `alias` when provided,
otherwise they are slugified from the Entra group display name. Only direct user
members are synced. Disabled users are excluded by default; set
`includeDisabledUsers: true` to include them.

```js
microsoftEntraDirectory({
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  groups: [{ id: "00000000-0000-0000-0000-000000000000" }],
  includeDisabledUsers: true,
  graphBaseUrl: "https://graph.microsoft.com/v1.0",
  tokenUrl: "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token",
});
```

External directory sources require EventCatalog Scale when loaded by EventCatalog.

Custom directory sources can use the same contract:

```js
import { defineDirectorySource } from "@eventcatalog/connectors";

export const companyDirectory = defineDirectorySource({
  type: "directory",
  name: "company-directory",

  async loadTeams() {
    return [
      {
        id: "platform",
        name: "Platform",
        members: ["alice"],
        source: {
          provider: "company-directory",
        },
      },
    ];
  },

  async loadUsers() {
    return [
      {
        id: "alice",
        name: "Alice",
        avatarUrl: "https://example.com/alice.png",
        source: {
          provider: "company-directory",
        },
      },
    ];
  },
});
```
