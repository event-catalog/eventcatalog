export const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * A small highlighter for JSON, TypeScript, YAML and shell: one pass over the source for comments, strings
 * (and JSON keys), numbers, keywords and object keys.
 *
 * It is self-contained on purpose: the export runs it for the code that is visible when the page opens, and the
 * page embeds its source (see `highlightSource`) to highlight the other tabs the first time they are opened.
 */
export function highlight(code: string, lang?: string | null): string {
  // YAML has no // comments (URLs would read as one) and no keywords (plain prose would light up)
  const yaml = lang === 'yaml';
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
  // Linear time: an unterminated /* comment runs to the end of the input instead of being retried from every
  // '/*', and an object key can't start inside a word and never backtracks (the lookahead and \7 make it atomic).
  const tokens =
    /(\/\*[\s\S]*?(?:\*\/|(?![\s\S]))|\/\/[^\n]*|(?:^|(?<=\s))#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)(\s*:)?|\b(\d+(?:\.\d+)?)\b|\b(export|interface|type|import|from|const|let|await|async|new|return|if|true|false|null|undefined|for|of)\b|(?<![\w$-])((?=([A-Za-z_$][\w$-]*))\7\??)(?=\s*:)/gm;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tokens.exec(code))) {
    if (m[0] === '') {
      tokens.lastIndex++;
      continue;
    }
    out += esc(code.slice(last, m.index));
    if (m[1]) out += yaml && m[1].charAt(0) === '/' ? esc(m[1]) : '<span class="t-com">' + esc(m[1]) + '</span>';
    else if (m[2])
      out += m[3] ? '<span class="t-key">' + esc(m[2]) + '</span>' + esc(m[3]) : '<span class="t-str">' + esc(m[2]) + '</span>';
    else if (m[4]) out += '<span class="t-num">' + m[4] + '</span>';
    else if (m[5])
      out += yaml && m[5] !== 'true' && m[5] !== 'false' && m[5] !== 'null' ? m[5] : '<span class="t-kw">' + m[5] + '</span>';
    else if (m[6]) {
      // A YAML key starts its line (after indentation or a list dash); `https:` inside a value is not one
      const lineStart = code.lastIndexOf('\n', m.index - 1) + 1;
      const isKey = !yaml || /^\s*(-\s+)?$/.test(code.slice(lineStart, m.index));
      out += isKey ? '<span class="t-prop">' + esc(m[6]) + '</span>' : esc(m[6]);
    }
    last = tokens.lastIndex;
  }
  return out + esc(code.slice(last));
}

/** The highlighter's source, embedded in the page so tabs opened later are highlighted exactly the same way. */
export const highlightSource = highlight.toString();
