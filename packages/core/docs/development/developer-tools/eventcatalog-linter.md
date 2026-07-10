---
sidebar_position: 1
keywords:
- EventCatalog linter
- schema validation
- reference validation
- CI/CD
- quality assurance
sidebar_label: EventCatalog Linter
title: EventCatalog Linter
description: Validate your EventCatalog frontmatter schemas and resource references with the comprehensive EventCatalog Linter
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A comprehensive linter for EventCatalog that validates frontmatter schemas and resource references to ensure your architecture documentation is correct and consistent.

The EventCatalog Linter helps you catch issues early in your development process, ensuring your documentation maintains high quality and accuracy across all your EventCatalog resources.

## Use cases

- **Quality Assurance**: Ensure your documentation is correct and consistent
- **CI/CD**: Integrate the linter into your CI/CD pipeline to catch issues early
- **Documentation**: Run the linter regularly as part of your development workflow
- **Version Consistency**: Use consistent version patterns across your EventCatalog resources

## Features

- **📋 Schema Validation**: Validates all resource frontmatter against defined schemas using Zod
- **🔗 Reference Validation**: Ensures all referenced resources (services, events, domains, etc.) actually exist
- **📦 Semver Version Support**: Supports semantic versions, ranges (`^1.0.0`, `~1.2.0`), x-patterns (`0.0.x`), and `latest`
- **⚙️ Configurable Rules**: Optional `.eventcatalogrc.js` config file for customizing rule severity and behavior
- **🚫 Ignore Patterns**: Skip validation for specific file patterns (archived, drafts, etc.)
- **🎯 Rule Overrides**: Apply different rules to different file patterns for flexible team workflows
- **🎯 Comprehensive Coverage**: Supports all EventCatalog resource types
- **⚡ Fast Performance**: Efficiently scans large catalogs
- **🎨 ESLint-Inspired Output**: Clean, file-grouped error reporting with severity levels
- **⚠️ Warnings Support**: Distinguish between errors and warnings with `--fail-on-warning` option

### Supported Resource Types

The linter validates all EventCatalog resource types:

- 🏢 **Domains** (including subdomains)
- ⚙️ **Services**
- 📨 **Events**
- 📤 **Commands**
- ❓ **Queries**
- 📡 **Channels**
- 🔄 **Flows**
- 📊 **Entities**
- 🤖 **Agents**
- 🧱 **Containers** (including the legacy data store alias)
- 📈 **Data Products**
- 🧭 **Diagrams**
- 📝 **ADRs**
- 👤 **Users**
- 👥 **Teams**

<AddedIn version="1.2.0" />

Agents, Containers, Data Products, Diagrams, and ADRs are validated as of version 1.2.0.

## Quick Start

Get started with the EventCatalog Linter in three simple steps:

### 1. Run the Linter

Start linting your EventCatalog immediately with npx:

```bash
npx @eventcatalog/linter
```

### 2. Configure Rules (Optional)

Create a `.eventcatalogrc.js` file in your EventCatalog root to customize validation:

```javascript
module.exports = {
  rules: {
    'best-practices/summary-required': 'warn',
    'refs/owner-exists': 'error'
  },
  ignorePatterns: ['**/drafts/**']
};
```

### 3. Integrate with CI/CD

Add to your CI/CD pipeline for automated validation:

```yaml
# GitHub Actions
- run: npx @eventcatalog/linter --fail-on-warning
```

## Installation

### Use with npx (Recommended)

<Tabs>
  <TabItem value="npm">
```bash
npx @eventcatalog/linter
```
</TabItem>
<TabItem value="pnpm">
```bash
pnpm dlx @eventcatalog/linter
```
</TabItem>
</Tabs>

### Global Installation

<Tabs>
  <TabItem value="npm">
```bash
npm install -g @eventcatalog/linter
```
</TabItem>
<TabItem value="pnpm">
```bash
pnpm install -g @eventcatalog/linter
```
</TabItem>
</Tabs>

### Add to your project

<Tabs>
  <TabItem value="npm">
```bash
npm install --save-dev @eventcatalog/linter
```
</TabItem>
<TabItem value="pnpm">
```bash
pnpm install --save-dev @eventcatalog/linter
```
</TabItem>
</Tabs>

## Usage

### Basic Usage

Run the linter in your EventCatalog directory:

```js
// Lint current directory
eventcatalog-linter

// Lint specific directory
eventcatalog-linter ./my-eventcatalog

// Verbose output with detailed information
eventcatalog-linter --verbose

// Show help
eventcatalog-linter --help
```

### CLI Options

