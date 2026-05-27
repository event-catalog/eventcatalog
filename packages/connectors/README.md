# @eventcatalog/connectors

Connectors for syncing external systems into EventCatalog.

```js
// eventcatalog.config.js
import { githubDirectory } from "@eventcatalog/connectors";

export default {
  directory: {
    sources: [
      githubDirectory({
        org: "acme",
        teams: true,
        users: true,
        token: process.env.GITHUB_TOKEN,
      }),
    ],
  },
};
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
