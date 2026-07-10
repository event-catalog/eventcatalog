---
sidebar_position: 1
sidebar_label: Introduction
title: Resource-level documentation
description: Attach documentation pages to any resource in your catalog.
keywords:
  - EventCatalog resource-level documentation
  - ADRs
  - runbooks
  - resource-level documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="3.15.0" />
<PlanBanner plan="Scale" />

Resource-level documentation lets you attach documentation pages directly to any resource in your catalog. Instead of keeping ADRs, runbooks, contracts, and guides in a separate tool, you can place them alongside the resource they describe.

![](./img/docs.png)

Attached docs appear in the resource sidebar, grouped by custom defined types, so readers can navigate between the resource overview and its supporting documentation without leaving the catalog.

### Supported resources

Resource-level documentation can be attached to any of the following resource types:

- Domains and subdomains
- Services
- Events, Commands, Queries
- Flows, Channels, Containers, Entities, Data products