```
Usage: eventcatalog-linter [options] [directory]

Arguments:
  directory              EventCatalog directory to lint (default: ".")

Options:
  -V, --version          output the version number
  -v, --verbose          Show verbose output (default: false)
  --fail-on-warning      Exit with non-zero code on warnings (default: false)
  -h, --help             display help for command
```

## Configuration

The EventCatalog Linter supports optional configuration through a `.eventcatalogrc.js` file in your catalog root directory. This allows you to:

- Turn rules on/off 
- Configure rule severity levels (error, warn, off)
- Ignore specific file patterns
- Override rules for specific file patterns

### Quick Start with Configuration

Create a `.eventcatalogrc.js` file in your EventCatalog root directory:

```javascript
// .eventcatalogrc.js
module.exports = {
  rules: {
    // Schema validation rules
    'schema/required-fields': 'error',
    'schema/valid-semver': 'error', 
    'schema/valid-email': 'warn',
    
    // Reference validation rules
    'refs/owner-exists': 'error',
    'refs/valid-version-range': 'error',
    
    // Best practice rules
    'best-practices/summary-required': 'warn',
    'best-practices/owner-required': 'error',
  },
  
  // Ignore certain paths
  ignorePatterns: ['**/archived/**', '**/drafts/**'],
  
  // Override rules for specific file patterns
  overrides: [
    {
      files: ['**/experimental/**'],
      rules: {
        'best-practices/owner-required': 'off'
      }
    }
  ]
};
```

### Rule Severity Levels

- **`'error'`** - Causes the linter to exit with error code 1
- **`'warn'`** - Shows warnings but allows the linter to pass (unless `--fail-on-warning` is used)
- **`'off'`** - Disables the rule completely

### Available Rules

| Rule Name | Description | Accepted Values | Default |
|-----------|-------------|-----------------|----------|
| **Schema Validation Rules** |
| `schema/required-fields` | Validates that required fields are present in frontmatter | `error`, `warn`, `off` | `error` |
| `schema/valid-type` | Validates that field types are correct (strings, arrays, objects) | `error`, `warn`, `off` | `error` |
| `schema/valid-semver` | Validates semantic version format (1.0.0, 2.1.3-beta) | `error`, `warn`, `off` | `error` |
| `schema/valid-email` | Validates email address format in user frontmatter | `error`, `warn`, `off` | `error` |
| `schema/validation-error` | General schema validation errors | `error`, `warn`, `off` | `error` |
| **Reference Validation Rules** |
| `refs/owner-exists` | Ensures referenced owners (users/teams) exist | `error`, `warn`, `off` | `error` |
| `refs/valid-version-range` | Validates version references and patterns | `error`, `warn`, `off` | `error` |
| `refs/resource-exists` | Ensures referenced resources exist (always enabled for critical resources) | Always enabled | Always enabled |
| **Best Practice Rules** |
| `best-practices/summary-required` | Requires summary field for better documentation | `error`, `warn`, `off` | `error` |
| `best-practices/owner-required` | Requires at least one owner for accountability | `error`, `warn`, `off` | `error` |

:::info Core Resource Validation
Core resource reference validation (services, domains, entities) is always enabled and cannot be disabled, ensuring referential integrity of your EventCatalog.
:::

### Configuration Examples

#### Relaxed Configuration for Development

```javascript
module.exports = {
  rules: {
    'best-practices/summary-required': 'warn',
    'best-practices/owner-required': 'warn',
    'refs/owner-exists': 'warn',
  },
  ignorePatterns: ['**/drafts/**', '**/experimental/**']
};
```

#### Strict Configuration for Production

```javascript
module.exports = {
  rules: {
    'schema/required-fields': 'error',
    'refs/owner-exists': 'error',
    'best-practices/summary-required': 'error',
    'best-practices/owner-required': 'error',
  }
};
```

#### Team-Specific Overrides

```javascript
module.exports = {
  rules: {
    'best-practices/owner-required': 'error',
    'best-practices/summary-required': 'error',
  },
  overrides: [
    {
      files: ['**/legacy/**'],
      rules: {
        'best-practices/owner-required': 'warn',
        'best-practices/summary-required': 'off'
      }
    },
    {
      files: ['**/critical/**'],
      rules: {
        'best-practices/summary-required': 'error',
        'refs/owner-exists': 'error'
      }
    }
  ]
};
```

### Using with CI/CD

The configuration file allows you to have different validation rules for different environments:

```bash
# Development - warnings allowed
npx @eventcatalog/linter

# Production - fail on warnings
npx @eventcatalog/linter --fail-on-warning
```

### Default Behavior

If no `.eventcatalogrc.js` file is found, the linter uses the default rules listed above. Most validations are errors by default, while documentation quality checks such as orphan messages, missing descriptions, missing schemas, and deprecated references default to warnings.

