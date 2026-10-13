import { renderToStaticMarkup } from 'react-dom/server';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { describe, expect, it } from 'vitest';
import { renderHighlightedRows } from '@utils/syntax-highlighter-renderer';

const schema = JSON.stringify(
  {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' }, total: { type: 'number', minimum: 0 }, paid: { type: 'boolean' } },
    required: ['id'],
  },
  null,
  2
);
const avro = `{"type": "record", "name": "OrderCreated", "fields": [{"name": "id", "type": "string"}]}`;
const yaml = `asyncapi: 3.0.0\ninfo:\n  title: Orders # the service\n  version: '1.0.0'\n`;

describe('renderHighlightedRows', () => {
  // A custom renderer turns wrapLines on when it's not set, so every case sets it
  it.each([
    ['json', schema, oneDark, { showLineNumbers: true, wrapLines: true, wrapLongLines: true }],
    ['json', schema, oneLight, { wrapLines: true }],
    ['json', avro, oneLight, { showLineNumbers: true, wrapLines: false }],
    ['yaml', yaml, oneDark, { wrapLines: true }],
    ['json', schema, oneDark, { useInlineStyles: false, showLineNumbers: true, wrapLines: true }],
  ])('renders %s the same markup as the default renderer (case %#)', (language, code, style, options) => {
    const render = (props: object) =>
      renderToStaticMarkup(
        <SyntaxHighlighter language={language} style={style} {...options} {...props}>
          {code}
        </SyntaxHighlighter>
      );

    const expected = render({});
    expect(render({ renderer: renderHighlightedRows })).toBe(expected);
    expect(expected).toContain('token');
  });
});
