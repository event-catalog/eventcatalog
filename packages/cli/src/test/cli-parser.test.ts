import { describe, it, expect } from 'vitest';
import { parseArguments } from '../cli/parser';

describe('parseArguments', () => {
  it('should parse string arguments', () => {
    const result = parseArguments(['hello', 'world']);
    expect(result).toEqual(['hello', 'world']);
  });

  it('should parse numeric arguments', () => {
    const result = parseArguments(['42', '3.14', '-100']);
    expect(result).toEqual([42, 3.14, -100]);
  });

  it('should parse boolean arguments', () => {
    const result = parseArguments(['true', 'false']);
    expect(result).toEqual([true, false]);
  });

  it('should parse JSON objects', () => {
    const result = parseArguments(['{"id":"test","name":"Test"}']);
    expect(result).toEqual([{ id: 'test', name: 'Test' }]);
  });

  it('should parse JSON arrays', () => {
    const result = parseArguments(['["item1","item2","item3"]']);
    expect(result).toEqual([['item1', 'item2', 'item3']]);
  });

  it('should parse nested JSON objects', () => {
    const result = parseArguments(['{"user":{"id":"123","name":"John"},"active":true}']);
    expect(result).toEqual([{ user: { id: '123', name: 'John' }, active: true }]);
  });

  it('should parse mixed argument types', () => {
    const result = parseArguments(['OrderCreated', '1.0.0', '{"latestOnly":true}']);
    expect(result).toEqual(['OrderCreated', '1.0.0', { latestOnly: true }]);
  });

  it('should throw error on invalid JSON with key-value pairs', () => {
    expect(() => parseArguments(['{"invalid":"json}'])).toThrow('Invalid JSON in argument 1');
  });

  it('should handle empty array', () => {
    const result = parseArguments([]);
    expect(result).toEqual([]);
  });

  it('should preserve string that looks like JSON but is not surrounded by quotes', () => {
    const result = parseArguments(['{not json}']);
    expect(result).toEqual(['{not json}']);
  });

  it('should parse JSON with numeric values', () => {
    const result = parseArguments(['{"count":42,"price":19.99}']);
    expect(result).toEqual([{ count: 42, price: 19.99 }]);
  });
});