### Package.json Integration

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "lint:eventcatalog": "eventcatalog-linter",
    "lint:eventcatalog:verbose": "eventcatalog-linter --verbose"
  }
}
```

## What It Validates

### Frontmatter Schema Validation

- ✅ Required fields are present (`id`, `name`, `version`)
- ✅ Field types are correct (strings, arrays, objects)
- ✅ Semantic versions follow proper format (`1.0.0`, `2.1.3-beta`)
- ✅ Version patterns supported (`latest`, `^1.0.0`, `~1.2.0`, `0.0.x`)
- ✅ URLs are valid format
- ✅ Email addresses are valid format
- ✅ Enum values are from allowed lists
- ✅ Nested object structures are correct
- ✅ Common resource configuration is supported, including `attachments`, `editUrl`, `diagrams`, `detailsPanel`, sidebar colors, and GraphQL specifications

### Reference Validation

- ✅ Services referenced in domains exist
- ✅ Agents, data products, flows, entities, and subdomains referenced in domains exist
- ✅ Events/Commands/Queries referenced in services exist
- ✅ Events/Commands/Queries referenced in agents exist
- ✅ Data product inputs and outputs reference existing resources
- ✅ ADR relationships and typed `appliesTo` references exist
- ✅ Entities referenced in domains/services exist
- ✅ Channels referenced in sends/receives `to`/`from`, routes, messages, and message channels exist
- ✅ Containers referenced in `writesTo`/`readsFrom` exist
- ✅ Diagrams referenced from other resources exist
- ✅ Users/Teams referenced as owners exist
- ✅ User/team owned resources and team members exist
- ✅ Flow steps reference existing services/messages/agents/containers/data products
- ✅ Entity properties reference existing entities
- ✅ Version-specific references are valid

<AddedIn version="1.2.0" />

The expanded reference checks for agents, data products, ADRs, diagrams, and flow steps were added in version 1.2.0.

## Example Output

### ✅ Success Output

```bash
$ eventcatalog-linter

✔ No problems found!

  42 files checked
```

### ❌ Error Output

```bash
$ eventcatalog-linter

services/user-service/index.mdx
  ✖ error version: Invalid semantic version format [version] (schema/valid-semver)
  ⚠ warning Summary is required for better documentation [summary] (best-practices/summary-required)

✖ 2 problems

domains/sales/index.mdx
  ✖ error Referenced service "order-service" does not exist [services] (refs/resource-exists)

✖ 1 problem

flows/user-registration/index.mdx
  ✖ error Referenced service "notification-service" (version: 2.0.0) does not exist [steps[1].service] (refs/valid-version-range)

✖ 1 problem

✖ 4 problems (3 errors, 1 warning)
  3 files checked
```

## Version Pattern Support

The linter supports flexible version patterns for resource references:

### Exact Versions

```yaml
sends:
  - id: user-created
    version: 1.0.0 # Exact semantic version
```

### Latest Version

```yaml
sends:
  - id: user-created
    version: latest # Always use the latest available version
```

### Semver Ranges

```yaml
sends:
  - id: user-created
    version: ^1.0.0 # Compatible with 1.x.x (1.0.0, 1.2.3, but not 2.0.0)
  - id: user-updated
    version: ~1.2.0 # Compatible with 1.2.x (1.2.0, 1.2.5, but not 1.3.0)
```

### X-Pattern Matching

```yaml
sends:
  - id: user-created
    version: 0.0.x # Matches 0.0.1, 0.0.5, 0.0.12, etc.
  - id: order-placed
    version: 1.x # Matches 1.0.0, 1.5.3, 1.99.0, etc.
```

## CI/CD Integration

### GitHub Actions

```yaml
name: EventCatalog Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npx @eventcatalog/linter
```

### GitLab CI

```yaml
eventcatalog-lint:
  stage: test
  image: node:18
  script:
    - npx @eventcatalog/linter
