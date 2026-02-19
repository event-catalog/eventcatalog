---
title: Using AI to generate diagrams
description: Use the DSL specification with your LLM to generate architecture diagrams from requirements.
---

This workflow helps you go from plain-language requirements to a valid `.ec` diagram quickly.

## Step 1: Copy the specification into your LLM

Open the Specification page and copy it as markdown:

- `/reference/dsl-spec/`

Use the **Copy as Markdown** button at the top right of the page, then paste it into your LLM chat.

## Step 2: Give your requirements

Ask the LLM to create a diagram in EventCatalog Modeling DSL.

Use this prompt template:

```text
You are generating EventCatalog Modeling (.ec) code.
Follow this DSL specification exactly:
[PASTE SPECIFICATION HERE]

Generate a single file called main.ec with a visualizer block.
Requirements:
- We have an ecommerce checkout flow.
- Services: CheckoutService, PaymentsService, InventoryService, NotificationService.
- Events: CheckoutSubmitted, PaymentAuthorized, PaymentFailed, InventoryReserved, InventoryUnavailable.
- Use channels for async messaging (Kafka-style topics).
- Add owners for each service.
- Include notes for two open design questions.
- Keep versions as 1.0.0.

Return only valid .ec code, no explanation.
```

## Step 3: Review and refine the generated model

Paste the output into EventCatalog Modelling and iterate with your team:

- https://playground.eventcatalog.dev/new

If the output is close but not perfect, ask the LLM for targeted edits:

- “Change PaymentsService to receive `CheckoutSubmitted` and emit both success/failure events.”
- “Move InventoryService under a `Commerce` domain.”
- “Add `@note` annotations for retry strategy.”

## Example generated output

```ec title="main.ec"
visualizer target {
  name "Checkout Target Architecture"
  legend true

  domain Commerce {
    version 1.0.0

    service CheckoutService {
      version 1.0.0
      owner checkout-team
      @note("Should this remain orchestration-heavy or split into workflow + API?", priority: "medium")
      sends event CheckoutSubmitted@1.0.0 to CheckoutEvents@1.0.0
    }

    service PaymentsService {
      version 1.0.0
      owner payments-team
      receives event CheckoutSubmitted@1.0.0 from CheckoutEvents@1.0.0
      sends event PaymentAuthorized@1.0.0 to PaymentEvents@1.0.0
      sends event PaymentFailed@1.0.0 to PaymentEvents@1.0.0
    }

    service InventoryService {
      version 1.0.0
      owner inventory-team
      receives event PaymentAuthorized@1.0.0 from PaymentEvents@1.0.0
      sends event InventoryReserved@1.0.0 to InventoryEvents@1.0.0
      sends event InventoryUnavailable@1.0.0 to InventoryEvents@1.0.0
      @note("Need final decision on reservation timeout strategy", author: "inventory-team", priority: "high")
    }

    service NotificationService {
      version 1.0.0
      owner comms-team
      receives event PaymentFailed@1.0.0 from PaymentEvents@1.0.0
      receives event InventoryUnavailable@1.0.0 from InventoryEvents@1.0.0
    }
  }

  channel CheckoutEvents {
    version 1.0.0
    protocol "Kafka"
    address "checkout.events.v1"
  }

  channel PaymentEvents {
    version 1.0.0
    protocol "Kafka"
    address "payment.events.v1"
  }

  channel InventoryEvents {
    version 1.0.0
    protocol "Kafka"
    address "inventory.events.v1"
  }
}
```

## Step 4: Move from AI draft to durable docs

Once the model is agreed, commit `main.ec`, review in PR, and import to EventCatalog:

```bash
npx @eventcatalog/cli --dir ./catalog import ./main.ec
```
