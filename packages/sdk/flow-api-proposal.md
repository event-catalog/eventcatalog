# Flow SDK API Proposal

## Goal

Add first-class SDK support for creating, updating, versioning, and composing EventCatalog flows.

The SDK already supports reading flows with `getFlow` and `getFlows`, and the catalog already models flows as frontmatter with `steps`. The missing piece is a write API and a nicer authoring API for users who want to generate flows from code.

This proposal has two layers:

- A low-level resource API that mirrors the rest of the SDK.
- A fluent `FlowBuilder` API for ergonomic flow creation.

## Low-Level SDK API

The SDK should expose flow helpers that match existing resource helpers for events, services, diagrams, data products, and similar resources.

```ts
const {
  getFlow,
  getFlows,
  writeFlow,
  writeVersionedFlow,
  writeFlowToDomain,
  writeFlowToService,
  versionFlow,
  rmFlow,
  rmFlowById,
  flowHasVersion,
  addFileToFlow,
} = utils('./catalog');
```

### Proposed Methods

```ts
getFlow(id: string, version?: string): Promise<Flow | undefined>

getFlows(options?: { latestOnly?: boolean }): Promise<Flow[] | undefined>

writeFlow(
  flow: Flow,
  options?: {
    path?: string;
    override?: boolean;
    versionExistingContent?: boolean;
    format?: 'md' | 'mdx';
  }
): Promise<void>

writeVersionedFlow(flow: Flow): Promise<void>

writeFlowToDomain(
  flow: Flow,
  domain: { id: string; version?: string },
  options?: { path?: string; override?: boolean; format?: 'md' | 'mdx' }
): Promise<void>

writeFlowToService(
  flow: Flow,
  service: { id: string; version?: string },
  options?: { path?: string; override?: boolean; format?: 'md' | 'mdx' }
): Promise<void>

versionFlow(id: string): Promise<void>

rmFlow(path: string): Promise<void>

rmFlowById(id: string, version?: string, persistFiles?: boolean): Promise<void>

flowHasVersion(id: string, version?: string): Promise<boolean>

addFileToFlow(
  id: string,
  file: { content: string; fileName: string },
  version?: string
): Promise<void>
```

## Fluent Builder API Options

Users are asking for a code-first API that lets them describe flows in a readable, chained form. Any builder API should build the existing `Flow` shape rather than introducing a second model.

Below are three possible fluent APIs. Option 1 is the selected MVP because it is expressive and maps cleanly to the current `FlowStep` model.

Current scope:

- Include Option 1 typed step methods.
- Do not include `.connect()` yet.
- Do not include generated catalog type support yet.

## Option 1: Typed Step Builder

This option exposes explicit methods for each step type: `.addStep()`, `.addMessageStep()`, `.addServiceStep()`, `.addActorStep()`, `.addExternalSystemStep()`, `.addFlowStep()`, and `.addCustomStep()`.

It reads close to the current YAML/frontmatter model while giving users autocomplete and type safety for known message ids.

```ts
import utils, { FlowBuilder } from '@eventcatalog/sdk';

enum ApplicationEventType {
  HourlyCurtailmentCalculated = 'HourlyCurtailmentCalculated',
  DailyCurtailmentCalculated = 'DailyCurtailmentCalculated',
  MonthlyCurtailmentCalculated = 'MonthlyCurtailmentCalculated',
}

const flow = FlowBuilder.create<ApplicationEventType>({
  id: 'CurtailmentCalculation',
  name: 'Curtailment Calculation',
  version: '1.0.0',
  summary: 'Flow for calculating hourly curtailment for a customer',
  markdown: '## Curtailment calculation\n\nGenerated from the application flow definition.',
})
  .addStep({
    id: 'Calculate',
    title: 'Calculate Hourly Curtailment',
    summary: 'Hourly curtailment calculation is triggered by a scheduled event',
    nextSteps: [
      {
        id: ApplicationEventType.HourlyCurtailmentCalculated,
        label: 'Hourly curtailment calculated',
      },
    ],
  })
  .addMessageStep({
    id: ApplicationEventType.HourlyCurtailmentCalculated,
    title: 'Hourly Curtailment Calculated',
    message: { id: ApplicationEventType.HourlyCurtailmentCalculated },
    nextSteps: [
      {
        id: ApplicationEventType.DailyCurtailmentCalculated,
        label: 'Daily curtailment recalculated',
      },
      {
        id: 'SAP',
        label: 'Send curtailment period to SAP',
      },
    ],
  })
  .addMessageStep({
    id: ApplicationEventType.DailyCurtailmentCalculated,
    title: 'Daily Curtailment Calculated',
    message: { id: ApplicationEventType.DailyCurtailmentCalculated },
    nextSteps: [
      {
        id: ApplicationEventType.MonthlyCurtailmentCalculated,
        label: 'Monthly curtailment recalculated',
      },
    ],
  })
  .addMessageStep({
    id: ApplicationEventType.MonthlyCurtailmentCalculated,
    title: 'Monthly Curtailment Calculated',
    message: { id: ApplicationEventType.MonthlyCurtailmentCalculated },
  })
  .addExternalSystemStep({
    id: 'SAP',
    title: 'Curtailment period registered in SAP',
    externalSystem: {
      name: 'SAP',
      summary: 'SAP processed the curtailment period asynchronously.',
    },
    nextSteps: [{ id: 'Curtailment Rewarding' }],
  })
  .addStep({
    id: 'Curtailment Rewarding',
    title: 'Curtailment Rewarding',
  })
  .build();

const { writeFlow } = utils('./catalog');

await writeFlow(flow);
```

