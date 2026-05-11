---
sidebar_position: 1
keywords:
- EventCatalog custom documentation
sidebar_label: Introduction
title: Bring your own documentation
description: Bring your own documentation to EventCatalog
---

EventCatalog allows you to centralise architecture documentation alongside your domains, services, and events — keeping knowledge and context in one place.

Common use cases include:

- Architecture decision records (ADRs)
- Infrastructure & operations runbooks
- CI/CD documentation
- User journeys
- API documentation
- Technical debt tracking
- Team processes
- Onboarding information
- Best practices & standards

EventCatalog provides two ways to bring your own documentation to your catalog:

1. [Global documentation](#1-global-documentation) 
   - for cross-cutting and catalog-wide knowledge
2. [Resource-level documentation](#2-resource-level-documentation) 
   - for implementation details tied to a specific resoruce (e.g domain, service, or event)

---

### Global documentation

Global documentation can be used to document cross-cutting and catalog-wide knowledge. 
You can bring your own documentation to your catalog and have your own documentation section (/docs/custom/) regardless of EventCatalog resources.

[Read the custom pages guide](/docs/guides/bring-your-own-documentation/custom-pages).

### Resource-level documentation

Resource-level documentation can be used to document implementation details tied to a specific EventCatalog resource (e.g domain, service, or event).

This can be useful if you want to document details tied to a specific domain, service, message, data product, etc.

EventCatalog will render your custom documentation alongside the resource it is tied to in the sidebar.

[Read the resource docs guide](/docs/guides/bring-your-own-documentation/resource-docs).