---
sidebar_position: 4
sidebar_label: Add overview cards
title: Add EventCatalog cards to an overview page
description: Place EventCatalog diagrams, tables, schemas, and flows in a Backstage overview grid.
keywords:
  - backstage
  - cards
  - overview
---

Use the card components to place EventCatalog views alongside existing Backstage cards. The components fill their parent, so give each grid item an explicit height.

## Import the cards

```tsx
import {
  EventCatalogEntityArchitectureGraphCard,
  EventCatalogEntityEntityMapCard,
  EventCatalogEntityFlowCard,
  EventCatalogEntityMessageCard,
  EventCatalogEntitySchemaExplorerCard,
  EventCatalogEntitySystemContextMapCard,
  EventCatalogEntityVisualiserCard,
} from '@eventcatalog/backstage-plugin-eventcatalog';
```

## Add cards to the overview grid

Add the cards to the `Grid` used by your entity overview. Choose heights that suit each visualization:

```tsx
const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item xs={12} style={{ height: 700 }}>
      <EventCatalogEntityFlowCard
        flow="checkout-saga"
        version="1.0.0"
      />
    </Grid>

    <Grid item xs={12} style={{ height: 800 }}>
      <EventCatalogEntityArchitectureGraphCard
        type="service"
        depth={2}
      />
    </Grid>

    <Grid item xs={12} md={6} style={{ height: 600 }}>
      <EventCatalogEntityVisualiserCard />
    </Grid>

    <Grid item xs={12} md={6} style={{ height: 600 }}>
      <EventCatalogEntityMessageCard />
    </Grid>
  </Grid>
);
```

The resource-oriented cards read the current entity's EventCatalog annotations. Components that select a global or specific view also accept explicit props:

```tsx
<EventCatalogEntityEntityMapCard
  id="ordering"
  version="1.0.0"
  collection="domains"
/>

<EventCatalogEntitySystemContextMapCard
  system="order-management-system"
  version="1.0.0"
/>

<EventCatalogEntitySchemaExplorerCard />
```

To make a card span the whole overview width, use `xs={12}`. To arrange two cards side by side on medium screens, give each item `xs={12} md={6}`.

See [Control embed theme and size](/docs/plugins/backstage/control-theme-and-size) if an iframe does not fill its card.
