---
sidebar_position: 2
keywords:
- AI Skills
- installation
sidebar_label: Installation
title: Installing AI Skills
description: How to install EventCatalog AI skills for your AI coding agent
---

## CLI install (recommended)

Use [npx skills](https://github.com/vercel-labs/skills) to install skills directly into your project:

```bash
# Install all EventCatalog skills
npx skills add event-catalog/skills

# Install a specific skill
npx skills add event-catalog/skills --skill catalog-documentation-creator
```

This copies the skill files into your project's `.claude/skills/` directory where your AI agent can access them.

## Clone and copy

Clone the repository and copy the skills you need:

```bash
git clone https://github.com/event-catalog/skills.git
cp -r skills/skills/catalog-documentation-creator .claude/skills/
```

## Git submodule

Add as a submodule for easy updates:

```bash
git submodule add https://github.com/event-catalog/skills.git .claude/skills/eventcatalog
```

When new skills are released, pull updates with:

```bash
git submodule update --remote
```

## Fork and customize

Fork the repository and tailor skills to your team's conventions:

1. Fork [event-catalog/skills](https://github.com/event-catalog/skills) on GitHub
2. Modify skills to match your naming conventions, ownership patterns, and schema formats
3. Install from your fork:

```bash
npx add-skill https://github.com/YOUR_ORG/eventcatalog-skills
```

This is useful when your team has specific conventions for IDs, owners, or folder structures that differ from the defaults.
