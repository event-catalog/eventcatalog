---
sidebar_position: 2
keywords:
- EventCatalog flows
- AI flow wizard
- flow documentation
- AI skills
sidebar_label: Creating a flow (with AI)
title: Creating a flow (with AI)
description: Interactively document business flows using an AI agent skill.
---

The [`flow-wizard` skill](/docs/development/ask-your-architecture/skills/introduction#available-skills) guides your AI agent through documenting a business flow step by step. Instead of writing the YAML frontmatter by hand, you have a conversation with your agent describing what happens in each stage and the skill builds the flow for you.

The skill also cross-references your existing catalog resources (services, events, commands, queries) and links them into the flow automatically when it finds a match.

## Prerequisites

- An AI coding agent that supports the skills format (e.g. [Claude Code](https://claude.ai/code))
- The `flow-wizard` skill installed in your project (see [installation](/docs/development/ask-your-architecture/skills/installation))
- Optionally, an EventCatalog MCP server connection so the agent can query your catalog directly

## Install the skill

```bash
# Install all EventCatalog skills
npx skills add event-catalog/skills

# Install only the flow-wizard skill
npx skills add event-catalog/skills --skill flow-wizard
```

This copies the skill into `.claude/skills/flow-wizard/` where your agent can access it.

## Start a session

Open your AI agent and ask it to document a flow using natural language. The skill activates on phrases like:

- "document a flow"
- "map a business process"
- "create a flow diagram"
- "walk through a process"
- "document an end-to-end flow"
- "map out how something works in my architecture"

**Example prompt:**

> "Use the flow-wizard skill to help me document our checkout flow."

## How a session works

The wizard runs through a structured conversation. You describe your flow in plain language -- the agent handles the formatting.

### Locate your catalog

The agent first asks whether you have an EventCatalog project and where it lives. It scans your `services/`, `events/`, `commands/`, `queries/`, `domains/`, and `flows/` directories to build an inventory of existing resources.

If you have the EventCatalog MCP server connected, the agent uses `getResources` to query the catalog directly. If you don't have a catalog yet, the agent documents steps as plain descriptions and you can add resource links later.

### Describe the flow

You describe the end-to-end process in your own words:

> "A user places an order, payment is processed, inventory is reserved, and a confirmation email is sent."

The agent breaks this into sections and presents them back for your confirmation before continuing.

### Walk through each section

The agent takes you through each section one at a time, asking what happens, who or what is involved, and what comes next.

For each step it asks about, the agent:

1. Determines the step type -- `actor`, `service`, `message`, or `externalSystem`
2. Searches your catalog for a matching resource
3. Presents any matches and asks you to confirm before linking them

If a resource exists in your catalog, the agent uses its exact `id` and `version`. If nothing matches, it creates a placeholder and notes that you can document it fully later.

### Handle branching

When you describe a decision point ("if payment succeeds we continue, otherwise we notify the user"), the agent asks you to confirm the paths and documents them as `next_steps` branches.

```yaml
next_steps:
  - id: "reserve_inventory"
    label: "Payment succeeded"
  - id: "notify_failure"
    label: "Payment failed"
```

### Review and confirm

Before writing any file, the agent shows a complete summary of every step, which resources were matched from your catalog, and which are new placeholders. You can request changes before the file is generated.

### Generated output

The agent writes an `index.mdx` file to your catalog. It asks where to save it if the location is ambiguous -- either `flows/{FlowName}/index.mdx` or `domains/{Domain}/flows/{FlowName}/index.mdx`.

_PLACE_HOLDER_IMAGE_

A generated flow might look like this:

```md title="flows/CheckoutFlow/index.mdx (example)"
---
id: "CheckoutFlow"
name: "Checkout Flow"
version: "0.0.1"
summary: "End-to-end flow from cart submission through payment to order confirmation"
steps:
  - id: "customer_submits_order"
    title: "Customer Submits Order"
    actor:
      name: "Customer"
    next_step:
      id: "place_order_command"
      label: "Submit order"

  - id: "place_order_command"
    title: "Place Order"
    message:
      id: "PlaceOrder"
      version: "1.0.0"
    next_step:
      id: "orders_service"
      label: "Send to Orders Service"

  - id: "orders_service"
    title: "Orders Service"
    service:
      id: "OrdersService"
      version: "2.1.0"
    next_steps:
      - id: "payment_gateway"
        label: "Process payment"
      - id: "order_rejected"
        label: "Reject order"

  - id: "payment_gateway"
    title: "Stripe"
    externalSystem:
      name: "Stripe"
      summary: "Third-party payment processor"
      url: "https://stripe.com"
    next_step:
      id: "order_confirmed"
      label: "Payment complete"

  - id: "order_confirmed"
    title: "Order Confirmed"
    message:
      id: "OrderConfirmed"
      version: "1.0.0"

  - id: "order_rejected"
    title: "Order Rejected"
    message:
      id: "OrderRejected"
      version: "1.0.0"
---

<NodeGraph />
```

Once saved, the flow appears in your EventCatalog at `http://localhost:3000/visualiser/flows/CheckoutFlow/0.0.1`.

## Next steps

- Resources the agent could not match are noted in the session summary. Use the `catalog-documentation-creator` skill to document those resources.
- See [flow nodes](/docs/development/guides/flows/flow-nodes) for the full list of step types you can use to extend the generated flow.
- See [adding flows to domains](/docs/development/guides/flows/adding-flows-to-domains) if you want to move the flow under a domain.
