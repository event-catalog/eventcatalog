import { resolve } from 'node:path';
import { rmSync } from 'node:fs';
import createSDK from '@eventcatalog/sdk';

export const snapshotCreate = async (opts: { label?: string; output?: string; stdout?: boolean; dir: string }) => {
  const dir = resolve(opts.dir);
  const sdk = createSDK(dir);

  const result = await sdk.createSnapshot({
    label: opts.label,
    outputDir: opts.output ? resolve(opts.output) : undefined,
  });

  if (opts.stdout) {
    rmSync(result.filePath, { force: true });
    return JSON.stringify(result.snapshot, null, 2);
  }

  const resources = result.snapshot.resources;
  const counts = [
    resources.services.length && `${resources.services.length} services`,
    resources.messages.events.length && `${resources.messages.events.length} events`,
    resources.messages.commands.length && `${resources.messages.commands.length} commands`,
    resources.messages.queries.length && `${resources.messages.queries.length} queries`,
    resources.domains.length && `${resources.domains.length} domains`,
    resources.channels.length && `${resources.channels.length} channels`,
  ]
    .filter(Boolean)
    .join(', ');

  return `Snapshot created: ${result.filePath}\nResources: ${counts}`;
};

const formatDiffText = (diff: any): string => {
  const lines: string[] = [];

  const labelA = diff.snapshotA.label;
  const labelB = diff.snapshotB.label;
  lines.push(`Comparing: ${labelA} vs ${labelB}`);
  lines.push('');

  if (diff.resources.length > 0) {
    lines.push(`Resources (${diff.resources.length} changes):`);
    for (const r of diff.resources) {
      const prefix = r.changeType === 'added' ? '+' : r.changeType === 'removed' ? '-' : r.changeType === 'versioned' ? '^' : '~';
      const version = r.changeType === 'versioned' ? `${r.previousVersion} -> ${r.newVersion}` : r.version;
      const fields = r.changedFields ? ` (${r.changedFields.join(', ')})` : '';
      lines.push(`  ${prefix} ${r.resourceId}@${version}  [${r.type}] ${r.changeType}${fields}`);
    }
    lines.push('');
  }

  if (diff.relationships.length > 0) {
    lines.push(`Relationships (${diff.relationships.length} changes):`);
    for (const r of diff.relationships) {
      const prefix = r.changeType === 'added' ? '+' : '-';
      lines.push(
        `  ${prefix} ${r.serviceId} --${r.direction}--> ${r.resourceId}${r.resourceVersion ? `@${r.resourceVersion}` : ''}`
      );
    }
    lines.push('');
  }

  if (diff.summary.totalChanges === 0) {
    lines.push('No changes detected.');
  } else {
    lines.push(`Summary: ${diff.resources.length} resource changes, ${diff.relationships.length} relationship changes`);
  }

  return lines.join('\n');
};

export const snapshotDiff = async (opts: { fileA: string; fileB: string; format?: string; dir: string }) => {
  const dir = resolve(opts.dir);
  const sdk = createSDK(dir);

  const diff = await sdk.diffSnapshots(resolve(opts.fileA), resolve(opts.fileB));

  if (opts.format === 'json') {
    return JSON.stringify(diff, null, 2);
  }

  return formatDiffText(diff);
};

export const snapshotList = async (opts: { format?: string; dir: string }) => {
  const dir = resolve(opts.dir);
  const sdk = createSDK(dir);

  const snapshots = await sdk.listSnapshots();

  if (opts.format === 'json') {
    return JSON.stringify(snapshots, null, 2);
  }

  if (snapshots.length === 0) {
    return 'No snapshots found.';
  }

  const lines = ['Snapshots:', ''];
  for (const s of snapshots) {
    const git = s.git ? ` (${s.git.branch} ${s.git.commit})` : '';
    lines.push(`  ${s.label}  ${s.createdAt}${git}`);
    lines.push(`    ${s.filePath}`);
  }

  return lines.join('\n');
};
