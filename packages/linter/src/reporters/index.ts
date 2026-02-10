import chalk from 'chalk';
import { ValidationError } from '../types';
import { ParseError } from '../parser';

export interface ReportSummary {
  totalErrors: number;
  totalWarnings: number;
  schemaErrors: number;
  referenceErrors: number;
  parseErrors: number;
  filesChecked: number;
  filesWithErrors: number;
}

export const formatError = (error: ValidationError, showFilename: boolean = true): string => {
  const lineInfo = error.line ? chalk.dim(`:${error.line}:1`) : '';
  const filename = showFilename ? `${chalk.dim(error.file)}${lineInfo}` : '';

  const isWarning = error.severity === 'warning';
  const severity = isWarning ? chalk.yellow('warning') : chalk.red('error');
  const icon = isWarning ? chalk.yellow('⚠') : chalk.red('✖');
  const errorCode = getErrorCode(error);
  const field = error.field ? chalk.dim(`[${error.field}]`) : '';

  const parts = [];
  if (filename) parts.push(filename);
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

export const formatParseError = (error: ParseError, showFilename: boolean = true): string => {
  const filename = showFilename ? chalk.dim(error.file.relativePath) : '';
  const severity = chalk.red('error');
  const message = `Parse error: ${error.error.message}`;
  const errorCode = chalk.dim('(@eventcatalog/parse-error)');

  const parts = [];
  if (filename) parts.push(filename);
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
  validationErrors: ValidationError[],
  parseErrors: ParseError[],
  verbose: boolean = false
): ReportSummary => {
  const allErrors = [
    ...validationErrors,
    ...parseErrors.map((pe) => ({
      type: 'parse' as const,
      resource: pe.file.resourceType || 'unknown',
      message: pe.error.message,
      file: pe.file.relativePath,
      line: undefined,
    })),
  ];

  const schemaErrors = validationErrors.filter((e) => e.type === 'schema');
  const referenceErrors = validationErrors.filter((e) => e.type === 'reference');
  const warnings = validationErrors.filter((e) => e.severity === 'warning');
  const errors = [...validationErrors.filter((e) => e.severity !== 'warning'), ...parseErrors];
  const totalErrors = errors.length;
  const totalWarnings = warnings.length;

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(chalk.green('✔ No problems found!'));
    return {
      totalErrors: 0,
      totalWarnings: 0,
      schemaErrors: 0,
      referenceErrors: 0,
      parseErrors: 0,
      filesChecked: 0,
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

    // Parse errors first
    for (const error of fileParseErrors) {
      console.log(`  ${formatParseError(error, false)}`);
    }

    // Then validation errors
    for (const error of fileErrors) {
      console.log(`  ${formatError(error, false)}`);
    }

    // File summary
    const fileWarnings = fileErrors.filter((e) => e.severity === 'warning').length;
    const fileActualErrors = fileErrorCount - fileWarnings;
    const problemText = fileErrorCount === 1 ? 'problem' : 'problems';
    const summaryColor = fileActualErrors > 0 ? chalk.red : chalk.yellow;
    const summaryIcon = fileActualErrors > 0 ? '✖' : '⚠';
    console.log(summaryColor(`\n${summaryIcon} ${fileErrorCount} ${problemText}\n`));
  }

  // Overall summary (ESLint-style)
  const filesWithErrors = allFiles.size;
  const totalProblems = totalErrors + totalWarnings;
  const problemText = totalProblems === 1 ? 'problem' : 'problems';
  const fileText = filesWithErrors === 1 ? 'file' : 'files';

  const summaryColor = totalErrors > 0 ? chalk.red.bold : chalk.yellow.bold;
  const summaryIcon = totalErrors > 0 ? '✖' : '⚠';

  console.log(summaryColor(`${summaryIcon} ${totalProblems} ${problemText} (${totalErrors} errors, ${totalWarnings} warnings)`));
  console.log(chalk.dim(`  ${filesWithErrors} ${fileText} checked`));

  return {
    totalErrors,
    totalWarnings,
    schemaErrors: schemaErrors.length,
    referenceErrors: referenceErrors.length,
    parseErrors: parseErrors.length,
    filesChecked: allFiles.size,
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
