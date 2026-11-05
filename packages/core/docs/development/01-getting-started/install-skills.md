---
sidebar_position: 3.5
keywords:
- AI Skills
- Claude Code
- documentation generation
- installation
sidebar_label: Install Skills
title: Install Skills
description: Install EventCatalog Skills so your AI agent can document your architecture with EventCatalog.
---

EventCatalog Skills are pre-built instructions that teach AI agents how to work with your EventCatalog project. Install a skill and your AI agent gains the ability to generate correct documentation, following EventCatalog conventions and best practices.

Skills work with any AI coding agent that supports the skills format (e.g. [Claude Code](https://claude.ai/code)).

**Source code:** [github.com/event-catalog/skills](https://github.com/event-catalog/skills)

## Why use skills?

When you ask an AI agent to generate EventCatalog documentation, it doesn't know about EventCatalog's frontmatter format, folder structure, or component conventions. Skills solve this by providing the agent with structured instructions and reference material.

With skills installed, you can ask your agent things like:

- "Document my OrderService that receives OrderCreated events and sends OrderConfirmed events"
- "Create a Payments domain with a PaymentService, PaymentProcessed event, and ProcessPayment command"
- "Look at my src/ directory and generate EventCatalog documentation for the services and events you find"
- "Document the checkout flow from cart submission through payment processing to order confirmation"
- "Use this Structurizr DSL file to map our C4 model into my catalog"
- "Write a fitness function that fails CI when two services share a database"

The agent will generate properly formatted `index.mdx` files with correct frontmatter, schemas, and visualizations.

## Available skills

| Skill | What it does |
|-------|-------------|
| [Catalog Documentation Creator](https://github.com/event-catalog/skills/tree/main/skills/catalog-documentation-creator) | Generates EventCatalog documentation (domains, systems, services, agents, messages, channels, flows, data stores, ADRs, data products and entities) with the correct frontmatter, folder structure and best practices. Code to Catalog and C4 to EventCatalog use it to write their files. |
| [Code to Catalog](https://github.com/event-catalog/skills/tree/main/skills/code-to-catalog) | Scans your codebase, proposes an architecture model, asks you about the decisions it can't work out from the code, and writes a plan before documenting it. Works for new catalogs, and for catalogs that have drifted from the code. |
| [C4 to EventCatalog](https://github.com/event-catalog/skills/tree/main/skills/c4-to-eventcatalog) | Maps a C4 model (Structurizr, LikeC4, C4-PlantUML, Mermaid C4, or a diagram) into your catalog. |
| [Flow Wizard](https://github.com/event-catalog/skills/tree/main/skills/flow-wizard) | Documents a business or agent flow step by step in a conversation, linking the services, agents and messages already in your catalog. |
| [Fitness Functions](https://github.com/event-catalog/skills/tree/main/skills/fitness-functions) | Turns an architecture rule you describe in plain language into a [fitness function](/docs/development/guides/fitness-functions/what-are-fitness-functions), runs it, and adds it to your CI. |
| [Custom Pages and APIs](https://github.com/event-catalog/skills/tree/main/skills/custom-pages-and-apis) | Builds custom pages and API routes inside your catalog, with access to your catalog's data, and adds them to the navigation. |

## Install skills

### CLI install (recommended)

Use [npx skills](https://github.com/vercel-labs/skills) to install skills directly into your project:

```bash
# Install all EventCatalog skills
npx skills add event-catalog/skills

# Install a specific skill
npx skills add event-catalog/skills --skill catalog-documentation-creator
```

This copies the skill files into your project's `.claude/skills/` directory where your AI agent can access them.

### Clone and copy

Clone the repository and copy the skills you need:

```bash
git clone https://github.com/event-catalog/skills.git
cp -r skills/skills/catalog-documentation-creator .claude/skills/
```

### Git submodule

Add as a submodule for easy updates:

```bash
git submodule add https://github.com/event-catalog/skills.git .claude/skills/eventcatalog
```

When new skills are released, pull updates with:

```bash
git submodule update --remote
```

### Fork and customize

Fork the repository and tailor skills to your team's conventions:

1. Fork [event-catalog/skills](https://github.com/event-catalog/skills) on GitHub
2. Modify skills to match your naming conventions, ownership patterns, and schema formats
3. Install from your fork:

```bash
npx add-skill https://github.com/YOUR_ORG/eventcatalog-skills
```

This is useful when your team has specific conventions for IDs, owners, or folder structures that differ from the defaults.
