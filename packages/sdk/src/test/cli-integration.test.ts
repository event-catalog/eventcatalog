import { describe, it, expect, vi } from 'vitest';
import { listFunctions, formatListOutput } from '../cli/list';

// Mock the SDK
vi.mock('../index', () => ({
  default: vi.fn(() => ({
    // Event functions
    getEvent: () => {},
    getEvents: () => {},
    writeEvent: () => {},
    removeEvent: () => {},
    eventHasVersion: () => {},

    // Command functions
    getCommand: () => {},
    getCommands: () => {},
    writeCommand: () => {},
    commandHasVersion: () => {},

    // Query functions
    getQuery: () => {},
    getQueries: () => {},
    writeQuery: () => {},
    queryHasVersion: () => {},

    // Service functions
    getService: () => {},
    getServices: () => {},
    writeService: () => {},
    serviceHasVersion: () => {},

    // Domain functions
    getDomain: () => {},
    getDomains: () => {},
    writeDomain: () => {},
    domainHasVersion: () => {},

    // Channel functions
    getChannel: () => {},
    getChannels: () => {},
    writeChannel: () => {},
    channelHasVersion: () => {},

    // Entity functions
    getEntity: () => {},
    getEntities: () => {},
    writeEntity: () => {},
    entityHasVersion: () => {},

    // DataStore functions
    getDataStore: () => {},
    getDataStores: () => {},
    writeDataStore: () => {},
    dataStoreHasVersion: () => {},

    // DataProduct functions
    getDataProduct: () => {},
    getDataProducts: () => {},
    writeDataProduct: () => {},
    dataProductHasVersion: () => {},

    // Team functions
    getTeam: () => {},
    getTeams: () => {},
    writeTeam: () => {},

    // User functions
    getUser: () => {},
    getUsers: () => {},
    writeUser: () => {},

    // Custom Doc functions
    getCustomDoc: () => {},
    getCustomDocs: () => {},
    writeCustomDoc: () => {},

    // Message functions
    getProducersAndConsumersForMessage: () => {},
    getConsumersOfSchema: () => {},
    getProducersOfSchema: () => {},

    // Utility functions
    dumpCatalog: () => {},
    getResourcePath: () => {},
    getResourceFolderName: () => {},
  })),
}));

describe('CLI Integration', () => {
  it('should list functions organized by category', () => {
    const functions = listFunctions('.');

    expect(functions).toHaveProperty('Events');
    expect(functions).toHaveProperty('Commands');
    expect(functions).toHaveProperty('Queries');
    expect(functions).toHaveProperty('Services');
    expect(functions).toHaveProperty('Domains');
    expect(functions).toHaveProperty('Channels');
    expect(functions).toHaveProperty('Entities');
    expect(functions).toHaveProperty('DataStores');
    expect(functions).toHaveProperty('DataProducts');
    expect(functions).toHaveProperty('Teams');
    expect(functions).toHaveProperty('Users');
    expect(functions).toHaveProperty('Custom Docs');
    expect(functions).toHaveProperty('Messages');
  });

  it('should categorize functions correctly', () => {
    const functions = listFunctions('.');

    expect(functions.Events).toContain('getEvent');
    expect(functions.Events).toContain('getEvents');
    expect(functions.Events).toContain('writeEvent');
    expect(functions.Commands).toContain('getCommand');
    expect(functions.Services).toContain('getService');
    expect(functions.Domains).toContain('getDomain');
  });

  it('should format output as human-readable string', () => {
    const functions = listFunctions('.');
    const output = formatListOutput(functions);

    expect(output).toContain('Available EventCatalog SDK Functions:');
    expect(output).toContain('Events:');
    expect(output).toContain('Commands:');
    expect(output).toContain('Services:');
  });

  it('should include all function categories in output', () => {
    const functions = listFunctions('.');
    const output = formatListOutput(functions);

    Object.keys(functions).forEach((category) => {
      expect(output).toContain(`${category}:`);
    });
  });
});