### Why This Option Works

- Clear mapping to EventCatalog's current `FlowStep` shape.
- Good TypeScript ergonomics with enum-backed message ids.
- Easy to add optional metadata per step.
- Easy to normalize `nextSteps` into `next_step` or `next_steps`.
- Explicit method names make the flow readable in editor autocomplete.

### Tradeoffs

- Slightly more verbose than a pure chain API.
- Users need to understand which step type they are adding.

## Option 2: Graph Connect Builder

This option separates node declaration from edge declaration. Users declare the nodes first, then connect them.

This is useful when a flow is generated from another model, imported from diagrams, or assembled from data where edges are easier to reason about separately.

```ts
import utils, { FlowBuilder } from '@eventcatalog/sdk';

enum ApplicationEventType {
  HourlyCurtailmentCalculated = 'HourlyCurtailmentCalculated',
  DailyCurtailmentCalculated = 'DailyCurtailmentCalculated',
  MonthlyCurtailmentCalculated = 'MonthlyCurtailmentCalculated',
}

const flow = FlowBuilder.create<ApplicationEventType>({
  id: 'CurtailmentCalculation',
  name: 'Curtailment Calculation',
  version: '1.0.0',
  summary: 'Flow for calculating hourly curtailment for a customer',
  markdown: '## Curtailment calculation',
})
  .step('Calculate', {
    title: 'Calculate Hourly Curtailment',
    summary: 'Hourly curtailment calculation is triggered by a scheduled event',
  })
  .message(ApplicationEventType.HourlyCurtailmentCalculated, {
    title: 'Hourly Curtailment Calculated',
  })
  .message(ApplicationEventType.DailyCurtailmentCalculated, {
    title: 'Daily Curtailment Calculated',
  })
  .message(ApplicationEventType.MonthlyCurtailmentCalculated, {
    title: 'Monthly Curtailment Calculated',
  })
  .externalSystem('SAP', {
    name: 'Curtailment period registered in SAP',
    summary: 'SAP processed the curtailment period asynchronously.',
  })
  .step('Curtailment Rewarding')
  .connect('Calculate', ApplicationEventType.HourlyCurtailmentCalculated, {
    label: 'Hourly curtailment calculated',
  })
  .connect(ApplicationEventType.HourlyCurtailmentCalculated, ApplicationEventType.DailyCurtailmentCalculated, {
    label: 'Daily curtailment recalculated',
  })
  .connect(ApplicationEventType.HourlyCurtailmentCalculated, 'SAP', {
    label: 'Send curtailment period to SAP',
  })
  .connect(ApplicationEventType.DailyCurtailmentCalculated, ApplicationEventType.MonthlyCurtailmentCalculated, {
    label: 'Monthly curtailment recalculated',
  })
  .connect('SAP', 'Curtailment Rewarding')
  .build();

const { writeFlow } = utils('./catalog');

await writeFlow(flow);
```

### Why This Option Works

- Very natural for graph-shaped data.
- Makes branching and convergence explicit.
- Easier to generate programmatically from external tools.
- `.connect()` can deduplicate edges and keep step definitions focused.

### Tradeoffs

