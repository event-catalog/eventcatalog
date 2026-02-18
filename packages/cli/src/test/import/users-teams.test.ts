import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('users-teams');
setup();

describe('import users and teams', () => {
  it('imports users and teams', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `user jdoe {
  name "John Doe"
  role "Engineer"
  email "jdoe@example.com"
}

team platform {
  name "Platform Team"
  member jdoe
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 2 resource(s)');

    const sdk = createSDK(catalogPath);
    const user = await sdk.getUser('jdoe');
    const team = await sdk.getTeam('platform');
    expect(user).toBeDefined();
    expect(team).toBeDefined();
    expect(user!.name).toBe('John Doe');
    expect(team!.name).toBe('Platform Team');
  });

  it('does not add <NodeGraph /> to users', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `user jdoe {
  name "John Doe"
  role "Engineer"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const user = await sdk.getUser('jdoe');
    expect(user).toBeDefined();
    expect(user!.markdown).not.toContain('<NodeGraph />');
  });

  it('does not add <NodeGraph /> to teams', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `team platform {
  name "Platform Team"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const team = await sdk.getTeam('platform');
    expect(team).toBeDefined();
    expect(team!.markdown).not.toContain('<NodeGraph />');
  });
});
