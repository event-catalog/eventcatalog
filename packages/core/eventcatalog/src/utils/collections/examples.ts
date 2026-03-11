import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getResourceBasePath } from '@utils/resource-files';

export interface MessageExample {
  fileName: string;
  title: string;
  extension: string;
  content: string;
  summary?: string;
  usage?: string;
}

interface ExampleConfig {
  name?: string;
  summary?: string;
  usage?: string;
}

function loadConfig(examplesDir: string): Record<string, ExampleConfig> {
  const yamlPath = path.join(examplesDir, 'examples.config.yaml');
  const ymlPath = path.join(examplesDir, 'examples.config.yml');
  const jsonPath = path.join(examplesDir, 'examples.config.json');

  let configPath: string | null = null;
  if (fs.existsSync(yamlPath)) configPath = yamlPath;
  else if (fs.existsSync(ymlPath)) configPath = ymlPath;
  else if (fs.existsSync(jsonPath)) configPath = jsonPath;

  if (!configPath) return {};

  const raw = fs.readFileSync(configPath, 'utf-8');
  if (configPath.endsWith('.json')) {
    return JSON.parse(raw) || {};
  }
  return (yaml.load(raw) as Record<string, ExampleConfig>) || {};
}

const CONFIG_FILES = ['examples.config.yaml', 'examples.config.yml', 'examples.config.json'];

function collectFiles(dir: string, baseDir: string): Omit<MessageExample, 'summary' | 'usage'>[] {
  const results: Omit<MessageExample, 'summary' | 'usage'>[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile() && !CONFIG_FILES.includes(entry.name)) {
      results.push({
        fileName: path.relative(baseDir, fullPath),
        title: path.parse(entry.name).name,
        extension: path.parse(entry.name).ext.slice(1),
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
    }
  }

  return results;
}

export function getExamplesForResource(resource: { filePath?: string }): MessageExample[] {
  const basePath = getResourceBasePath(resource);
  if (!basePath) return [];

  const examplesDir = path.join(basePath, 'examples');
  if (!fs.existsSync(examplesDir)) return [];

  const config = loadConfig(examplesDir);
  const files = collectFiles(examplesDir, examplesDir);

  return files
    .map((file) => {
      const key = file.fileName.replace(/\\/g, '/');
      const meta = config[key] || {};
      return {
        ...file,
        title: meta.name || file.title,
        summary: meta.summary,
        usage: meta.usage,
      };
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}
