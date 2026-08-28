import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('CLI Integration with Configuration', () => {
  let tempDir: string;
  let servicesDir: string;
  let eventsDir: string;
  let usersDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-cli-test-'));
    servicesDir = path.join(tempDir, 'services');
    eventsDir = path.join(tempDir, 'events');
    usersDir = path.join(tempDir, 'users');
    configPath = path.join(tempDir, '.eventcatalogrc.js');

    fs.mkdirSync(servicesDir, { recursive: true });
    fs.mkdirSync(eventsDir, { recursive: true });
    fs.mkdirSync(usersDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createServiceFile = (name: string, content: string) => {
    const serviceDir = path.join(servicesDir, name);
    fs.mkdirSync(serviceDir, { recursive: true });
    fs.writeFileSync(path.join(serviceDir, 'index.mdx'), content);
  };

  const createEventFile = (name: string, content: string) => {
    const eventDir = path.join(eventsDir, name);
    fs.mkdirSync(eventDir, { recursive: true });
    fs.writeFileSync(path.join(eventDir, 'index.mdx'), content);
  };

  const createUserFile = (name: string, content: string) => {
    fs.writeFileSync(path.join(usersDir, `${name}.mdx`), content);
  };

  const runLinter = async (args: string = '') => {
    const cliPath = path.join(__dirname, '../dist/cli/index.js');
    try {
      const result = await execAsync(`node ${cliPath} ${tempDir} ${args}`);
      return { success: true, stdout: result.stdout, stderr: result.stderr };
    } catch (error: any) {
      return { success: false, stdout: error.stdout, stderr: error.stderr };
    }
  };

  it('should use default rules when no config file exists', async () => {
    // Create a service with missing required fields
    createServiceFile(
      'user-service',
      `---
id: user-service
name: User Service
version: 1.0.0
---
# User Service
`
    );

    const result = await runLinter();

    expect(result.success).toBe(false);
    expect(result.stdout).toContain('error');
    expect(result.stdout).toContain('summary');
  });

  it('should apply rule configuration from .eventcatalogrc.js', async () => {
    // Create config that turns summary requirement to warning
    const configContent = `
module.exports = {
  rules: {
    'best-practices/summary-required': 'warn',
    'best-practices/owner-required': 'off',
  }
};
`;
    fs.writeFileSync(configPath, configContent);

    // Create a service with missing summary and owners
    createServiceFile(
      'user-service',
      `---
id: user-service
name: User Service
version: 1.0.0
---
# User Service
`
    );

    const result = await runLinter();

    expect(result.success).toBe(true); // Should pass because we only have warnings
    expect(result.stdout).toContain('warning');
    expect(result.stdout).toContain('summary');
    expect(result.stdout).not.toContain('owner'); // Should be off
  });

  it('should ignore files matching ignorePatterns', async () => {
    // Create config with ignore patterns
    const configContent = `
module.exports = {
  ignorePatterns: ['**/archived/**', '**/drafts/**']
};
`;
    fs.writeFileSync(configPath, configContent);

    // Create services in different directories
    createServiceFile(
      'user-service',
      `---
id: user-service
name: User Service
version: 1.0.0
---
# User Service
`
    );

    const archivedDir = path.join(servicesDir, 'archived');
    fs.mkdirSync(archivedDir, { recursive: true });
    createServiceFile(
      'archived/old-service',
      `---
id: old-service
name: Old Service
version: 1.0.0
---
# Old Service
`
    );

    const result = await runLinter();

    expect(result.success).toBe(false);
    expect(result.stdout).toContain('1 file checked'); // Should only check user-service
    expect(result.stdout).not.toContain('archived'); // Should not see archived service in output
  });

  it('should apply overrides for specific file patterns', async () => {
    // Create config with overrides
    const configContent = `
module.exports = {
  rules: {
    'best-practices/summary-required': 'error',
    'best-practices/owner-required': 'error',
  },
  overrides: [
    {
      files: ['**/experimental/**'],
      rules: {
        'best-practices/summary-required': 'warn',
        'best-practices/owner-required': 'off',
      }
    }
  ]
};
`;
    fs.writeFileSync(configPath, configContent);

    // Create regular service
    createServiceFile(
      'user-service',
      `---
id: user-service
name: User Service
version: 1.0.0
---
# User Service
`
    );

    // Create experimental service
    const experimentalDir = path.join(servicesDir, 'experimental');
    fs.mkdirSync(experimentalDir, { recursive: true });
    createServiceFile(
      'experimental/new-service',
      `---
id: new-service
name: New Service
version: 1.0.0
---
# New Service
`
    );

    const result = await runLinter();

    expect(result.success).toBe(false);
    expect(result.stdout).toContain('error'); // Regular service should have errors
    expect(result.stdout).toContain('warning'); // Experimental service should have warnings
  });

  it('should handle complex rule configurations', async () => {
    // Create comprehensive config
    const configContent = `
module.exports = {
  rules: {
    'schema/required-fields': 'error',
    'refs/owner-exists': 'warn',
    'best-practices/summary-required': 'warn',
    'best-practices/owner-required': 'off',
  },
  ignorePatterns: ['**/test/**'],
  overrides: [
    {
      files: ['**/critical/**'],
      rules: {
        'best-practices/summary-required': 'error',
        'best-practices/owner-required': 'error',
      }
    },
    {
      files: ['**/experimental/**'],
      rules: {
        'schema/required-fields': 'off',
        'refs/owner-exists': 'off',
      }
    }
  ]
};
`;
    fs.writeFileSync(configPath, configContent);

    // Create services in different categories
    createServiceFile(
      'user-service',
      `---
id: user-service
name: User Service
version: 1.0.0
sends:
  - id: nonexistent-event
---
# User Service
`
    );

    const criticalDir = path.join(servicesDir, 'critical');
    fs.mkdirSync(criticalDir, { recursive: true });
    createServiceFile(
      'critical/payment-service',
      `---
id: payment-service
name: Payment Service
version: 1.0.0
---
# Payment Service
`
    );

    const experimentalDir = path.join(servicesDir, 'experimental');
    fs.mkdirSync(experimentalDir, { recursive: true });
    createServiceFile(
      'experimental/ai-service',
      `---
id: ai-service
name: AI Service
version: 1.0.0
sends:
  - id: nonexistent-event
---
# AI Service
`
    );

    const testDir = path.join(servicesDir, 'test');
    fs.mkdirSync(testDir, { recursive: true });
    createServiceFile(
      'test/mock-service',
      `---
id: mock-service
name: Mock Service
version: 1.0.0
---
# Mock Service
`
    );

    const result = await runLinter();

    // Check that files were processed correctly
    expect(result.stdout).toMatch(/files? checked/); // Should check files (exact count may vary)
  });

  it('does not report missing service message references when they are declared as external dependencies in an ESM eventcatalog.config.js', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'eventcatalog.config.js'),
      `
export default {
  dependencies: {
    events: [
      { id: 'my.company.LocationSyncEvent' },
      { id: 'my.company.CarrierSyncEvent' },
    ],
  },
};
`
    );

    createUserFile(
      'catalog-owner',
      `---
id: catalog-owner
name: Catalog Owner
---
# Catalog Owner
`
    );

    createServiceFile(
      'oms-scs',
      `---
id: oms-scs
name: OMS SCS
version: 1.0.0
summary: OMS SCS
owners:
  - catalog-owner
receives:
  - id: my.company.LocationSyncEvent
  - id: my.company.CarrierSyncEvent
---
# OMS SCS
`
    );

    const result = await runLinter();

    expect(result.success).toBe(true);
    expect(result.stdout).not.toContain('Referenced event/command/query');
    expect(result.stdout).toContain('2 files checked');
  });

  it('warns about unrecognised markdown files without failing the run', async () => {
    createServiceFile(
      'user-service',
      `---
id: user-service
name: User Service
version: 1.0.0
summary: Manages users
owners:
  - catalog-owner
---
# User Service
`
    );
    createUserFile('catalog-owner', `---\nid: catalog-owner\nname: Catalog Owner\n---\n# Catalog Owner\n`);
    fs.writeFileSync(
      path.join(eventsDir, 'UserCreated.mdx'),
      `---\nid: UserCreated\nname: User Created\nversion: 1.0.0\n---\n# User Created\n`
    );

    const result = await runLinter();

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('events/UserCreated.mdx');
    expect(result.stdout).toContain('Did you mean "events/UserCreated/index.mdx"?');
    expect(result.stdout).toContain('(structure/unrecognised-file)');
    expect(result.stdout).toMatch(/1 warnings?/);
  });

  it('fails on unrecognised files when --fail-on-warning is used', async () => {
    fs.writeFileSync(
      path.join(eventsDir, 'UserCreated.mdx'),
      `---\nid: UserCreated\nname: User Created\nversion: 1.0.0\n---\n# User Created\n`
    );

    const result = await runLinter('--fail-on-warning');

    expect(result.success).toBe(false);
    expect(result.stdout).toContain('(structure/unrecognised-file)');
  });

  it('allows structure/unrecognised-file to be turned off', async () => {
    fs.writeFileSync(configPath, `module.exports = { rules: { 'structure/unrecognised-file': 'off' } };`);
    fs.writeFileSync(
      path.join(eventsDir, 'UserCreated.mdx'),
      `---\nid: UserCreated\nname: User Created\nversion: 1.0.0\n---\n# User Created\n`
    );

    const result = await runLinter('--fail-on-warning');

    expect(result.success).toBe(true);
    expect(result.stdout).not.toContain('structure/unrecognised-file');
  });

  it('reports scanned and ignored file counts in the summary', async () => {
    fs.writeFileSync(configPath, `module.exports = { ignorePatterns: ['drafts/**'] };`);
    createServiceFile('user-service', `---\nid: user-service\nname: User Service\nversion: 1.0.0\n---\n# x\n`);
    createServiceFile('order-service', `---\nid: order-service\nname: Order Service\nversion: 1.0.0\n---\n# x\n`);
    fs.mkdirSync(path.join(tempDir, 'drafts', 'events', 'DraftEvent'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'drafts', 'events', 'DraftEvent', 'index.mdx'),
      `---\nid: DraftEvent\nname: Draft\nversion: 1.0.0\n---\n# x\n`
    );

    const result = await runLinter();

    expect(result.success).toBe(false);
    // Both services fail (no summary/owners) but the count reflects files scanned, not files with problems
    expect(result.stdout).toMatch(/\(\d+ errors?, \d+ warnings?\) in 2 files/);
    expect(result.stdout).toContain('2 files checked, 1 file ignored');
    expect(result.stdout).not.toContain('DraftEvent');
  });

  it('hides warnings with --quiet', async () => {
    createServiceFile(
      'user-service',
      `---\nid: user-service\nname: User Service\nversion: 1.0.0\nsummary: s\nowners:\n  - catalog-owner\n---\n`
    );
    createUserFile('catalog-owner', `---\nid: catalog-owner\nname: Catalog Owner\n---\n# Catalog Owner\n`);

    const normal = await runLinter();
    expect(normal.success).toBe(true);
    expect(normal.stdout).toContain('best-practices/description-required');

    const quiet = await runLinter('--quiet');
    expect(quiet.success).toBe(true);
    expect(quiet.stdout).not.toContain('best-practices/description-required');
    expect(quiet.stdout).toContain('No problems found');
  });

  it('fails when warnings exceed --max-warnings', async () => {
    createServiceFile(
      'user-service',
      `---\nid: user-service\nname: User Service\nversion: 1.0.0\nsummary: s\nowners:\n  - catalog-owner\n---\n`
    );
    createUserFile('catalog-owner', `---\nid: catalog-owner\nname: Catalog Owner\n---\n# Catalog Owner\n`);

    const allowed = await runLinter('--max-warnings 5');
    expect(allowed.success).toBe(true);

    const exceeded = await runLinter('--max-warnings 0');
    expect(exceeded.success).toBe(false);
    expect(exceeded.stdout).toContain('maximum allowed: 0');

    const invalid = await runLinter('--max-warnings nope');
    expect(invalid.success).toBe(false);
    expect(invalid.stderr).toContain('must be a non-negative integer');
  });

  it('keeps progress output off stdout and reports the package version', async () => {
    createServiceFile('user-service', `---\nid: user-service\nname: User Service\nversion: 1.0.0\n---\n# x\n`);

    const result = await runLinter();
    expect(result.stdout).not.toContain('Loading configuration');
    expect(result.stderr).not.toContain('Loading configuration');

    const version = await runLinter('--version');
    expect(version.stdout.trim()).toBe(JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')).version);
  });

  it('resolves owners from federated catalogs', async () => {
    const federatedRoot = path.join(tempDir, 'federated', 'event-catalog--payments--abc123');
    const federatedServiceDir = path.join(federatedRoot, 'services', 'payment-service');
    const federatedTeamsDir = path.join(federatedRoot, 'teams');

    fs.mkdirSync(federatedServiceDir, { recursive: true });
    fs.mkdirSync(federatedTeamsDir, { recursive: true });
    fs.writeFileSync(
      path.join(federatedServiceDir, 'index.mdx'),
      `---
id: payment-service
name: Payment Service
summary: Processes payments
version: 1.0.0
owners:
  - payments-team
---
# Payment Service
`
    );
    fs.writeFileSync(
      path.join(federatedTeamsDir, 'payments-team.mdx'),
      `---
id: payments-team
name: Payments Team
summary: Owns payment services
---
# Payments Team
`
    );

    const result = await runLinter();

    expect(result.success).toBe(true);
    expect(result.stdout).not.toContain('Referenced user/team');
    expect(result.stdout).toContain('2 files checked');
  });
});
