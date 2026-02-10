import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeFunction } from '../cli/executor';

// Mock the SDK
vi.mock('../index', () => ({
  default: vi.fn((path: string) => ({
    testFunction: vi.fn(async (arg1: string, arg2: number) => ({
      success: true,
      arg1,
      arg2,
    })),
    getEvent: vi.fn(async (id: string) => ({
      id,
      name: `Event ${id}`,
    })),
    getEvents: vi.fn(async (options: any) => [
      { id: 'Event1', version: '1.0.0' },
      { id: 'Event2', version: '1.0.0' },
    ]),
    notAFunction: 'not callable',
  })),
}));

describe('executeFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute a function with arguments', async () => {
    const result = await executeFunction('.', 'testFunction', ['test', '42']);
    expect(result).toEqual({
      success: true,
      arg1: 'test',
      arg2: 42,
    });
  });

  it('should execute getEvent function', async () => {
    const result = await executeFunction('.', 'getEvent', ['OrderCreated']);
    expect(result).toEqual({
      id: 'OrderCreated',
      name: 'Event OrderCreated',
    });
  });

  it('should execute getEvents function with options', async () => {
    const result = await executeFunction('.', 'getEvents', ['{"latestOnly":true}']);
    expect(result).toEqual([
      { id: 'Event1', version: '1.0.0' },
      { id: 'Event2', version: '1.0.0' },
    ]);
  });

  it('should throw error when function does not exist', async () => {
    await expect(executeFunction('.', 'nonexistentFunction', [])).rejects.toThrow(`Function 'nonexistentFunction' not found`);
  });

  it('should throw error when trying to call non-function property', async () => {
    await expect(executeFunction('.', 'notAFunction', [])).rejects.toThrow(`'notAFunction' is not a callable function`);
  });

  it('should throw error when catalog directory does not exist', async () => {
    await expect(executeFunction('/nonexistent/path', 'getEvent', ['test'])).rejects.toThrow(`Catalog directory not found`);
  });

  it('should parse JSON arguments', async () => {
    const result = await executeFunction('.', 'getEvents', ['{"latestOnly":true}']);
    expect(result).toBeDefined();
  });
});
