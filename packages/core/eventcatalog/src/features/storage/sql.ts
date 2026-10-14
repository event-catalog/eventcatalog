/**
 * Statements kept in .sql files (./sql), each named by a `-- name: <name>` line above it. A file's statements are
 * looked up by the names the code expects: a missing one is an error when the module loads, not when it's first run.
 */
export const namedStatements = <Name extends string>(source: string, names: readonly Name[]): Record<Name, string> => {
  const statements = new Map<string, string>();
  let current: { name: string; lines: string[] } | undefined;
  const finish = () => {
    if (current) statements.set(current.name, current.lines.join('\n').trim());
  };
  for (const line of source.split('\n')) {
    const name = /^--\s*name:\s*(\S+)\s*$/.exec(line)?.[1];
    if (name) {
      finish();
      current = { name, lines: [] };
    } else {
      current?.lines.push(line);
    }
  }
  finish();
  return Object.fromEntries(
    names.map((name) => {
      const statement = statements.get(name);
      if (!statement) throw new Error(`No SQL statement named "${name}"`);
      return [name, statement];
    })
  ) as Record<Name, string>;
};
