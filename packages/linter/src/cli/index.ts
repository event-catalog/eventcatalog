#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { scanCatalogFiles } from '../scanner';
import { parseAllFiles } from '../parser';
import { validateCatalog } from '../validators';
import { reportErrors } from '../reporters';
import { LinterOptions } from '../types';
import { loadConfig, loadEventCatalogConfig, shouldIgnoreFile, getEffectiveRules, applyRuleSeverity } from '../config';

const program = new Command();

program
  .name('eventcatalog-linter')
  .description('Lint your EventCatalog for frontmatter and reference validation')
  .version('0.1.0')
  .argument('[directory]', 'EventCatalog directory to lint', '.')
  .option('-v, --verbose', 'Show verbose output', false)
  .option('--fail-on-warning', 'Exit with non-zero code on warnings', false)
  .action(async (directory: string, options: Partial<LinterOptions>) => {
    const rootDir = path.resolve(directory);
    const spinner = ora('Loading configuration...').start();

    try {
      // Load configuration
      const config = loadConfig(rootDir);
      const dependencies = loadEventCatalogConfig(rootDir);

      spinner.text = 'Scanning EventCatalog files...';
      const allFiles = await scanCatalogFiles(rootDir);

      // Filter out ignored files
      const files = allFiles.filter((file) => !shouldIgnoreFile(file.relativePath, config.ignorePatterns || []));

      const ignoredCount = allFiles.length - files.length;
      if (ignoredCount > 0) {
        spinner.text = `Found ${files.length} catalog files (${ignoredCount} ignored)`;
      } else {
        spinner.text = `Found ${files.length} catalog files`;
      }

      if (files.length === 0) {
        spinner.warn('No EventCatalog files found');
        process.exit(0);
      }

      spinner.text = 'Parsing frontmatter...';
      const { parsed, errors: parseErrors } = await parseAllFiles(files);

      spinner.text = 'Validating catalog...';
      const rawValidationErrors = validateCatalog(parsed, dependencies);

      // Apply rule configuration to each file's errors
      const validationErrors = parsed.flatMap((parsedFile) => {
        const fileErrors = rawValidationErrors.filter((error) => error.file === parsedFile.file.relativePath);
        const effectiveRules = getEffectiveRules(parsedFile.file.relativePath, config);
        return applyRuleSeverity(fileErrors, effectiveRules);
      });

      spinner.stop();

      const summary = reportErrors(validationErrors, parseErrors, options.verbose);

      // Show scan summary
      if (summary.totalErrors === 0) {
        console.log(chalk.dim(`\n  ${files.length} files checked`));
      }

      if (summary.totalErrors > 0 || (options.failOnWarning && summary.totalWarnings > 0)) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('An error occurred');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program.parse();
