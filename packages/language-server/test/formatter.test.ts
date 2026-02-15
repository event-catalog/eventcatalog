import { describe, it, expect } from "vitest";
import { formatEc } from "../src/formatter.js";

describe("formatEc", () => {
  it("indents nested blocks with 2 spaces", () => {
    const input = `service OrderService {
version "1.0.0"
summary "Handles orders"
}`;
    const expected = `service OrderService {
  version "1.0.0"
  summary "Handles orders"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("handles deeply nested blocks", () => {
    const input = `domain Retail {
service OrderService {
version "1.0.0"
sends {
event OrderPlaced {
version "1.0.0"
}
}
}
}`;
    const expected = `domain Retail {
  service OrderService {
    version "1.0.0"
    sends {
      event OrderPlaced {
        version "1.0.0"
      }
    }
  }
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("collapses multiple blank lines into one", () => {
    const input = `service A {
  version "1.0.0"



  summary "test"
}`;
    const expected = `service A {
  version "1.0.0"

  summary "test"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("trims trailing whitespace", () => {
    const input = `service A {
  version "1.0.0"
}   `;
    const expected = `service A {
  version "1.0.0"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("preserves line comments", () => {
    const input = `// This is a service
service A {
// version
version "1.0.0"
}`;
    const expected = `// This is a service
service A {
  // version
  version "1.0.0"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("preserves block comments", () => {
    const input = `/* Multi-line
comment */
service A {
version "1.0.0"
}`;
    const expected = `/* Multi-line
comment */
service A {
  version "1.0.0"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("does not count braces inside strings", () => {
    const input = `service A {
summary "has { braces } inside"
version "1.0.0"
}`;
    const expected = `service A {
  summary "has { braces } inside"
  version "1.0.0"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("does not count braces inside line comments", () => {
    const input = `service A {
// something { with braces }
version "1.0.0"
}`;
    const expected = `service A {
  // something { with braces }
  version "1.0.0"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("handles already formatted code", () => {
    const input = `service A {
  version "1.0.0"
  summary "test"
}
`;
    expect(formatEc(input)).toBe(input);
  });

  it("handles empty input", () => {
    expect(formatEc("")).toBe("\n");
  });

  it("handles annotations", () => {
    const input = `service OrderService {
version "1.0.0"
@badge "Core"
@resourceGroup "Details" {
content "Some info"
}
}`;
    const expected = `service OrderService {
  version "1.0.0"
  @badge "Core"
  @resourceGroup "Details" {
    content "Some info"
  }
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("handles closing brace on same line as content", () => {
    const input = `service A {
version "1.0.0"
}`;
    const expected = `service A {
  version "1.0.0"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("removes trailing blank lines", () => {
    const input = `service A {
  version "1.0.0"
}


`;
    const expected = `service A {
  version "1.0.0"
}
`;
    expect(formatEc(input)).toBe(expected);
  });

  it("formats visualizer blocks", () => {
    const input = `visualizer {
include OrderService
include PaymentService
}`;
    const expected = `visualizer {
  include OrderService
  include PaymentService
}
`;
    expect(formatEc(input)).toBe(expected);
  });
});
