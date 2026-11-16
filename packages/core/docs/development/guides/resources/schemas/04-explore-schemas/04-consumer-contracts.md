---
sidebar_position: 4
keywords:
- EventCatalog consumer contracts
- consumer-driven contracts
- Pact
- contract testing
sidebar_label: Consumer Contracts
title: Consumer Contracts
description: Document the contract a consumer has with the producer of a message it receives, for example a Pact file.
---

A message's schema is the producer's side of the contract. A **consumer contract** is the other side: what one consumer expects of a message it receives, such as the fields it reads and the values it relies on.

Teams that use consumer-driven contract testing (for example [Pact](https://docs.pact.io/)) already have these contracts as files. You can attach the file to the message in the consumer's `receives`, so producers can see who relies on what before they change a message.

## Add a contract to a received message

Put the contract file in the consumer's folder, then add `contract` to the entry in `receives`.

```md title="/services/ShippingService/index.mdx"
---
id: ShippingService
version: 1.0.0
receives:
  - id: OrderPaid
    version: 1.0.0
    contract:
      path: ./contracts/shipping-orders.pact.json
      name: Orders pact
      type: pact
---
```

| Property | Required | Description |
|---|---|---|
| `path` | Yes | The file's path, relative to the consumer's folder |
| `name` | No | The name shown in EventCatalog. Defaults to the file's name |
| `type` | No | The contract's format, such as `pact`. Any text: it is shown as a badge |

The contract can be any file, and EventCatalog shows it as written. A [Pact file](#pact-files) also gets its fields listed.

Services, agents and domains can all add a contract to a message they receive.

## One file for several messages

A Pact file usually covers every message between one consumer and one producer. Point each `receives` entry at the same file:

```md title="/services/NotificationService/index.mdx"
---
id: NotificationService
version: 1.0.0
receives:
  - id: PaymentFailed
    version: 1.0.0
    contract:
      path: ./contracts/notifications-payments.pact.json
  - id: RefundProcessed
    version: 1.0.0
    contract:
      path: ./contracts/notifications-payments.pact.json
---
```

The file gets one page, which lists both messages. If the entries give the file different names or types, the first entry's are used.

## View consumer contracts

Consumer contracts are listed on the message they are for. In the message's sidebar, **Consumer Contracts** lists each consumer that has a contract for that version of the message, right under **Consumers**. So on a message you see who consumes it, and what each of them expects of it.

Each contract opens on a page of the message, so you can move between its consumers' contracts without leaving it. The page shows:

- a diagram of who produces the message and the consumer that receives it
- the contract's file
- a badge with the consumer's name, which opens the whole contract on that consumer (every message it covers)

A contract is listed on a message when the `receives` entry points at that version of the message: an entry without a version (or with `latest`) points at the latest version only.

## Pact files

When the contract is a Pact file (JSON, Pact Specification versions 2 to 4), its page has two tabs:

- **Schema** is the file as written.
- **Fields** lists what the consumer expects in each interaction, in the same viewer as message schemas, with the interaction's description, the provider it is with and the provider states it is given. It is worked out from the Pact's example and matching rules:
  - a field matched by `type`, `integer`, `decimal` and so on is shown with its type
  - a field matched by `regex` is shown with its pattern (several patterns are shown as all of, or any of, depending on the rule's `combine`)
  - a field matched by `include` is shown with the text it must contain
  - a field with no matching rule, or with an `equality` rule (its own or its parent's), is shown as a constant, because Pact then expects exactly the example's value
  - every field in the example is required
  - a list is described from all of its example items, so a field only a later item has is still listed. When the items are checked in different ways, the field is shown with its type only

A Pact describes its interactions in words (such as "an order ready for shipping event"), not by catalog id. On a message's page, the Fields tab shows the interactions whose description contains the message's name or id, and all of them when none does.

Other contract formats show the file only.

## Ask about consumer contracts with MCP

The MCP server and AI Chat have a `getConsumerContracts` tool. Ask it by message, by consumer, or both:

- **By message**: every consumer's contract for that message.
- **By consumer**: every contract that service, agent or domain has.

For a Pact file, each contract comes with its expectations: the fields the consumer relies on and how each is checked (by type, against a pattern, for text it must include, or as an exact value). A Pact names its interactions in words, so they are matched to a message by its name or id. When none matches, the contract is marked `matchedToMessage: false` and every interaction of the file is returned. So an agent can answer questions such as "which consumers rely on the `currency` field of `OrderPaid`?" or "does removing this field break anyone?" without reading the files. Other formats come with their name, type and path. The file as written is returned when the agent asks for it (very long files are cut short and marked `truncated`).

`getConsumersOfMessage` and `analyzeChangeImpact` also mention each consumer's contract in short: its name, type and path, and for a Pact file the fields it relies on. The fields are left off when the Pact can't be matched to the message, and `moreContracts` counts any other contract files the consumer has for it.

## Check contract files with the linter

The [EventCatalog linter](../../../../developer-tools/eventcatalog-linter/reference/03-rules.md)'s `refs/file-exists` rule reports a `receives[].contract.path` that points at a file that does not exist.

## Use the SDK

Pass `contract` when you add a received message to a service, agent or domain:

```typescript
import utils from '@eventcatalog/sdk';

const { addEventToService } = utils('/path/to/catalog');

await addEventToService('ShippingService', 'receives', {
  id: 'OrderPaid',
  version: '1.0.0',
  contract: { path: './contracts/shipping-orders.pact.json', name: 'Orders pact', type: 'pact' },
});
```

The SDK does not copy the contract file: write it to the consumer's folder yourself. A `contract` on a message the resource `sends` is ignored.

## Consumer contracts and field usage

[Consumer Field Usage](./03-consumer-field-usage.md) is a list of field names you write by hand in `fields`. A consumer contract is a file your tests already produce. You can use either, or both on the same `receives` entry.
