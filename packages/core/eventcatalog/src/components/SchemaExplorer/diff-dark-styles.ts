// Dark mode overrides for diff2html, scoped under the given selector.
// Shared by the Schema Explorer diff viewer and the changelog page.
export const getDiffDarkStyles = (scope: string) => `
${scope} .d2h-wrapper {
  color: #e5e7eb;
}
${scope} .d2h-file-header {
  background-color: rgba(255,255,255,0.05);
  border-bottom-color: rgba(255,255,255,0.1);
}
${scope} .d2h-file-header .d2h-file-name {
  color: #e5e7eb;
}
${scope} .d2h-diff-table {
  border-color: rgba(255,255,255,0.1);
}
${scope} .d2h-code-side-linenumber,
${scope} .d2h-code-linenumber {
  background-color: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.08);
  color: #6b7280;
}
${scope} .d2h-code-line,
${scope} .d2h-code-side-line {
  background-color: transparent;
  border-color: rgba(255,255,255,0.06);
  color: #d1d5db;
}
${scope} .d2h-code-line-ctn {
  color: #d1d5db;
}
/* Deletion lines */
${scope} .d2h-del {
  background-color: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.15);
}
${scope} .d2h-del .d2h-code-side-linenumber,
${scope} .d2h-del .d2h-code-linenumber {
  background-color: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.15);
  color: #f87171;
}
${scope} .d2h-del .d2h-code-line-ctn {
  color: #fca5a5;
}
${scope} del {
  background-color: rgba(239,68,68,0.25);
  color: #fca5a5;
  text-decoration: none;
}
/* Addition lines */
${scope} .d2h-ins {
  background-color: rgba(34,197,94,0.1);
  border-color: rgba(34,197,94,0.15);
}
${scope} .d2h-ins .d2h-code-side-linenumber,
${scope} .d2h-ins .d2h-code-linenumber {
  background-color: rgba(34,197,94,0.15);
  border-color: rgba(34,197,94,0.15);
  color: #4ade80;
}
${scope} .d2h-ins .d2h-code-line-ctn {
  color: #bbf7d0;
}
${scope} ins {
  background-color: rgba(34,197,94,0.25);
  color: #bbf7d0;
  text-decoration: none;
}
/* Info/context header */
${scope} .d2h-info {
  background-color: rgba(59,130,246,0.08);
  border-color: rgba(59,130,246,0.15);
  color: #93c5fd;
}
/* File diff border */
${scope} .d2h-file-diff {
  border-color: rgba(255,255,255,0.1);
}
${scope} .d2h-file-side-diff {
  border-color: rgba(255,255,255,0.1);
}
/* Tag styles */
${scope} .d2h-tag {
  background-color: rgba(59,130,246,0.15);
  border-color: rgba(59,130,246,0.3);
  color: #93c5fd;
}
/* Empty placeholder lines */
${scope} .d2h-code-side-emptyplaceholder,
${scope} .d2h-emptyplaceholder {
  background-color: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.06);
}
/* File wrapper border */
${scope} .d2h-file-wrapper {
  border-color: rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}
${scope} .d2h-files-diff {
  border-color: rgba(255,255,255,0.1);
}
`;
