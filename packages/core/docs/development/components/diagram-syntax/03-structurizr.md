---
sidebar_position: 3
keywords:
- mermaid
sidebar_label: Structurizr
title: Using Structurizr
description: Understanding how to use Structurizr with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.56.4" />

You can embed your [Structurizr diagrams](https://structurizr.com/) into your EventCatalog pages using the [`<MermaidFileLoader />`](/docs/development/components/components/mermaid-file-loader) component.

You will need to export your Structurizr diagrams into mermaid files and then use the [`<MermaidFileLoader />`](/docs/development/components/components/mermaid-file-loader) component to embed them into your EventCatalog pages.

## How to export your Structurizr diagrams into mermaid files

You will need to use the Structurizr CLI to export your diagrams into mermaid files.

1. [Install the Structurizr CLI](https://docs.structurizr.com/cli/installation)
2. [Export your diagrams into mermaid files](https://docs.structurizr.com/cli/export)
3. Use the [`<MermaidFileLoader />`](/docs/development/components/components/mermaid-file-loader) component to embed them into your EventCatalog pages.
