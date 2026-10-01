import { describe, expect, it } from 'vitest';
import { getDistinctMessagePairs, shouldRouteConsumerMessageAfterChannel } from '../shared-channel-messages';

describe('shared channel message relationships', () => {
  it('keeps identical message ids on the existing relationship path', () => {
    expect(getDistinctMessagePairs(['OrderCreate'], ['OrderCreate'])).toEqual([]);
  });

  it('maps one producer message to multiple distinct consumer messages', () => {
    expect(getDistinctMessagePairs(['OrderCreate'], ['OrderCreate', 'OrderHistoryCreate'])).toEqual([
      { producerMessageId: 'OrderCreate', consumerMessageId: 'OrderHistoryCreate' },
    ]);
  });

  it('maps multiple producer messages to one distinct consumer message', () => {
    expect(getDistinctMessagePairs(['OrderCreate', 'OrderHistoryCreate'], ['ConsumeOrder'])).toEqual([
      { producerMessageId: 'OrderCreate', consumerMessageId: 'ConsumeOrder' },
      { producerMessageId: 'OrderHistoryCreate', consumerMessageId: 'ConsumeOrder' },
    ]);
  });

  it('maps the unambiguous remainder after preserving an identical message id', () => {
    expect(getDistinctMessagePairs(['OrderCreate', 'OrderCancelled'], ['OrderCreate', 'OrderHistoryCreate'])).toEqual([
      { producerMessageId: 'OrderCancelled', consumerMessageId: 'OrderHistoryCreate' },
    ]);
  });

  it('does not guess a many-to-many mapping', () => {
    expect(getDistinctMessagePairs(['OrderCreate', 'OrderCancelled'], ['FinanceOrder', 'HistoryOrder'])).toEqual([]);
  });

  it('routes a consumer-only message after a channel', () => {
    expect(shouldRouteConsumerMessageAfterChannel(['OrderCreate'], 'OrderHistoryCreate')).toBe(true);
    expect(shouldRouteConsumerMessageAfterChannel(['OrderCreate'], 'OrderCreate')).toBe(false);
    expect(shouldRouteConsumerMessageAfterChannel([], 'OrderHistoryCreate')).toBe(false);
  });
});
