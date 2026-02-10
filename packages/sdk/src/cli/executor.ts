import { existsSync } from 'node:fs';
import { parseArguments } from './parser';
import createSDK from '../index';

/**
 * Execute a SDK function with the given arguments
 */
export async function executeFunction(catalogDir: string, functionName: string, rawArgs: string[]): Promise<any> {
  // Validate catalog directory exists
  if (!existsSync(catalogDir)) {
    throw new Error(`Catalog directory not found: ${catalogDir}`);
  }

  // Initialize the SDK
  const sdk = createSDK(catalogDir);

  // Validate function exists
  if (!(functionName in sdk)) {
    throw new Error(`Function '${functionName}' not found. Use 'eventcatalog list' to see available functions.`);
  }

  const fn = (sdk as any)[functionName];

  // Validate it's callable
  if (typeof fn !== 'function') {
    throw new Error(`'${functionName}' is not a callable function.`);
  }

  // Parse arguments
  const parsedArgs = parseArguments(rawArgs);

  // Execute function
  try {
    return await fn(...parsedArgs);
  } catch (error) {
    throw new Error(`Error executing '${functionName}': ${error instanceof Error ? error.message : String(error)}`);
  }
}
