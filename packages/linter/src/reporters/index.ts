import chalk from 'chalk';
import { ValidationError } from '../types';
import { ParseError } from '../parser';

export interface ReportSummary {
  totalErrors: number;
  totalWarnings: number;
  schemaErrors: number;
  referenceErrors: number;
  parseErrors: number;
  /** Files that were scanned and validated (after ignore patterns) */
  filesChecked: number;
  /** Files skipped because of ignore patterns */
  filesIgnored: number;
  /** Files with at least one reported problem */
  filesWithErrors: number;
}

export interface ReportOptions {
  verbose?: boolean;
  /** Only report errors; warnings are dropped from output and counts */
  quiet?: boolean;
  /** Number of files that were validated, shown in the summary */
  filesChecked?: number;
  /** Number of files skipped by ignore patterns, shown in the summary */
  filesIgnored?: number;
}

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const formatFilesChecked = (filesChecked: number, filesIgnored: number): string =>
  `  ${plural(filesChecked, 'file')} checked${filesIgnored > 0 ? `, ${plural(filesIgnored, 'file')} ignored` : ''}`;

/** `12:3` style position, or an empty string when the finding has no location */
export const formatLocation = (error: { line?: number; column?: number }): string =>
  error.line ? `${error.line}:${error.column ?? 1}` : '';

export interface FormatOptions {
  /** Prefix the finding with its file path (used when findings are not grouped by file) */
  showFilename?: boolean;
  /** Pad the `line:col` prefix to this width so findings in a file line up */
  locationWidth?: number;
}

export const formatError = (error: ValidationError, options: FormatOptions | boolean = {}): string => {
  const { showFilename = true, locationWidth = 0 } = typeof options === 'boolean' ? { showFilename: options } : options;

  const location = formatLocation(error);
  const filename = showFilename ? chalk.dim(location ? `${error.file}:${location}` : error.file) : '';
  const position = !showFilename && location ? chalk.dim(location.padStart(locationWidth)) : '';

  const isWarning = error.severity === 'warning';
  const severity = isWarning ? chalk.yellow('warning') : chalk.red('error');
  const icon = isWarning ? chalk.yellow('⚠') : chalk.red('✖');
  const errorCode = getErrorCode(error);
  const field = error.field ? chalk.dim(`[${error.field}]`) : '';

  const parts = [];
  if (filename) parts.push(filename);
  if (position) parts.push(position);
  parts.push(icon, severity, error.message, field, chalk.dim(errorCode));

  return parts.filter(Boolean).join(' ');
};

const getErrorCode = (error: ValidationError): string => {
  if (error.rule) {
    return `(${error.rule})`;
  }

  // Fallback to generic error codes
  if (error.type === 'schema') {
    if (error.field) {
      if (error.message.includes('Required')) return '(@eventcatalog/required-field)';
      if (error.message.includes('Expected')) return '(@eventcatalog/invalid-type)';
      return '(@eventcatalog/schema-validation)';
    }
    return '(@eventcatalog/schema)';
  }
  if (error.type === 'reference') {
    return '(@eventcatalog/invalid-reference)';
  }
  return '(@eventcatalog/unknown)';
};

export const formatParseError = (error: ParseError, options: FormatOptions | boolean = {}): string => {
  const { showFilename = true, locationWidth = 0 } = typeof options === 'boolean' ? { showFilename: options } : options;

  const location = formatLocation(error);
  const filename = showFilename ? chalk.dim(location ? `${error.file.relativePath}:${location}` : error.file.relativePath) : '';
  const position = !showFilename && location ? chalk.dim(location.padStart(locationWidth)) : '';
  const severity = chalk.red('error');
  const firstLine = error.error.message.split('\n')[0].replace(/\s*(?:at|on)? ?line \d+, column \d+:?\s*$/i, '');
  const message = `Parse error: ${firstLine}`;
  const errorCode = chalk.dim('(@eventcatalog/parse-error)');

  const parts = [];
  if (filename) parts.push(filename);
  if (position) parts.push(position);
  parts.push(chalk.red('✖'), severity, message, errorCode);

  return parts.filter(Boolean).join(' ');
};

export const groupErrorsByFile = (errors: ValidationError[]): Map<string, ValidationError[]> => {
  const grouped = new Map<string, ValidationError[]>();

  for (const error of errors) {
    if (!grouped.has(error.file)) {
      grouped.set(error.file, []);
    }
    grouped.get(error.file)!.push(error);
  }

  return grouped;
};

