import { describe, expect, it } from 'vitest';
import { flowStepSchema } from '@utils/collections/flow-step-schema';

const messagesFor = (step: unknown) => {
  const result = flowStepSchema.safeParse(step);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('flow step schema', () => {
  it('accepts a step without a title (it defaults to what the step points at)', () => {
    expect(messagesFor({ id: 'checkout', service: { id: 'checkout-api' } })).toEqual([]);
  });

  it('accepts a custom step without a title of its own', () => {
    expect(messagesFor({ id: 'done', title: 'Order placed', custom: { color: 'green' } })).toEqual([]);
  });

  it('accepts a channel as a step', () => {
    const step = flowStepSchema.parse({ id: 'orders-topic', channel: { id: 'orders', version: '1.0.0' } });
    expect(step.channel).toEqual({ id: 'orders', version: '1.0.0' });
  });

  it('still accepts the step type older flows (and the editor) write, though nothing reads it', () => {
    expect(messagesFor({ id: 'checkout', type: 'node', title: 'Checkout' })).toEqual([]);
  });

  it('rejects keys a step does not have, so a typo is not silently dropped', () => {
    expect(messagesFor({ id: 'checkout', title: 'Checkout', servce: { id: 'checkout-api' } })).toEqual([
      'Unknown property "servce". Custom properties must start with "x-".',
    ]);
  });

  it('accepts x- properties on a step', () => {
    expect(messagesFor({ id: 'checkout', title: 'Checkout', 'x-sla': '99.9%' })).toEqual([]);
  });

  it('explains that a step uses next_step or next_steps, not both', () => {
    expect(messagesFor({ id: 'checkout', title: 'Checkout', next_step: 'a', next_steps: ['b'] })).toEqual([
      'Step "checkout" has both next_step and next_steps. Use next_step for one next step, or next_steps for several.',
    ]);
  });

  it('explains which resources a step points at when it points at more than one', () => {
    expect(
      messagesFor({ id: 'checkout', title: 'Checkout', message: { id: 'PlaceOrder' }, service: { id: 'checkout-api' } })
    ).toEqual(['Step "checkout" points at message and service. A step can only be one thing, so split it into two steps.']);
  });
});
