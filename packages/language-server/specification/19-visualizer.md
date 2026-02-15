# Visualizer

The `visualizer` block separates **resource definition** from **visualization**. Resources defined outside a visualizer block exist in the catalog but are not rendered visually. Only resources placed inside a `visualizer` block (or referenced from one) appear in the visual graph.

This separation lets teams maintain a single source of truth for all resources while controlling exactly what gets visualized and how.

```
visualizer <id> {
  name "<display name>"
  summary "<text>"

  // Display options
  legend true|false
  search true|false
  toolbar true|false
  focus-mode true|false
  animated true|false
  style default|post-it

  // Resources to visualize (inline or reference)
  <resource definitions or references>
}
```

## Why Visualizer Exists

A `.ec` file can define dozens of resources — domains, services, events, channels, and more. Without a visualizer block, there is no way to control which resources appear in the visual graph or how they are presented.

The visualizer block makes visualization **explicit**:

- Define resources anywhere (top-level, imported files)
- Choose what to visualize by placing resources inside a `visualizer` block
- Configure display options per visualization

## Multiple Visualizer Blocks

A file can contain multiple `visualizer` blocks, each presenting a different view over the same resources. Tools (e.g. the playground) allow switching between them.

```
// Shared resources
event OrderCreated {
  version 1.0.0
}

event PaymentProcessed {
  version 1.0.0
}

service OrderService {
  version 1.0.0
  sends event OrderCreated
}

service PaymentService {
  version 1.0.0
  receives event OrderCreated
  sends event PaymentProcessed
}

// View 1: Order flow only
visualizer orders {
  name "Order Flow"

  service OrderService
  event OrderCreated
}

// View 2: Full payment pipeline
visualizer payments {
  name "Payment Pipeline"

  service OrderService
  service PaymentService
  event OrderCreated
  event PaymentProcessed
}
```

## Resources Without a Visualizer

Resources defined outside any `visualizer` block are valid. They can be:

- Imported by other `.ec` files
- Referenced from within a `visualizer` block
- Used for compilation to EventCatalog's markdown format

If a file contains no `visualizer` block, no visual graph is produced.

## Inline vs. Reference

Resources inside a visualizer can be defined inline (full definition) or referenced by name:

**Inline** — defines and visualizes the resource:

```
visualizer main {
  name "My Architecture"

  service OrderService {
    version 1.0.0
    sends event OrderCreated
  }
}
```

**Reference** — visualizes a resource defined elsewhere:

```
service OrderService {
  version 1.0.0
  sends event OrderCreated
}

visualizer main {
  name "My Architecture"
  service OrderService
}
```

When a resource is referenced, the visualizer enriches the node with metadata from the matching top-level definition.

## Display Options

| Property     | Type    | Default   | Description                            |
| ------------ | ------- | --------- | -------------------------------------- |
| `name`       | string  | —         | Display title for the visualization    |
| `summary`    | string  | —         | Description of the visualization       |
| `legend`     | boolean | `true`    | Show the node type legend              |
| `search`     | boolean | `true`    | Show the search bar                    |
| `toolbar`    | boolean | `true`    | Show the toolbar (export, zoom, etc.)  |
| `focus-mode` | boolean | `true`    | Enable focus mode for individual nodes |
| `animated`   | boolean | `true`    | Animate edges                          |
| `style`      | enum    | `default` | Visual style: `default` or `post-it`   |

## Example

```
// Teams
team orders-team {
  name "Orders Team"
}

// Resources
channel orders-topic {
  version 1.0.0
  protocol "Kafka"
}

// Visualizer with display options
visualizer order-architecture {
  name "Order Architecture"
  summary "Core order processing services"
  legend true
  search true
  animated false
  style post-it

  domain Orders {
    version 1.0.0
    owner orders-team

    service OrderService {
      version 1.0.0
      sends event OrderCreated to orders-topic
      receives command CreateOrder
    }

    service NotificationService {
      version 1.0.0
      receives event OrderCreated
    }
  }
}
```

## EBNF

```ebnf
visualizer_decl   = "visualizer" identifier "{" { visualizer_body } "}" ;
visualizer_body   = name_prop | summary_prop | annotation
                  | legend_prop | search_prop | toolbar_prop
                  | focus_mode_prop | animated_prop | style_prop
                  | domain_decl | service_decl | event_decl | command_decl
                  | query_decl | channel_decl | container_decl
                  | data_product_decl | flow_decl
                  | actor_decl | external_system_decl
                  | service_ref_stmt | domain_ref_stmt
                  | event_ref_stmt | command_ref_stmt | query_ref_stmt
                  | channel_ref_stmt | data_product_ref_stmt | flow_ref_stmt
                  | container_ref_stmt ;
legend_prop       = "legend" bool_lit ;
search_prop       = "search" bool_lit ;
toolbar_prop      = "toolbar" bool_lit ;
focus_mode_prop   = "focus-mode" bool_lit ;
animated_prop     = "animated" bool_lit ;
style_prop        = "style" ( "default" | "post-it" ) ;
```
