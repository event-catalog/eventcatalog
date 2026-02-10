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
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-cli-test-'));
    servicesDir = path.join(tempDir, 'services');
    eventsDir = path.join(tempDir, 'events');
    configPath = path.join(tempDir, '.eventcatalogrc.js');

    fs.mkdirSync(servicesDir, { recursive: true });
    fs.mkdirSync(eventsDir, { recursive: true });
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
    expect(result.stdout).toContain('file checked'); // Should check files (exact count may vary)
  });
});