export const reportErrors = (
  allValidationErrors: ValidationError[],
  parseErrors: ParseError[],
  options: ReportOptions | boolean = {}
): ReportSummary => {
  const resolved: ReportOptions = typeof options === 'boolean' ? { verbose: options } : options;
  const { quiet = false, filesChecked = 0, filesIgnored = 0 } = resolved;

  const validationErrors = quiet ? allValidationErrors.filter((e) => e.severity !== 'warning') : allValidationErrors;

  const schemaErrors = validationErrors.filter((e) => e.type === 'schema');
  const referenceErrors = validationErrors.filter((e) => e.type === 'reference');
  const warnings = validationErrors.filter((e) => e.severity === 'warning');
  const errors = [...validationErrors.filter((e) => e.severity !== 'warning'), ...parseErrors];
  const totalErrors = errors.length;
  const totalWarnings = warnings.length;

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(chalk.green('✔ No problems found!'));
    console.log(chalk.dim(formatFilesChecked(filesChecked, filesIgnored)));
    return {
      totalErrors: 0,
      totalWarnings: 0,
      schemaErrors: 0,
      referenceErrors: 0,
      parseErrors: 0,
      filesChecked,
      filesIgnored,
      filesWithErrors: 0,
    };
  }

  const grouped = groupErrorsByFile(validationErrors);
  const parseErrorsGrouped = groupParseErrorsByFile(parseErrors);
  const allFiles = new Set([...grouped.keys(), ...parseErrorsGrouped.keys()]);

  console.log(); // Empty line

  // Report by file for better readability
  for (const file of Array.from(allFiles).sort()) {
    const fileErrors = grouped.get(file) || [];
    const fileParseErrors = parseErrorsGrouped.get(file) || [];
    const fileErrorCount = fileErrors.length + fileParseErrors.length;

    if (fileErrorCount === 0) continue;

    // File header (ESLint-style)
    console.log(chalk.underline(file));

    // Align the line:col prefixes within the file
    const locationWidth = Math.max(
      0,
      ...fileParseErrors.map((error) => formatLocation(error).length),
      ...fileErrors.map((error) => formatLocation(error).length)
    );

    // Parse errors first
    for (const error of fileParseErrors) {
      console.log(`  ${formatParseError(error, { showFilename: false, locationWidth })}`);
    }

    // Then validation errors, in source order
    const sortedErrors = [...fileErrors].sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0));
    for (const error of sortedErrors) {
      console.log(`  ${formatError(error, { showFilename: false, locationWidth })}`);
    }

    // File summary
    const fileWarnings = fileErrors.filter((e) => e.severity === 'warning').length;
    const fileActualErrors = fileErrorCount - fileWarnings;
    const summaryColor = fileActualErrors > 0 ? chalk.red : chalk.yellow;
    const summaryIcon = fileActualErrors > 0 ? '✖' : '⚠';
    console.log(summaryColor(`\n${summaryIcon} ${plural(fileErrorCount, 'problem')}\n`));
  }

  // Overall summary (ESLint-style)
  const filesWithErrors = allFiles.size;
  const totalProblems = totalErrors + totalWarnings;

  const summaryColor = totalErrors > 0 ? chalk.red.bold : chalk.yellow.bold;
  const summaryIcon = totalErrors > 0 ? '✖' : '⚠';

  console.log(
    summaryColor(
      `${summaryIcon} ${plural(totalProblems, 'problem')} (${plural(totalErrors, 'error')}, ${plural(totalWarnings, 'warning')}) in ${plural(filesWithErrors, 'file')}`
    )
  );
  console.log(chalk.dim(formatFilesChecked(filesChecked, filesIgnored)));

  return {
    totalErrors,
    totalWarnings,
    schemaErrors: schemaErrors.length,
    referenceErrors: referenceErrors.length,
    parseErrors: parseErrors.length,
    filesChecked,
    filesIgnored,
    filesWithErrors,
  };
};

const groupParseErrorsByFile = (errors: ParseError[]): Map<string, ParseError[]> => {
  const grouped = new Map<string, ParseError[]>();

  for (const error of errors) {
    const file = error.file.relativePath;
    if (!grouped.has(file)) {
      grouped.set(file, []);
    }
    grouped.get(file)!.push(error);
  }

  return grouped;
};
