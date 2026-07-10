---
sidebar_position: 1
keywords:
- EventCatalog custom documentation
sidebar_label: Introduction
title: Bring your own documentation
description: Bring your own documentation to EventCatalog
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

EventCatalog lets you bring your own documentation and diagrams into your catalog.

This is useful when your documentation is spread across multiple repositories, project folders, wikis, or internal tools. You can bring that context into EventCatalog and make it part of the same experience people already use to explore your architecture.

You can document anything that helps your teams understand, operate, and govern your systems, including:

- Team onboarding documentation
- Best practices and engineering standards
- Runbooks and operational guides
- CI/CD and deployment documentation
- User journeys and business processes
- Technical debt and migration notes

EventCatalog has a few ways to bring your own information to your catalog:

1. [High level documentation](#high-level-documentation)
   - for catalog-wide knowledge that is not tied to one specific resource
1. [Resource-level documentation](#resource-level-documentation)
   - for documentation attached to a specific domain, service, event, API, or other catalog resource
1. [Diagrams](/docs/development/bring-your-own-documentation/diagrams/introduction)
   -  bring your own diagrams (e.g Miro, DrawIO, Mermaid) to your catalog.

---

### High level documentation

High level documentation is for top-level knowledge that should live in your catalog but does not belong to one specific resource.

Use high level documentation for things like engineering standards, onboarding guides, architecture principles, platform runbooks, team processes, or shared API guidance. These pages appear in your catalog's documentation area and can be organized independently from your domains, services, and events.

[Read the high level documentation guide](/docs/development/bring-your-own-documentation/custom-pages/introduction).

### Resource-level documentation

Resource-level documentation is for knowledge that belongs with a specific EventCatalog resource.

Use resource-level documentation when the context should appear next to the thing it describes. For example, you can attach service runbooks to a service, onboarding material to a domain, operational notes to a system, or extra API documentation to an API.

EventCatalog renders this documentation alongside the resource, so readers can move between the resource overview and its supporting documentation without leaving the catalog.

[Read the resource-level documentation guide](/docs/development/bring-your-own-documentation/resource-docs/introduction).
