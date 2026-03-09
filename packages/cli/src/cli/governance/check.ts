import path from 'node:path';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import dotenv from 'dotenv';
import createSDK from '@eventcatalog/sdk';
import { isEventCatalogScaleEnabled } from '@eventcatalog/license';
import { loadGovernanceConfig, evaluateGovernanceRules, enrichSchemaContent, resolveEnvVars } from './rules';
import { formatGovernanceOutput, formatFailureOutput } from './format';
import { executeGovernanceActions, buildMessageTypeMap, buildServiceOwnersMap } from './actions';
import type { GovernanceCheckResult } from './types';

export type GovernanceCheckOptions = {
  base?: string;
  target?: string;
  format?: string;
  status?: string;
  dir: string;
};

const BRANCH_NAME_RE = /^[a-zA-Z0-9._\-/]+$/;

const extractBranchToTempDir = (branch: string, catalogDir: string, tempDirs: string[]): string => {
  if (!BRANCH_NAME_RE.test(branch)) {
    throw new Error(`Invalid branch name: "${branch}"`);
  }
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'ec-governance-'));
  tempDirs.push(tmpDir);
  try {
    execSync(`git archive ${branch} | tar -x -C ${tmpDir}`, { cwd: catalogDir, stdio: 'pipe' });
  } catch {
    throw new Error(`Failed to extract branch "${branch}". Is it a valid git branch?`);
  }
  return tmpDir;
};

export const governanceCheck = async (opts: GovernanceCheckOptions): Promise<GovernanceCheckResult> => {
  const dir = path.resolve(opts.dir);

  // Load .env file from catalog directory (contains license key, webhook secrets, etc.)
  dotenv.config({ path: path.join(dir, '.env') });

  const isScale = await isEventCatalogScaleEnabled();
  if (!isScale) {
    throw new Error('Governance requires an EventCatalog Scale plan. Learn more at https://eventcatalog.dev/pricing');
  }

  const baseBranch = opts.base || 'main';

  const tempDirs: string[] = [];
  const trackTempDir = (prefix: string): string => {
    const d = mkdtempSync(path.join(tmpdir(), prefix));
    tempDirs.push(d);
    return d;
  };

  try {
    const baseTmpDir = extractBranchToTempDir(baseBranch, dir, tempDirs);

    const baseSnapshotDir = trackTempDir('ec-snap-base-');
    const targetSnapshotDir = trackTempDir('ec-snap-target-');

    const baseSDK = createSDK(baseTmpDir);
    const baseResult = await baseSDK.createSnapshot({ label: `base-${baseBranch}`, outputDir: baseSnapshotDir });

    let targetResult;
    let targetCatalogDir: string;
    if (opts.target) {
      targetCatalogDir = extractBranchToTempDir(opts.target, dir, tempDirs);
      const targetSDK = createSDK(targetCatalogDir);
      targetResult = await targetSDK.createSnapshot({ label: `target-${opts.target}`, outputDir: targetSnapshotDir });
    } else {
      targetCatalogDir = dir;
      const targetSDK = createSDK(dir);
      targetResult = await targetSDK.createSnapshot({ label: 'current', outputDir: targetSnapshotDir });
    }

    const diff = await baseSDK.diffSnapshots(baseResult.filePath, targetResult.filePath);

    const config = loadGovernanceConfig(dir);

    if (config.rules.length === 0) {
      return { output: 'No governance.yaml (or governance.yml) found or no rules defined.', exitCode: 0, failures: [] };
    }

    const results = evaluateGovernanceRules(diff, config, targetResult.snapshot, baseResult.snapshot);

    // Mark results that have fail actions and collect their messages
    for (const result of results) {
      const failActions = result.rule.actions.filter((a) => a.type === 'fail');
      if (failActions.length > 0) {
        result.failed = true;
        result.failMessages = failActions
          .map((a) => ('message' in a && a.message ? resolveEnvVars(a.message) : undefined))
          .filter((m): m is string => m !== undefined);
      }
    }

    // Populate before/after schema content for any schema_changed results
    await enrichSchemaContent(results, baseTmpDir, targetCatalogDir);

    // Always execute actions (webhooks) regardless of output format
    const messageTypes = buildMessageTypeMap(targetResult.snapshot);
    const serviceOwners = buildServiceOwnersMap(targetResult.snapshot);
    const actionOutput = await executeGovernanceActions(results, {
      messageTypes,
      status: opts.status,
      serviceOwners,
      baseRef: baseBranch,
      targetRef: opts.target || 'working-directory',
    });

    // Collect failures
    const failures = results.filter((r) => r.failed).map((r) => ({ ruleName: r.rule.name, messages: r.failMessages || [] }));

    if (opts.format === 'json') {
      const jsonOutput = {
        baseBranch,
        target: opts.target || 'working directory',
        results,
        summary: {
          rulesTriggered: results.length,
          failures: failures.length,
          passed: failures.length === 0,
        },
        diff: diff.summary,
      };
      return { output: JSON.stringify(jsonOutput, null, 2), exitCode: failures.length > 0 ? 1 : 0, failures };
    }

    const targetLabel = opts.target || 'working directory';
    const lines: string[] = [`Governance check: comparing ${targetLabel} against ${baseBranch}`, ''];

    lines.push(formatGovernanceOutput(results));

    if (actionOutput.length > 0) {
      lines.push('');
      lines.push(...actionOutput);
    }

    if (results.length > 0) {
      const webhookCount = actionOutput.filter((l) => l.includes('Webhook sent')).length;
      const parts = [`${results.length} rule${results.length === 1 ? '' : 's'} triggered`];
      if (webhookCount > 0) parts.push(`${webhookCount} webhook${webhookCount === 1 ? '' : 's'} sent`);
      lines.push('');
      lines.push(parts.join(', ') + '.');
    }

    // Append failure output
    const failureOutput = formatFailureOutput(failures);
    if (failureOutput) {
      lines.push('');
      lines.push(failureOutput);
    }

    return { output: lines.join('\n'), exitCode: failures.length > 0 ? 1 : 0, failures };
  } finally {
    for (const d of tempDirs) {
      rmSync(d, { recursive: true, force: true });
    }
  }
};
