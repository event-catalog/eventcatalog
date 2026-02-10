import createSDK from '../index';

interface CategorizedFunctions {
  [category: string]: string[];
}

/**
 * Get all available SDK functions organized by category
 */
export function listFunctions(catalogDir: string = '.'): CategorizedFunctions {
  // Initialize SDK to get all functions
  const sdk = createSDK(catalogDir);

  // Get all function names from SDK
  const functionNames = Object.keys(sdk).filter((key) => typeof (sdk as any)[key] === 'function');

  // Categorize functions based on naming patterns
  const categories: CategorizedFunctions = {
    Events: [],
    Commands: [],
    Queries: [],
    Channels: [],
    Services: [],
    Domains: [],
    Entities: [],
    DataStores: [],
    DataProducts: [],
    Teams: [],
    Users: [],
    'Custom Docs': [],
    Messages: [],
    Utilities: [],
  };

  functionNames.forEach((name) => {
    if (name.includes('Event')) categories['Events'].push(name);
    else if (name.includes('Command')) categories['Commands'].push(name);
    else if (name.includes('Query')) categories['Queries'].push(name);
    else if (name.includes('Channel')) categories['Channels'].push(name);
    else if (name.includes('Service')) categories['Services'].push(name);
    else if (name.includes('Domain')) categories['Domains'].push(name);
    else if (name.includes('Entity')) categories['Entities'].push(name);
    else if (name.includes('DataStore')) categories['DataStores'].push(name);
    else if (name.includes('DataProduct')) categories['DataProducts'].push(name);
    else if (name.includes('Team')) categories['Teams'].push(name);
    else if (name.includes('User')) categories['Users'].push(name);
    else if (name.includes('CustomDoc')) categories['Custom Docs'].push(name);
    else if (name.includes('Message') || name.includes('Producers') || name.includes('Consumers'))
      categories['Messages'].push(name);
    else categories['Utilities'].push(name);
  });

  // Remove empty categories
  Object.keys(categories).forEach((key) => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
}

/**
 * Format and print categorized functions
 */
export function formatListOutput(functions: CategorizedFunctions): string {
  let output = 'Available EventCatalog SDK Functions:\n\n';

  Object.entries(functions).forEach(([category, names]) => {
    output += `${category}:\n`;
    names.sort().forEach((name) => {
      output += `  - ${name}\n`;
    });
    output += '\n';
  });

  return output;
}