- More lines for hand-written flows.
- The narrative order is less obvious because nodes and edges are split.
- Step ids become more important because all connections reference them.

## Option 3: Narrative Chain Builder

This option optimizes for the most readable authoring experience. Each step call returns a chain context, and `.to()` connects the previous step to the next step.

```ts
import utils, { FlowBuilder } from '@eventcatalog/sdk';

enum ApplicationEventType {
  HourlyCurtailmentCalculated = 'HourlyCurtailmentCalculated',
  DailyCurtailmentCalculated = 'DailyCurtailmentCalculated',
  MonthlyCurtailmentCalculated = 'MonthlyCurtailmentCalculated',
}

const flow = FlowBuilder.create<ApplicationEventType>({
  id: 'CurtailmentCalculation',
  name: 'Curtailment Calculation',
  version: '1.0.0',
  summary: 'Flow for calculating hourly curtailment for a customer',
  markdown: '## Curtailment calculation',
})
  .startWith.step('Calculate', {
    title: 'Calculate Hourly Curtailment',
    summary: 'Hourly curtailment calculation is triggered by a scheduled event',
  })
  .to.message(ApplicationEventType.HourlyCurtailmentCalculated, {
    title: 'Hourly Curtailment Calculated',
    label: 'Hourly curtailment calculated',
  })
  .branch((flow) =>
    flow.to
      .message(ApplicationEventType.DailyCurtailmentCalculated, {
        title: 'Daily Curtailment Calculated',
        label: 'Daily curtailment recalculated',
      })
      .to.message(ApplicationEventType.MonthlyCurtailmentCalculated, {
        title: 'Monthly Curtailment Calculated',
        label: 'Monthly curtailment recalculated',
      })
  )
  .branch((flow) =>
    flow.to
      .externalSystem('SAP', {
        name: 'Curtailment period registered in SAP',
        summary: 'SAP processed the curtailment period asynchronously.',
        label: 'Send curtailment period to SAP',
      })
      .to.step('Curtailment Rewarding')
  )
  .build();

const { writeFlow } = utils('./catalog');

await writeFlow(flow);
```

### Why This Option Works

- Reads most like a business process.
- Keeps the "what happens next" relationship close to the step itself.
- Good for hand-authored flows where the narrative matters.

### Tradeoffs

- More complex to implement and type correctly.
- Branching and convergence can become awkward for large flows.
- The API introduces concepts like `startWith`, `to`, and `branch` that do not directly exist in the current SDK.

## Recommendation

Start with Option 1.

That gives users a readable builder for normal hand-authored flows. Option 2 and Option 3 remain useful future ideas, but they add API surface we do not need for the first pass.

## Generated Flow Shape

All three builder options should return the same normal SDK `Flow`.

```ts
{
  id: 'CurtailmentCalculation',
  name: 'Curtailment Calculation',
  version: '1.0.0',
  summary: 'Flow for calculating hourly curtailment for a customer',
  markdown: '## Curtailment calculation\n\nGenerated from the application flow definition.',
  steps: [
    {
      id: 'Calculate',
      title: 'Calculate Hourly Curtailment',
      summary: 'Hourly curtailment calculation is triggered by a scheduled event',
      next_step: {
        id: 'HourlyCurtailmentCalculated',
        label: 'Hourly curtailment calculated',
      },
    },
    {
      id: 'HourlyCurtailmentCalculated',
      title: 'Hourly Curtailment Calculated',
      message: {
        id: 'HourlyCurtailmentCalculated',
      },
      next_steps: [
        {
          id: 'DailyCurtailmentCalculated',
          label: 'Daily curtailment recalculated',
        },
        {
          id: 'SAP',
          label: 'Send curtailment period to SAP',
        },
      ],
    },
    {
      id: 'DailyCurtailmentCalculated',
      title: 'Daily Curtailment Calculated',
      message: {
        id: 'DailyCurtailmentCalculated',
      },
      next_step: {
        id: 'MonthlyCurtailmentCalculated',
        label: 'Monthly curtailment recalculated',
      },
    },
    {
      id: 'MonthlyCurtailmentCalculated',
      title: 'Monthly Curtailment Calculated',
      message: {
        id: 'MonthlyCurtailmentCalculated',
      },
    },
    {
      id: 'SAP',
      title: 'Curtailment period registered in SAP',
      externalSystem: {
        name: 'Curtailment period registered in SAP',
        summary: 'SAP processed the curtailment period asynchronously.',
      },
      next_step: {
        id: 'Curtailment Rewarding',
      },
    },
    {
      id: 'Curtailment Rewarding',
      title: 'Curtailment Rewarding',
    },
  ],
}
```

