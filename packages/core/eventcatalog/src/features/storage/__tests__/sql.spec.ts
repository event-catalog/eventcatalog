import { describe, it, expect } from 'vitest';
import { namedStatements } from '../sql';

const SOURCE = `-- What the file is for (not part of any statement)

-- name: first
-- Its own comment is kept with it
SELECT 1;

-- name: second
INSERT INTO canvases (name)
VALUES (?);
`;

describe('Named SQL statements', () => {
  it('reads each statement under its name, up to the next one', () => {
    expect(namedStatements(SOURCE, ['first', 'second'])).toEqual({
      first: '-- Its own comment is kept with it\nSELECT 1;',
      second: 'INSERT INTO canvases (name)\nVALUES (?);',
    });
  });

  it('only gives the statements asked for', () => {
    expect(Object.keys(namedStatements(SOURCE, ['second']))).toEqual(['second']);
  });

  it('says which statement is missing', () => {
    expect(() => namedStatements(SOURCE, ['first', 'third'])).toThrow('No SQL statement named "third"');
  });
});
