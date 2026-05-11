---
sidebar_position: 1
keywords:
- AI Skills
- Claude Code
- documentation generation
sidebar_label: Introduction
title: AI Skills
description: Pre-built AI skills to help you document your architecture with EventCatalog
---

EventCatalog Skills are pre-built instructions that teach AI agents how to work with your EventCatalog project. Install a skill and your AI agent gains the ability to generate correct documentation, following EventCatalog conventions and best practices.

Skills work with any AI coding agent that supports the skills format (e.g. [Claude Code](https://claude.ai/code)).

## Why use skills?

When you ask an AI agent to generate EventCatalog documentation, it doesn't know about EventCatalog's frontmatter format, folder structure, or component conventions. Skills solve this by providing the agent with structured instructions and reference material.

With skills installed, you can ask your agent things like:

- "Document my OrderService that receives OrderCreated events and sends OrderConfirmed events"
- "Create a Payments domain with a PaymentService, PaymentProcessed event, and ProcessPayment command"
- "Look at my src/ directory and generate EventCatalog documentation for the services and events you find"
- "Document the checkout flow from cart submission through payment processing to order confirmation"

The agent will generate properly formatted `index.mdx` files with correct frontmatter, schemas, and visualizations.

## Available skills

| Skill | Description |
|-------|-------------|
| [Catalog Documentation Creator](https://github.com/event-catalog/skills) | Generates EventCatalog documentation files (services, events, commands, queries, domains, flows, channels, containers) with correct frontmatter, folder structure, and best practices. |
| [Flow Wizard](https://github.com/event-catalog/skills) | Guides you through documenting a business flow step by step in a conversational session, cross-referencing your existing catalog resources to link services, events, and commands automatically. |

## Getting started

Head to the [installation guide](/docs/development/ask-your-architecture/skills/installation) to add skills to your project.

**Source code:** [github.com/event-catalog/skills](https://github.com/event-catalog/skills)
