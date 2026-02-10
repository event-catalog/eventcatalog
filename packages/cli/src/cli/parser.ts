/**
 * Parse command-line arguments into typed values
 * Supports JSON objects/arrays, booleans, numbers, and strings
 */
export function parseArguments(rawArgs: string[]): any[] {
  return rawArgs.map((arg, index) => {
    // Try to parse as JSON object or array if it looks like JSON
    if ((arg.startsWith('{') && arg.endsWith('}')) || (arg.startsWith('[') && arg.endsWith(']'))) {
      try {
        return JSON.parse(arg);
      } catch (error) {
        // If it fails to parse as JSON, treat it as a string
        // Only throw error if it looks like valid JSON syntax was intended
        if (arg.includes(':') || arg.includes(',')) {
          throw new Error(`Invalid JSON in argument ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Otherwise, return as string
        return arg;
      }
    }

    // Parse booleans
    if (arg === 'true') return true;
    if (arg === 'false') return false;

    // Parse numbers
    if (/^-?\d+(\.\d+)?$/.test(arg)) {
      return Number(arg);
    }

    // Return as string
    return arg;
  });
}
