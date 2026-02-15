/**
 * Simple text-based formatter for .ec DSL files.
 * Uses brace-depth tracking for indentation — no AST needed.
 */
export function formatEc(source: string): string {
  const lines = source.split("\n");
  const result: string[] = [];
  const indent = "  "; // 2-space indentation
  let depth = 0;
  let prevBlank = false;
  let inBlockComment = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Handle blank lines — collapse multiple into one
    if (trimmed === "") {
      if (!prevBlank) {
        result.push("");
        prevBlank = true;
      }
      continue;
    }
    prevBlank = false;

    // Track block comment state
    if (inBlockComment) {
      // Inside a block comment, preserve content with current depth
      result.push(indent.repeat(depth) + trimmed);
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) {
        inBlockComment = true;
      }
      // Decrease depth before printing if line starts with }
      // (unlikely in a comment opener, but handle gracefully)
      result.push(indent.repeat(depth) + trimmed);
      continue;
    }

    // Decrease depth for closing braces before writing the line
    if (trimmed.startsWith("}")) {
      depth = Math.max(0, depth - 1);
    }

    result.push(indent.repeat(depth) + trimmed);

    // Increase depth for opening braces
    // Count braces outside of strings and comments
    const stripped = stripStringsAndComments(trimmed);
    const opens = (stripped.match(/{/g) || []).length;
    const closes = (stripped.match(/}/g) || []).length;

    // We already decremented for a leading }, so adjust
    if (trimmed.startsWith("}")) {
      // Re-add the one we already subtracted, let the net calculation handle it
      depth = depth + 1;
    }
    depth = Math.max(0, depth + opens - closes);
  }

  // Remove trailing blank lines
  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }

  return result.join("\n") + "\n";
}

/** Strip string literals and line comments from a line for brace counting */
function stripStringsAndComments(line: string): string {
  let result = "";
  let inString: string | null = null;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inString) {
      if (ch === inString && line[i - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }

    // Line comment — skip rest
    if (ch === "/" && line[i + 1] === "/") {
      break;
    }

    result += ch;
  }

  return result;
}
