import type { Flow, FlowStep } from './types';

type FlowStepId = string | number;
type FlowStepPointer = FlowStepId | { id: FlowStepId; label?: string };

/**
 * Input used to create a flow builder.
 *
 * This is the normal `Flow` resource shape without requiring `steps` up front.
 * You can pass existing steps if you want to append to a partially built flow.
 */
export type FlowBuilderInput = Omit<Flow, 'steps'> & {
  steps?: FlowStep[];
};

/**
 * Payload for a generic flow step.
 *
 * Use generic steps for process milestones that are not messages, services,
 * actors, external systems, sub-flows, or custom nodes.
 */
export type FlowStepInput = {
  id: FlowStepId;
  title?: string;
  summary?: string;
  nextSteps?: FlowStepPointer[];
};

/**
 * Payload for a flow step that references an event, command, or query.
 */
export type FlowMessageStepInput<TMessageId extends string = string> = FlowStepInput & {
  message?: {
    id: TMessageId;
    version?: string;
  };
  version?: string;
};

/**
 * Payload for a flow step that references a service.
 */
export type FlowServiceStepInput = FlowStepInput & {
  service?: {
    id: string;
    version?: string;
  };
  version?: string;
};

/**
 * Payload for a flow step that represents a user or actor.
 */
export type FlowActorStepInput = FlowStepInput & {
  actor?: {
    name: string;
    summary?: string;
  };
  name?: string;
};

/**
 * Payload for a flow step that represents an external system.
 */
export type FlowExternalSystemStepInput = FlowStepInput & {
  externalSystem?: {
    name: string;
    summary?: string;
    url?: string;
  };
  name?: string;
  url?: string;
};

/**
 * Payload for a flow step that references another flow.
 */
export type FlowSubFlowStepInput = FlowStepInput & {
  flow?: {
    id: string;
    version?: string;
  };
  version?: string;
};

/**
 * Payload for a custom flow step.
 */
export type FlowCustomStepInput = FlowStepInput & {
  custom?: {
    title: string;
    icon?: string;
    type?: string;
    summary?: string;
    url?: string;
    color?: string;
    properties?: Record<string, string | number>;
    height?: number;
    menu?: { label: string; url?: string }[];
  };
  icon?: string;
  type?: string;
  url?: string;
  color?: string;
  properties?: Record<string, string | number>;
  height?: number;
  menu?: { label: string; url?: string }[];
};

const cloneStep = (step: FlowStep): FlowStep => ({
  ...step,
  ...(step.message ? { message: { ...step.message } } : {}),
  ...(step.service ? { service: { ...step.service } } : {}),
  ...(step.flow ? { flow: { ...step.flow } } : {}),
  ...(step.actor ? { actor: { ...step.actor } } : {}),
  ...(step.custom
    ? {
        custom: {
          ...step.custom,
          ...(step.custom.properties ? { properties: { ...step.custom.properties } } : {}),
          ...(step.custom.menu ? { menu: step.custom.menu.map((item) => ({ ...item })) } : {}),
        },
      }
    : {}),
  ...(step.externalSystem ? { externalSystem: { ...step.externalSystem } } : {}),
  ...(step.next_step !== undefined
    ? { next_step: typeof step.next_step === 'object' ? { ...step.next_step } : step.next_step }
    : {}),
  ...(step.next_steps ? { next_steps: step.next_steps.map((next) => (typeof next === 'object' ? { ...next } : next)) } : {}),
});

/**
 * Build EventCatalog flow resources using a fluent API.
 *
 * `FlowBuilder` is useful when you want to define flows in code and then write
 * the generated `Flow` resource with `writeFlow`. The builder outputs the normal
 * EventCatalog `Flow` shape, so the persisted catalog remains standard
 * markdown/frontmatter.
 *
 * `nextSteps` is the authoring API. When `build()` is called, a single next step
 * is normalized to `next_step` and multiple next steps are normalized to
 * `next_steps`.
 *
 * @example
 * ```ts
 * import utils, { FlowBuilder } from '@eventcatalog/sdk';
 *
 * const { writeFlow } = utils('/path/to/eventcatalog');
 *
 * const flow = FlowBuilder.create({
 *   id: 'PaymentFlow',
 *   name: 'Payment Flow',
 *   version: '1.0.0',
 *   markdown: '# Payment Flow',
 * })
 *   .addStep({
 *     id: 'Customer places order',
 *     nextSteps: [{ id: 'PlaceOrder', label: 'places order' }],
 *   })
 *   .addMessageStep({
 *     id: 'PlaceOrder',
 *     message: { id: 'PlaceOrder' },
 *     nextSteps: [{ id: 'PaymentService', label: 'process payment' }],
 *   })
 *   .addServiceStep({
 *     id: 'PaymentService',
 *     service: { id: 'PaymentService' },
 *   })
 *   .build();
 *
 * await writeFlow(flow);
 * ```
 *
 * @example
 * ```ts
 * import { FlowBuilder } from '@eventcatalog/sdk';
 *
 * type PaymentMessageId = 'PlaceOrder' | 'PaymentProcessed';
 *
 * const flow = FlowBuilder.create<PaymentMessageId>({
 *   id: 'TypedPaymentFlow',
 *   name: 'Typed Payment Flow',
 *   version: '1.0.0',
 *   markdown: '# Typed Payment Flow',
 * })
 *   .addMessageStep({
 *     id: 'PlaceOrder',
 *     nextSteps: [{ id: 'PaymentProcessed' }],
 *   })
 *   .addMessageStep({
 *     id: 'PaymentProcessed',
 *   })
 *   .build();
 * ```
 */
