---
sidebar_position: 1

keywords:
- EventCatalog
- domain 
- owners
sidebar_label: Adding domain owners
title: Adding domain owners
description: Adding owners to domains with EventCatalog.
---

You can assign owners to your domains to provide context of who owns this domain and how to contact them.

Owners in EventCatalog are either [**users**](/docs/development/guides/owners/users/introduction) or [**teams**](/docs/development/guides/owners/teams/introduction) and are **optional**.

## Adding owners to a domain

To add owners to a domain you need to add them to the `owners` array within your domain frontmatter API.

```md title="/domains/Orders/index.mdx (example)"
---
id: PaymentDomain
... # other domain frontmatter
owners:
    - dboyne # represents a user
    - webTeam # represents a team
---

<!-- Markdown contents... -->

```

Assigning owners to your domains can provide others with context of who owns this domain and how to contact them.