```

## Rule Names and Error Codes

The linter provides descriptive rule names in parentheses to help identify and fix issues quickly. Each error shows the specific rule that was violated:

### Schema Validation Rules

- `(schema/required-fields)` - Required field is missing
- `(schema/valid-type)` - Field has wrong data type  
- `(schema/valid-semver)` - Invalid semantic version format
- `(schema/valid-email)` - Invalid email address format
- `(schema/validation-error)` - General schema validation error

### Reference Validation Rules

- `(refs/owner-exists)` - Referenced owner (user/team) doesn't exist
- `(refs/valid-version-range)` - Referenced version doesn't exist or invalid pattern
- `(refs/resource-exists)` - Referenced resource doesn't exist
- `(refs/channel-exists)` - Referenced channel in sends/receives `to`/`from`, routes, messages, or message channels doesn't exist
- `(refs/container-exists)` - Referenced container in `writesTo`/`readsFrom` or flow steps doesn't exist
- `(refs/orphan-messages)` - Event/command/query has no producer and no consumer

### Best Practice Rules

- `(best-practices/summary-required)` - Summary field is missing
- `(best-practices/owner-required)` - At least one owner is required

### Parse Errors

- `(@eventcatalog/parse-error)` - YAML/frontmatter parsing error

## Warnings Support

The linter distinguishes between errors (critical issues) and warnings (suggestions for improvement):

- **Errors**: Critical issues that must be fixed
- **Warnings**: Suggestions for better documentation

Use `--fail-on-warning` to treat warnings as errors in CI/CD pipelines:

```bash
# Exit with error code if warnings are found
eventcatalog-linter --fail-on-warning
```

## Common Validation Examples

### Valid Frontmatter Examples

#### Service

```yaml
---
id: user-service
name: User Service
version: 2.1.0
summary: Manages user accounts and authentication
owners:
  - platform-team
  - john-doe
sends:
  - id: user-created
    version: 1.0.0
  - id: user-updated
receives:
  - id: create-user
  - id: update-user
entities:
  - id: user
repository:
  language: TypeScript
  url: https://github.com/company/user-service
---
```

#### Event

```yaml
---
id: user-created
name: User Created
version: 1.0.0
summary: Triggered when a new user account is created
owners:
  - platform-team
sidebar:
  badge: POST
  label: User Events
draft: false
deprecated: false
---
```

#### Agent

<AddedIn version="1.2.0" />

```yaml
---
id: refund-agent
name: Refund Agent
version: 1.0.0
summary: Coordinates customer refund decisions
owners:
  - platform-team
receives:
  - id: refund-requested
    from:
      - id: refunds
sends:
  - id: refund-approved
    to:
      - id: public-events/orders
readsFrom:
  - id: orders-db
model:
  provider: OpenAI
  name: gpt-4.1-mini
tools:
  - name: Payment lookup
    type: mcp
---
```

#### Container

<AddedIn version="1.2.0" />

```yaml
---
id: orders-db
name: Orders DB
version: 1.0.0
summary: Stores order records
container_type: database
technology: PostgreSQL
classification: internal
access_mode: readWrite
authoritative: true
---
```

#### Data product

<AddedIn version="1.2.0" />

```yaml
---
id: refund-analytics
name: Refund Analytics
version: 1.0.0
summary: Curated refund metrics for finance teams
inputs:
  - id: refund-approved
  - id: orders-db
outputs:
  - id: public-events/orders
    contract:
      path: contracts/refund-analytics.json
      name: Refund Analytics Contract
---
```

#### ADR

<AddedIn version="1.2.0" />

```yaml
---
id: adr-001
name: Use event-driven refunds
version: 1.0.0
summary: Records the decision to coordinate refunds through events
status: accepted
date: 2026-05-26
decisionMakers:
  - id: platform-team
    collection: teams
appliesTo:
  - type: service
    id: order-service
  - type: data-product
    id: refund-analytics
related:
  - id: adr-000
---
```

#### Diagram

<AddedIn version="1.2.0" />

```yaml
---
id: refund-flow
name: Refund Flow Diagram
version: 1.0.0
summary: Shows the refund workflow across services and agents
owners:
  - platform-team
---
```

### Common Validation Errors

#### ❌ Missing Required Fields

```yaml
---
# Missing 'id' field
name: User Service
version: 1.0.0
---
```

#### ❌ Invalid Semantic Version

```yaml
---
id: user-service
name: User Service
version: v1.0 # Should be 1.0.0
---
```

#### ❌ Invalid Reference

```yaml
---
id: sales-domain
name: Sales Domain
version: 1.0.0
services:
  - id: non-existent-service # Service doesn't exist
---
```

## Best Practices

1. **Start with Configuration**: Create a `.eventcatalogrc.js` file to customize rules for your team's workflow
2. **Run in CI/CD**: Integrate the linter into your CI/CD pipeline to catch issues early
3. **Use `--fail-on-warning`**: Consider treating warnings as errors in production environments
4. **Regular Validation**: Run the linter regularly as part of your development workflow
5. **Fix Issues Promptly**: Address validation errors immediately to maintain documentation quality
6. **Version Consistency**: Use consistent version patterns across your EventCatalog resources
7. **Team Overrides**: Use file pattern overrides for different validation requirements across teams
8. **Ignore Patterns**: Use ignore patterns for draft or experimental content that shouldn't be validated yet

## Issues?

If you have any issues or feedback, please let us know by opening an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or joining our [Discord server](https://eventcatalog.dev/discord).