export class FlowBuilder<TMessageId extends string = string> {
  private readonly flowResource: FlowBuilderInput;
  private readonly steps = new Map<FlowStepId, FlowStep>();
  private readonly order: FlowStepId[] = [];

  private constructor(flow: FlowBuilderInput) {
    this.flowResource = { ...flow };

    for (const step of flow.steps || []) {
      this.appendStep(cloneStep(step));
    }
  }

  /**
   * Create a flow builder.
   *
   * The created builder can add steps and then produce a normal `Flow` resource
   * with `build()`.
   *
   * @example
   * ```ts
   * const flow = FlowBuilder.create({
   *   id: 'PaymentFlow',
   *   name: 'Payment Flow',
   *   version: '1.0.0',
   *   markdown: '# Payment Flow',
   * }).build();
   * ```
   */
  static create<TMessageId extends string = string>(flow: FlowBuilderInput) {
    return new FlowBuilder<TMessageId>(flow);
  }

  /**
   * Add a generic flow step.
   *
   * Generic steps are useful for business process stages that do not map to
   * another catalog resource.
   *
   * @param step - The step payload.
   *
   * @example
   * ```ts
   * FlowBuilder.create({
   *   id: 'OrderFlow',
   *   name: 'Order Flow',
   *   version: '1.0.0',
   *   markdown: '',
   * })
   *   .addStep({
   *     id: 'Calculate',
   *     title: 'Calculate totals',
   *     nextSteps: [{ id: 'OrderConfirmed' }],
   *   });
   * ```
   */
  addStep(step: FlowStepInput) {
    return this.addStepWithNext(
      {
        id: step.id,
        title: step.title || String(step.id),
        ...(step.summary ? { summary: step.summary } : {}),
      },
      step.nextSteps
    );
  }

  /**
   * Add a message step.
   *
   * Message steps can reference an event, command, or query id.
   *
   * @param step - The message step payload.
   *
   * @example
   * ```ts
   * FlowBuilder.create({
   *   id: 'OrderFlow',
   *   name: 'Order Flow',
   *   version: '1.0.0',
   *   markdown: '',
   * })
   *   .addMessageStep({
   *     id: 'OrderConfirmed',
   *     title: 'Order confirmed',
   *     message: { id: 'OrderConfirmed', version: '1.0.0' },
   *   });
   * ```
   */
  addMessageStep(step: FlowMessageStepInput<TMessageId>) {
    const message = step.message || {
      id: String(step.id) as TMessageId,
      ...(step.version ? { version: step.version } : {}),
    };

    return this.addStepWithNext(
      {
        id: step.id,
        title: step.title || String(step.id),
        ...(step.summary ? { summary: step.summary } : {}),
        message: { ...message, ...(step.version && !message.version ? { version: step.version } : {}) },
      },
      step.nextSteps
    );
  }

  /**
   * Add a service step.
   *
   * @param step - The service step payload.
   *
   * @example
   * ```ts
   * FlowBuilder.create({
   *   id: 'OrderFlow',
   *   name: 'Order Flow',
   *   version: '1.0.0',
   *   markdown: '',
   * })
   *   .addServiceStep({
   *     id: 'OrderService',
   *     service: { id: 'OrderService', version: '1.0.0' },
   *   });
   * ```
   */
  addServiceStep(step: FlowServiceStepInput) {
    const service = step.service || {
      id: String(step.id),
      ...(step.version ? { version: step.version } : {}),
    };

    return this.addStepWithNext(
      {
        id: step.id,
        title: step.title || String(step.id),
        ...(step.summary ? { summary: step.summary } : {}),
        service: { ...service, ...(step.version && !service.version ? { version: step.version } : {}) },
      },
      step.nextSteps
    );
  }

  /**
   * Add an actor step.
   *
   * @param step - The actor step payload.
   *
   * @example
   * ```ts
   * FlowBuilder.create({
   *   id: 'OrderFlow',
   *   name: 'Order Flow',
   *   version: '1.0.0',
   *   markdown: '',
   * })
   *   .addActorStep({
   *     id: 'Customer',
   *     actor: { name: 'Customer' },
   *   });
   * ```
   */
  addActorStep(step: FlowActorStepInput) {
    const actor = step.actor || {
      name: step.name || step.title || String(step.id),
      ...(step.summary ? { summary: step.summary } : {}),
    };

    return this.addStepWithNext(
      {
        id: step.id,
        title: step.title || actor.name,
        ...(step.summary ? { summary: step.summary } : {}),
        actor,
      },
      step.nextSteps
    );
  }