## Option 1 Builder Surface

If we choose Option 1, the builder should have explicit methods for the flow step types EventCatalog already supports.

```ts
FlowBuilder.create<TMessageId extends string = string>(flow: FlowBuilderInput)

.addStep(step: StepInput)

.addMessageStep(step: MessageStepInput<TMessageId>)

.addServiceStep(step: ServiceStepInput)

.addActorStep(step: ActorStepInput)

.addExternalSystemStep(step: ExternalSystemStepInput)

.addFlowStep(step: SubFlowStepInput)

.addCustomStep(step: CustomStepInput)

.build(): Flow
```

## Option 1 Proposed Types

```ts
type FlowBuilderInput = Omit<Flow, 'steps'> & {
  steps?: FlowStep[];
};

type FlowStepPointer = string | number | { id: string | number; label?: string };

type StepInput = {
  id: string | number;
  title?: string;
  summary?: string;
  nextSteps?: FlowStepPointer[];
};

type MessageStepInput<TMessageId extends string = string> = StepInput & {
  message?: { id: TMessageId; version?: string };
  version?: string;
};

type ServiceStepInput = StepInput & {
  service?: { id: string; version?: string };
  version?: string;
};

type ActorStepInput = StepInput & {
  actor?: { name: string; summary?: string };
  name?: string;
};

type ExternalSystemStepInput = StepInput & {
  externalSystem?: { name: string; summary?: string; url?: string };
  name?: string;
  url?: string;
};
```

## Deferred: Catalog-Aware Type Generation

Option 1 can become much stronger if the SDK or CLI can generate TypeScript types from an existing catalog.

The goal is not runtime lookup like this:

```ts
const service = await getService('InventoryService');
```

Instead, the goal is type-level catalog awareness:

```ts
.addServiceStep({ id: 'InventoryService' })
.addMessageStep({ id: 'HourlyCurtailmentCalculated' })
```

Those ids should autocomplete and fail at compile time when they do not exist in the generated catalog types.

## Generated Catalog Types

Add a command that reads the catalog and writes a generated TypeScript file.

```sh
eventcatalog generate types --output eventcatalog.generated.ts
```

Example generated file:

```ts
// eventcatalog.generated.ts
// Generated by EventCatalog. Do not edit manually.

export type EventId = 'HourlyCurtailmentCalculated' | 'DailyCurtailmentCalculated' | 'MonthlyCurtailmentCalculated';

export type CommandId = 'CalculateCurtailment' | 'RegisterCurtailmentPeriod';

export type QueryId = 'GetCurtailmentPeriod';

export type MessageId = EventId | CommandId | QueryId;

export type ServiceId = 'CurtailmentService' | 'SAP';

export type FlowId = 'CurtailmentCalculation' | 'CurtailmentRewarding';

export type CatalogTypes = {
  events: EventId;
  commands: CommandId;
  queries: QueryId;
  messages: MessageId;
  services: ServiceId;
  flows: FlowId;
};
```

Then users can bind the builder to their catalog types:

```ts
import { FlowBuilder } from '@eventcatalog/sdk';
import type { CatalogTypes } from './eventcatalog.generated';

const flow = FlowBuilder.forCatalog<CatalogTypes>({
  id: 'CurtailmentCalculation',
  name: 'Curtailment Calculation',
  version: '1.0.0',
  markdown: '',
})
  .addStep({
    id: 'Calculate',
    nextSteps: [{ id: 'HourlyCurtailmentCalculated' }],
  })
  .addMessageStep({
    id: 'HourlyCurtailmentCalculated',
    nextSteps: [{ id: 'DailyCurtailmentCalculated' }, { id: 'SAP', label: 'Send curtailment period to SAP' }],
  })
  .addServiceStep({ id: 'SAP' })
  .build();
```

This should fail at compile time:

```ts
FlowBuilder.forCatalog<CatalogTypes>({
  id: 'CurtailmentCalculation',
  name: 'Curtailment Calculation',
  version: '1.0.0',
  markdown: '',
})
  // Typo: not present in CatalogTypes['messages']
  .addMessageStep({ id: 'HourlyCurtailmentCalcualted' })
  .build();
```

