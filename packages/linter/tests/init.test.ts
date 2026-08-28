import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generateConfig, initConfig, detectModuleFormat, ConfigExistsError, CONFIG_FILE_NAME } from '../src/init';
import { RULES, RULE_NAMES } from '../src/rules';
import { DEFAULT_RULES, loadConfig, loadConfigAsync } from '../src/config';

const execAsync = promisify(exec);

describe('rule registry', () => {
  it('defines every default rule exactly once', () => {
    expect(new Set(RULE_NAMES).size).toBe(RULE_NAMES.length);
    expect(Object.keys(DEFAULT_RULES).sort()).toEqual([...RULE_NAMES].sort());
  });

  it('gives every rule a description', () => {
    for (const rule of RULES) {
      expect(rule.description.length, rule.name).toBeGreaterThan(10);
    }
  });
});

describe('generateConfig', () => {
  it('lists every rule with its default severity', () => {
    const config = generateConfig({ format: 'commonjs' });
    for (const rule of RULES) {
      expect(config).toContain(`'${rule.name}': '${rule.default}',`);
    }
  });

  it('writes CommonJS or ESM syntax', () => {
    expect(generateConfig({ format: 'commonjs' })).toContain('module.exports = {');
    expect(generateConfig({ format: 'esm' })).toContain('export default {');
    expect(generateConfig({ format: 'esm' })).not.toContain('module.exports');
  });

  it('includes option examples for rules that accept options', () => {
    const config = generateConfig({ format: 'commonjs' });
    expect(config).toContain(
      "// e.g. 'schema/unknown-field': ['error', { allow: ['costCenter', 'legacy*'], suggestions: true }],"
    );
    expect(config).toContain("// e.g. 'refs/file-exists': ['error', { icons: true, publicDir: 'public' }],");
  });

  it('describes the resources found', () => {
    expect(generateConfig({ format: 'commonjs', resourceCounts: { service: 3, event: 12, entity: 1, query: 2 } })).toContain(
      '// Found 12 events, 3 services, 2 queries, 1 entity.'
    );
    expect(generateConfig({ format: 'commonjs', resourceCounts: {} })).toContain('No catalog resources were found');
  });

  it('produces a loadable config with the same rules as the defaults', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-init-load-'));
    try {
      fs.writeFileSync(path.join(dir, CONFIG_FILE_NAME), generateConfig({ format: 'commonjs' }));
      const loaded = loadConfig(dir);
      expect(loaded.rules).toEqual(DEFAULT_RULES);
      expect(loaded.overrides).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('initConfig', () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-init-'));
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const writeResource = (relativePath: string, id: string) => {
    const full = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `---\nid: ${id}\nname: ${id}\nversion: 1.0.0\n---\n`);
  };

  it('detects the module format from package.json', () => {
    expect(detectModuleFormat(rootDir)).toBe('commonjs');
    fs.writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({ type: 'module' }));
    expect(detectModuleFormat(rootDir)).toBe('esm');
    fs.writeFileSync(path.join(rootDir, 'package.json'), 'not json');
    expect(detectModuleFormat(rootDir)).toBe('commonjs');
  });

  it('writes the config and counts each resource once', async () => {
    writeResource('services/order-service/index.mdx', 'order-service');
    writeResource('events/OrderCreated/index.mdx', 'OrderCreated');
    writeResource('events/OrderCreated/versioned/0.0.1/index.mdx', 'OrderCreated');
    writeResource('events/OrderUpdated/index.mdx', 'OrderUpdated');

    const result = await initConfig(rootDir);

    expect(result.configPath).toBe(path.join(rootDir, CONFIG_FILE_NAME));
    expect(result.format).toBe('commonjs');
    expect(result.resourceCounts).toEqual({ service: 1, event: 2 });
    expect(result.filesScanned).toBe(4);

    const written = fs.readFileSync(result.configPath, 'utf-8');
    expect(written).toContain('// Found 2 events, 1 service.');
    expect(written).toContain('module.exports = {');
  });

  it('refuses to overwrite an existing config unless forced', async () => {
    fs.writeFileSync(path.join(rootDir, CONFIG_FILE_NAME), 'module.exports = {};');

    await expect(initConfig(rootDir)).rejects.toBeInstanceOf(ConfigExistsError);
    expect(fs.readFileSync(path.join(rootDir, CONFIG_FILE_NAME), 'utf-8')).toBe('module.exports = {};');

    await initConfig(rootDir, { force: true });
    expect(fs.readFileSync(path.join(rootDir, CONFIG_FILE_NAME), 'utf-8')).toContain('rules: {');
  });

  it('honours an explicit format', async () => {
    const result = await initConfig(rootDir, { format: 'esm' });
    expect(fs.readFileSync(result.configPath, 'utf-8')).toContain('export default {');
  });

  it('writes an ESM config that the linter can load in a type module catalog', async () => {
    fs.writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({ type: 'module' }));

    const result = await initConfig(rootDir);
    const loaded = await loadConfigAsync(rootDir);

    expect(result.format).toBe('esm');
    expect(loaded.rules).toEqual(DEFAULT_RULES);
  });
});

describe('CLI --init', () => {
  let rootDir: string;
  const cliPath = path.join(__dirname, '../dist/cli/index.js');

  const run = async (args: string) => {
    try {
      const result = await execAsync(`node ${cliPath} ${rootDir} ${args}`);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, stdout: error.stdout as string, stderr: error.stderr as string };
    }
  };

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-init-cli-'));
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('creates the config, then refuses to overwrite it, then overwrites with --force', async () => {
    const first = await run('--init');
    expect(first.success).toBe(true);
    expect(first.stdout).toContain(`Created`);
    expect(fs.existsSync(path.join(rootDir, CONFIG_FILE_NAME))).toBe(true);

    const second = await run('--init');
    expect(second.success).toBe(false);
    expect(second.stderr).toContain('already exists');

    const third = await run('--init --force');
    expect(third.success).toBe(true);
  });

  it('does not lint when --init is used', async () => {
    fs.mkdirSync(path.join(rootDir, 'services', 'broken'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'services', 'broken', 'index.mdx'), '---\nid: broken\n---\n');

    const result = await run('--init');
    expect(result.success).toBe(true);
    expect(result.stdout).not.toContain('problem');
  });
});