  /**
   * Add an external system step.
   *
   * @param step - The external system step payload.
   *
   * @example
   * ```ts
   * FlowBuilder.create({
   *   id: 'PaymentFlow',
   *   name: 'Payment Flow',
   *   version: '1.0.0',
   *   markdown: '',
   * })
   *   .addExternalSystemStep({
   *     id: 'Stripe',
   *     externalSystem: {
   *       name: 'Stripe',
   *       summary: 'Payment provider',
   *       url: 'https://stripe.com',
   *     },
   *   });
   * ```
   */
  addExternalSystemStep(step: FlowExternalSystemStepInput) {
    const externalSystem = step.externalSystem || {
      name: step.name || step.title || String(step.id),
      ...(step.summary ? { summary: step.summary } : {}),
      ...(step.url ? { url: step.url } : {}),
    };

    return this.addStepWithNext(
      {
        id: step.id,
        title: step.title || externalSystem.name,
        ...(step.summary ? { summary: step.summary } : {}),
        externalSystem,
      },
      step.nextSteps
    );
  }

  /**
   * Add a sub-flow step.
   *
   * @param step - The sub-flow step payload.
   *
   * @example
   * ```ts
   * FlowBuilder.create({
   *   id: 'OrderFlow',
   *   name: 'Order Flow',
   *   version: '1.0.0',
   *   markdown: '',
   * })
   *   .addFlowStep({
   *     id: 'PaymentFlow',
   *     flow: { id: 'PaymentFlow', version: '1.0.0' },
   *   });
   * ```
   */
  addFlowStep(step: FlowSubFlowStepInput) {
    const flow = step.flow || {
      id: String(step.id),
      ...(step.version ? { version: step.version } : {}),
    };

    return this.addStepWithNext(
      {
        id: step.id,
        title: step.title || String(step.id),
        ...(step.summary ? { summary: step.summary } : {}),
        flow: { ...flow, ...(step.version && !flow.version ? { version: step.version } : {}) },
      },
      step.nextSteps
    );
  }

  /**
   * Add a custom flow step.
   *
   * @param step - The custom step payload.
   *
   * @example
   * ```ts
   * FlowBuilder.create({
   *   id: 'PaymentFlow',
   *   name: 'Payment Flow',
   *   version: '1.0.0',
   *   markdown: '',
   * })
   *   .addCustomStep({
   *     id: 'ManualReview',
   *     custom: {
   *       title: 'Manual review',
   *       type: 'manual',
   *     },
   *   });
   * ```
   */
  addCustomStep(step: FlowCustomStepInput) {
    const custom = step.custom || {
      title: step.title || String(step.id),
      ...(step.icon ? { icon: step.icon } : {}),
      ...(step.type ? { type: step.type } : {}),
      ...(step.summary ? { summary: step.summary } : {}),
      ...(step.url ? { url: step.url } : {}),
      ...(step.color ? { color: step.color } : {}),
      ...(step.properties ? { properties: step.properties } : {}),
      ...(step.height ? { height: step.height } : {}),
      ...(step.menu ? { menu: step.menu } : {}),
    };

    return this.addStepWithNext(
      {
        id: step.id,
        title: step.title || custom.title,
        ...(step.summary ? { summary: step.summary } : {}),
        custom,
      },
      step.nextSteps
    );
  }

  /**
   * Build the EventCatalog flow resource.
   *
   * @returns A `Flow` resource that can be written with `writeFlow`.
   */
  build(): Flow {
    this.validateNextSteps();

    const { steps: _steps, ...flow } = this.flowResource;

    return {
      ...flow,
      steps: this.order.map((id) => cloneStep(this.steps.get(id)!)),
    };
  }

  private addStepWithNext(step: FlowStep, nextSteps?: FlowStepPointer[]) {
    const normalizedNextSteps = nextSteps?.map((next) => (typeof next === 'object' ? { ...next } : { id: next })) || [];

    if (normalizedNextSteps.length === 1) {
      step.next_step = normalizedNextSteps[0];
    } else if (normalizedNextSteps.length > 1) {
      step.next_steps = normalizedNextSteps;
    }

    this.appendStep(step);
    return this;
  }

  private appendStep(step: FlowStep) {
    if (this.steps.has(step.id)) {
      throw new Error(`Flow step with id "${step.id}" already exists`);
    }

    this.steps.set(step.id, step);
    this.order.push(step.id);
  }

  private validateNextSteps() {
    for (const step of this.steps.values()) {
      const nextSteps = step.next_step !== undefined ? [step.next_step] : step.next_steps || [];

      for (const next of nextSteps) {
        const nextStepId = typeof next === 'object' && next ? next.id : next;

        if (!this.steps.has(nextStepId)) {
          throw new Error(`Flow step "${step.id}" references missing next step "${nextStepId}"`);
        }
      }
    }
  }
}
