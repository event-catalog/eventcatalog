import type { CustomExportReport } from './select';

const KIND_WORD: Record<string, string> = { container: 'data store' };

/** Lines in columns, so a long list scans easily in a terminal. */
const columns = (rows: string[][], indent = '  ') => {
  const widths = rows.reduce<number[]>((w, row) => row.map((cell, i) => Math.max(w[i] || 0, cell.length)), []);
  return rows.map(
    (row) =>
      indent +
      row
        .map((cell, i) => (i < row.length - 1 ? cell.padEnd(widths[i]) : cell))
        .join('  ')
        .trimEnd()
  );
};

/**
 * What went into a custom export and what was left out, and why, for `eventcatalog export <id> --check` and
 * the build's log: a reviewer can see why something is in a public export without opening the catalog.
 */
export const formatCustomExportReport = (report: CustomExportReport) => {
  const lines: string[] = [];
  const group = (title: string, rows: string[][]) => {
    if (!rows.length) return;
    lines.push('', `${title} (${rows.length})`, ...columns(rows));
  };
  group(
    'Included',
    report.included.map((r) => [KIND_WORD[r.kind] ?? r.kind, `${r.id}${r.version ? ` ${r.version}` : ''}`, `(${r.reason})`])
  );
  group(
    'Excluded',
    report.excluded.map((r) => [KIND_WORD[r.kind] ?? r.kind, `${r.id}${r.version ? ` ${r.version}` : ''}`, `(${r.reason})`])
  );
  group(
    'Links dropped',
    report.links.filter((l) => l.action === 'dropped').map((l) => [l.from, '→', l.to, `(${l.reason})`])
  );
  group(
    'Links shown as names',
    report.links.filter((l) => l.action === 'named').map((l) => [l.from, '→', l.to, `(${l.reason})`])
  );
  group(
    'Not found',
    report.unmatched.map((u) => [u.field, u.selector, `(${u.reason})`])
  );
  group(
    'Links in docs that lead outside the export',
    report.mentions.map((m) => [m.from, '→', m.to, `(shown as "${m.shownAs}")`])
  );
  if (report.hidden.length) lines.push('', `Hidden: ${report.hidden.join(', ')}`);
  return lines.join('\n');
};

/** One line for a written custom export: how much is in it and what was left out. */
export const summariseCustomExportReport = (report: CustomExportReport) => {
  const dropped = report.links.filter((l) => l.action === 'dropped').length;
  const parts = [
    `${report.included.length} resource${report.included.length === 1 ? '' : 's'}`,
    report.excluded.length && `${report.excluded.length} excluded`,
    dropped && `${dropped} link${dropped === 1 ? '' : 's'} dropped`,
    report.unmatched.length && `${report.unmatched.length} not found`,
    report.mentions.length && `${report.mentions.length} doc link${report.mentions.length === 1 ? '' : 's'} leading outside`,
  ].filter(Boolean);
  return parts.join(', ');
};
