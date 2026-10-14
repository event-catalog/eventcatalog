---
sidebar_position: 3
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

The agent will generate properly formatted `index.mdx` files with correct frontmatter, schemas, and visualizations.

## Available skills

| Skill | Description |
|-------|-------------|
| [Catalog Documentation Creator](https://github.com/event-catalog/skills) | Generates EventCatalog documentation files (services, events, commands, queries, domains, flows, channels, containers) with correct frontmatter, folder structure, and best practices. |
| [Flow Wizard](https://github.com/event-catalog/skills) | Guides you through documenting a business flow step by step in a conversational session, cross-referencing your existing catalog resources to link services, events, and commands automatically. |

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