## Generated Catalog Refs

For a nicer authoring experience, the generator could also emit a `catalog` object.

```ts
// eventcatalog.generated.ts
export const catalog = {
  events: {
    HourlyCurtailmentCalculated: 'HourlyCurtailmentCalculated',
    DailyCurtailmentCalculated: 'DailyCurtailmentCalculated',
    MonthlyCurtailmentCalculated: 'MonthlyCurtailmentCalculated',
  },
  services: {
    CurtailmentService: 'CurtailmentService',
    SAP: 'SAP',
  },
  flows: {
    CurtailmentCalculation: 'CurtailmentCalculation',
    CurtailmentRewarding: 'CurtailmentRewarding',
  },
} as const;
```

Usage:

```ts
import { FlowBuilder } from '@eventcatalog/sdk';
import { catalog } from './eventcatalog.generated';
import type { CatalogTypes } from './eventcatalog.generated';

const flow = FlowBuilder.forCatalog<CatalogTypes>({
  id: catalog.flows.CurtailmentCalculation,
  name: 'Curtailment Calculation',
  version: '1.0.0',
  markdown: '',
})
  .addMessageStep({
    id: catalog.events.HourlyCurtailmentCalculated,
    nextSteps: [
      { id: catalog.events.DailyCurtailmentCalculated },
      { id: catalog.services.SAP, label: 'Send curtailment period to SAP' },
    ],
  })
  .addServiceStep({ id: catalog.services.SAP })
  .build();
```

This gives users autocomplete from real catalog ids without asking the builder to read the catalog at runtime.

## Typed Ref Objects

If we want stricter separation between events, services, flows, and custom steps, the generator could emit typed ref objects instead of plain strings.

```ts
export const catalog = {
  events: {
    HourlyCurtailmentCalculated: {
      type: 'message',
      id: 'HourlyCurtailmentCalculated',
    },
  },
  services: {
    SAP: {
      type: 'service',
      id: 'SAP',
    },
  },
} as const;
```

Usage:

```ts
const flow = FlowBuilder.forCatalog<CatalogTypes>({
  id: 'CurtailmentCalculation',
  name: 'Curtailment Calculation',
  version: '1.0.0',
  markdown: '',
})
  .addMessageStep({
    id: catalog.events.HourlyCurtailmentCalculated.id,
    message: catalog.events.HourlyCurtailmentCalculated,
    nextSteps: [
      catalog.events.DailyCurtailmentCalculated,
      {
        ...catalog.services.SAP,
        label: 'Send curtailment period to SAP',
      },
    ],
  })
  .build();
```

The builder would serialize these refs back into the existing `FlowStep` shape. No runtime catalog lookup is required.

## Type Generation Design Notes

- Type generation should be optional. Users can still use plain strings.
- Generated types should be committed by users if they want stable CI type checking.
- The generated file should include literal unions and optionally a `catalog` value for autocomplete.
- The first version can use plain string refs. Typed ref objects can come later if we need stronger separation.
- The builder should never need to read catalog files at runtime just to validate ids.
- Runtime validation could still be offered separately for users who want it.

## Design Notes

- The builder should output the existing `Flow` type. No new persisted format is needed.
- `nextSteps` should be the friendly API, normalized internally to `next_step` or `next_steps`.
- Explicit methods like `.addMessageStep()`, `.addServiceStep()`, and `.addExternalSystemStep()` make the API readable and avoid overloading one generic `.addStep()` method.
- A generic message id type lets users pass enums and get autocomplete.
- Generated catalog types can replace hand-written enums for users who want catalog-backed ids.
- Message steps should accept `{ version }`, but default to EventCatalog's usual latest-version behavior when omitted.
- `.connect()` is deferred.
- The builder should validate duplicate step ids and missing `nextSteps` references before returning the flow.
- Flow writing should use the same `writeResource` internals as other SDK resources.

## Open Questions

- Should `.addMessageStep()` infer `type: 'message'`, or should the current catalog renderer continue to infer from the `message` property alone?
- Should enum-backed message ids be typed as events only, or should the builder support separate event, command, and query enums?
- Should `writeFlowToDomain` and `writeFlowToService` also update the parent domain/service `flows` pointer list, or only write into the nested directory?
- Should the SDK include `flowToDSL()` later, matching the existing `toDSL()` work for other resources?
- Should the generated `catalog` object use plain string values first, or typed ref objects from day one?
