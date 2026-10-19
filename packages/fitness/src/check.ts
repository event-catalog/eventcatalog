import path from 'node:path';
import { formatFitnessReport } from './format';
import { DEFAULT_REPORT_PATH, evaluateFitness, getFitnessExitCode, writeFitnessReport } from './run';

export type FitnessCheckOptions = {
  /** The catalog directory */
  dir: string;
  /** Where to write the JSON report, relative to the catalog. Defaults to `.eventcatalog/fitness/results.json` */
  output?: string;
  /** `text` (default) prints a summary, `json` prints the report */
  format?: 'text' | 'json';
  color?: boolean;
  log?: (message: string) => void;
  error?: (message: string) => void;
};

/**
 * Runs `eventcatalog fitness check`: evaluates the catalog's fitness functions, writes the report and prints the results.
 *
 * Returns the exit code: 0 when every function passed or only warned, 1 when a function failed or could not be
 * evaluated, and 2 when the check itself could not run.
 */
export const runFitnessCheck = async (options: FitnessCheckOptions): Promise<0 | 1 | 2> => {
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  const format = options.format ?? 'text';

  if (format !== 'text' && format !== 'json') {
    error(`Unknown format '${format}'. Use text or json.`);
    return 2;
  }

  try {
    const dir = path.resolve(options.dir);
    const report = await evaluateFitness({ dir });
    const outputPath = path.resolve(dir, options.output ?? DEFAULT_REPORT_PATH);
    writeFitnessReport(report, outputPath);

    if (format === 'json') {
      log(JSON.stringify(report, null, 2));
    } else {
      log(formatFitnessReport(report, { color: options.color }));
      const relativePath = path.relative(process.cwd(), outputPath);
      log(`\nReport written to ${relativePath.startsWith('..') ? outputPath : relativePath}`);
    }

    return getFitnessExitCode(report);
  } catch (cause) {
    error(`Fitness check could not run: ${cause instanceof Error ? cause.message : String(cause)}`);
    return 2;
  }
};
