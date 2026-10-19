import type { FitnessFunctionResult, FitnessReport, FitnessReportResourceReference } from './types';

const COLORS = { green: 32, yellow: 33, red: 31, dim: 2, bold: 1 } as const;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const formatReference = (reference: FitnessReportResourceReference) =>
  `${reference.id} (${reference.type}${reference.resolved ? '' : ', not found in the catalog'})`;

export type FormatFitnessReportOptions = {
  /** Colour the output with ANSI codes */
  color?: boolean;
};

/** The report as text for the terminal: one line per function, with the violations and errors under it. */
export const formatFitnessReport = (report: FitnessReport, options: FormatFitnessReportOptions = {}): string => {
  const paint = (color: keyof typeof COLORS, text: string) => (options.color ? `\u001b[${COLORS[color]}m${text}\u001b[0m` : text);

  const lines: string[] = [paint('bold', 'EventCatalog Fitness'), ''];

  if (report.functions.length === 0) {
    lines.push(
      'No fitness functions found. Add *.fitness.ts files to a fitness/ folder in your catalog, or in a resource folder.'
    );
  }

  const label = (result: FitnessFunctionResult) => (result.scope ? `${result.scope.id} / ${result.name}` : result.name);
  const width = Math.max(0, ...report.functions.map((result) => label(result).length)) + 2;

  for (const result of report.functions) {
    const name = label(result).padEnd(width);
    if (result.status === 'passed') lines.push(`${paint('green', '✓')} ${name}Passed`);
    else if (result.status === 'warning')
      lines.push(`${paint('yellow', '!')} ${name}${paint('yellow', plural(result.violations.length, 'warning'))}`);
    else if (result.status === 'failed')
      lines.push(`${paint('red', '✗')} ${name}${paint('red', plural(result.violations.length, 'violation'))}`);
    else if (result.status === 'error') lines.push(`${paint('red', '✗')} ${name}${paint('red', 'Error')}`);
    else lines.push(`- ${name}Not run`);

    for (const violation of result.violations) {
      lines.push(`    • ${violation.message}`);
      if (violation.resources.length > 0)
        lines.push(paint('dim', `      Resources: ${violation.resources.map(formatReference).join(', ')}`));
      if (violation.details) lines.push(paint('dim', `      ${violation.details}`));
      if (violation.suggestion) lines.push(`      Suggestion: ${violation.suggestion}`);
    }

    if (result.error) {
      // Messages can span lines (e.g. a module that could not be found, with its require stack)
      for (const line of result.error.message.split('\n')) lines.push(`    ${line}`);
      lines.push(paint('dim', `    in ${result.source}`));
    }
  }

  const { summary } = report;
  lines.push('', `${plural(summary.total, 'fitness function')} evaluated`, '');
  lines.push(paint('green', `${summary.passed} passed`));
  if (summary.warnings > 0) lines.push(paint('yellow', plural(summary.warnings, 'warning')));
  if (summary.failed > 0) lines.push(paint('red', `${summary.failed} failed`));
  if (summary.errors > 0) lines.push(paint('red', plural(summary.errors, 'error')));

  if (report.diagnostics.length > 0) {
    lines.push('');
    for (const diagnostic of report.diagnostics) lines.push(paint('yellow', `! ${diagnostic.source}: ${diagnostic.message}`));
  }

  return lines.join('\n');
};
