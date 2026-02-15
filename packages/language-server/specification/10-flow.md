# Flow

Flows define step-by-step business processes using a PM-friendly `when`-block syntax. Resources are referenced by name only — types are resolved from the catalog.

```
flow <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>

  // Entry chain — the starting sequence
  <Name> ["<label>"] -> <Name> ["<label>"] -> ...

  // When blocks — react to events
  when <TriggerName>
    <ServiceName> "<description>"
      -> "<label>": <OutputName>

  // Convergence — multiple triggers must complete
  when <TriggerA> and <TriggerB>
    <ServiceName> "<description>"
}
```

## Actors and External Systems

To use actors and external systems in flows, define them as top-level resources. The flow resolves their type automatically by name:

```
actor Customer {
  name "Customer"
  summary "End user on the storefront"
}

external-system WarehouseWMS {
  name "Warehouse WMS"
  summary "Legacy warehouse management system"
}
```

Both support optional bodies with `name`, `summary`, and annotations. They can also be bare (no body):

```
actor Customer
external-system WarehouseWMS
```

## Flow References

Resources in flows are referenced by name only (no type keywords like `service` or `event`). Types are resolved from catalog definitions or sibling `.ec` files. If no matching definition is found, the default type is `step`. Compilers may warn on unresolved flow references.

Each reference can include an optional label:

- `Customer "places an order"` — name with display label
- `PlaceOrder` — bare name (no label)
- `PaymentService "processes the payment"` — service with description

## Entry Chains

The entry chain defines the starting sequence of a flow. It uses arrow (`->`) syntax:

```
Customer "places an order"
  -> PlaceOrder
  -> OrderService "creates the order"
  -> OrderCreated
```

Multiple sources can converge into a chain using commas:

```
EventA, EventB -> MergingService
```

## When Blocks

`when` blocks define reactions to events. Each block starts with one or more trigger names, followed by actions:

```
when OrderCreated
  PaymentService "processes the payment"
    -> "success": PaymentProcessed
    -> "failure": PaymentFailed
  InventoryService "reserves stock"
    -> StockReserved
```

### Labeled Outputs

Action outputs can have optional labels (quoted strings followed by a colon):

```
-> "success": PaymentProcessed    // labeled output
-> StockReserved                   // unlabeled output
```

### Convergence

Use `and` to require multiple triggers before actions execute:

```
when PaymentProcessed and StockReserved
  FulfillmentService "ships the order"
    -> OrderShipped
```

### Terminal Actions

Actions without outputs are terminal steps:

```
when OrderShipped
  WarehouseWMS "syncs with legacy WMS"
  NotificationService "notifies the customer"
```

## Example

```
flow OrderFulfillment {
  version 1.0.0
  name "Order Fulfillment"
  summary "End-to-end order processing from placement to delivery"
  owner fulfillment-team

  Customer "places an order"
    -> PlaceOrder
    -> OrderService "creates the order"
    -> OrderCreated

  when OrderCreated
    PaymentService "processes the payment"
      -> "success": PaymentProcessed
      -> "failure": PaymentFailed
    InventoryService "reserves stock"
      -> StockReserved

  when PaymentFailed
    NotificationService "notifies the customer of failure"

  when PaymentProcessed and StockReserved
    FulfillmentService "ships the order"
      -> OrderShipped

  when OrderShipped
    WarehouseWMS "syncs with legacy WMS"
    NotificationService "notifies the customer"
      -> CustomerNotified
}
```

## EBNF

```ebnf
flow_decl         = "flow" identifier "{" common_props
                    { flow_entry_chain | flow_when_block } "}" ;
flow_entry_chain  = flow_ref { "," flow_ref } ( "->" flow_ref )+ ;
flow_when_block   = "when" flow_ref { "and" flow_ref } flow_action+ ;
flow_action       = flow_ref { flow_output } ;
flow_output       = "->" [ string_lit ":" ] flow_ref ;
flow_ref          = identifier [ string_lit ] ;
```
