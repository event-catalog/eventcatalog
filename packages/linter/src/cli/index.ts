#!/usr/bin/env node

import { Command, InvalidArgumentError } from 'commander';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import fs from 'fs';
import path from 'path';
import { scanCatalogFiles } from '../scanner';
import { parseAllFiles } from '../parser';
import { validateCatalog, validateUnrecognisedFiles } from '../validators';
import { reportErrors } from '../reporters';
import { LinterOptions } from '../types';
import { loadConfigAsync, loadEventCatalogConfig, shouldIgnoreFile, getEffectiveRules, applyRuleSeverity } from '../config';
import { attachLocations } from '../utils/locations';
import { initConfig, ConfigExistsError, CONFIG_FILE_NAME } from '../init';

const readVersion = (): string => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const parseMaxWarnings = (value: string): number => {
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError('must be a non-negative integer');
  }
  return parsed;
};

/** Spinner that writes to stderr and stays silent when output is not an interactive terminal. */
const createSpinner = (text: string): Ora => {
  const interactive = Boolean(process.stderr.isTTY) && !process.env.CI && process.env.TERM !== 'dumb';
  return ora({ text, stream: process.stderr, isSilent: !interactive }).start();
};

const program = new Command();

program
  .name('eventcatalog-linter')
  .description('Lint your EventCatalog for frontmatter and reference validation')
  .version(readVersion())
  .argument('[directory]', 'EventCatalog directory to lint', '.')
  .option('-v, --verbose', 'Show verbose output', false)
  .option('-q, --quiet', 'Report errors only (hide warnings)', false)
  .option('--fail-on-warning', 'Exit with non-zero code on warnings (same as --max-warnings 0)', false)
  .option('--max-warnings <number>', 'Exit with non-zero code when more than this many warnings are reported', parseMaxWarnings)
  .option('--no-color', 'Disable coloured output')
  .option('--init', `Create a commented ${CONFIG_FILE_NAME} in the catalog directory and exit`, false)
  .option('--force', `Overwrite an existing ${CONFIG_FILE_NAME} when used with --init`, false)
  .action(async (directory: string, options: LinterOptions) => {
    if (options.color === false) {
      chalk.level = 0;
    }

    const rootDir = path.resolve(directory);

    if (options.init) {
      try {
        const result = await initConfig(rootDir, { force: options.force });
        const relative = path.relative(process.cwd(), result.configPath);
        const relativeConfig = relative && !relative.startsWith('..') ? relative : result.configPath;
        console.log(chalk.green(`✔ Created ${relativeConfig}`));
        console.log(
          chalk.dim(
            `  ${result.filesScanned} catalog files found, ${result.format === 'esm' ? 'ESM' : 'CommonJS'} config written`
          )
        );
        console.log(
          chalk.dim(`  Every rule is listed with its default severity. Edit the file, then run: eventcatalog-linter ${directory}`)
        );
        process.exit(0);
      } catch (error) {
        if (error instanceof ConfigExistsError) {
          console.error(chalk.yellow(`⚠ ${error.message}`));
        } else {
          console.error(chalk.red(`✖ ${error instanceof Error ? error.message : String(error)}`));
        }
        process.exit(1);
      }
    }
    const spinner = createSpinner('Loading configuration...');

    try {
      // Load configuration
      const config = await loadConfigAsync(rootDir);
      const dependencies = loadEventCatalogConfig(rootDir);
      const ignorePatterns = config.ignorePatterns || [];

      spinner.text = 'Scanning EventCatalog files...';
      const allFiles = await scanCatalogFiles(rootDir);

      // Filter out ignored files
      const files = allFiles.filter((file) => !shouldIgnoreFile(file.relativePath, ignorePatterns));
      const ignoredCount = allFiles.length - files.length;

      // Markdown files under resource folders that no scan pattern recognised
      spinner.text = 'Checking catalog structure...';
      const unrecognisedErrors = (await validateUnrecognisedFiles(rootDir, allFiles))
        .filter((error) => !shouldIgnoreFile(error.file, ignorePatterns))
        .flatMap((error) => applyRuleSeverity([error], getEffectiveRules(error.file, config)));

      if (files.length === 0 && unrecognisedErrors.length === 0) {
        spinner.stop();
        console.log(chalk.yellow('⚠ No EventCatalog files found'));
        process.exit(0);
      }

      spinner.text = 'Parsing frontmatter...';
      const { parsed, errors: parseErrors } = await parseAllFiles(files);

      spinner.text = 'Validating catalog...';
      const rawValidationErrors = validateCatalog(parsed, dependencies, config);

      // Apply rule configuration to each file's errors
      const validationErrors = parsed.flatMap((parsedFile) => {
        const fileErrors = rawValidationErrors.filter((error) => error.file === parsedFile.file.relativePath);
        const effectiveRules = getEffectiveRules(parsedFile.file.relativePath, config);
        return applyRuleSeverity(fileErrors, effectiveRules);
      });
      validationErrors.push(...unrecognisedErrors);

      // Resolve line/column positions for every finding
      const locatedErrors = attachLocations(validationErrors, parsed);

      spinner.stop();

      const summary = reportErrors(locatedErrors, parseErrors, {
        verbose: options.verbose,
        quiet: options.quiet,
        filesChecked: files.length,
        filesIgnored: ignoredCount,
      });

      const maxWarnings = options.failOnWarning ? 0 : options.maxWarnings;
      const tooManyWarnings = maxWarnings !== undefined && summary.totalWarnings > maxWarnings;

      if (tooManyWarnings) {
        const noun = summary.totalWarnings === 1 ? 'warning' : 'warnings';
        console.log(chalk.red(`\n✖ ${summary.totalWarnings} ${noun} found (maximum allowed: ${maxWarnings}).`));
      }

      if (summary.totalErrors > 0 || tooManyWarnings) {
        process.exit(1);
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`✖ ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program.parse();
