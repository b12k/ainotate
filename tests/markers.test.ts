import { describe, expect, it } from "@rstest/core";

import { parseFileMarkers } from "../src/markers";

// @ai codex:other
const AI = "@ai";
const END_AI = "@end-ai";

function slashStart(pair: string): string {
  return `// ${AI} ${pair}`;
}

function slashEnd(): string {
  return `// ${END_AI}`;
}

describe("parseFileMarkers", () => {
  it("counts nonblank content and excludes marker lines", () => {
    const parsed = parseFileMarkers(
      [
        slashStart("codex:gpt-5-5"),
        "const one = 1;",
        "",
        "const two = 2;",
        slashEnd(),
        "const three = 3;",
      ].join("\r\n"),
      "source.ts",
      "source.ts",
    );

    expect(parsed.totalLines).toBe(3);
    expect(parsed.aiLines).toBe(2);
    expect(parsed.pairLines).toEqual(new Map([["codex:gpt-5-5", 2]]));
    expect(parsed.diagnostics).toEqual([]);
  });

  it("attributes nested content to the innermost pair", () => {
    const parsed = parseFileMarkers(
      [
        slashStart("claude-code:sonnet-4-6"),
        "const outerBefore = true;",
        slashStart("codex:gpt-5-5"),
        "const inner = true;",
        slashEnd(),
        "const outerAfter = true;",
        slashEnd(),
      ].join("\n"),
      "nested.ts",
      "nested.ts",
    );

    expect(parsed.totalLines).toBe(3);
    expect(parsed.aiLines).toBe(3);
    expect(parsed.pairLines).toEqual(
      new Map([
        ["claude-code:sonnet-4-6", 2],
        ["codex:gpt-5-5", 1],
      ]),
    );
  });

  it.each([
    [`// ${AI} codex:gpt-5-5`, `// ${END_AI}`],
    [`# ${AI} codex:gpt-5-5`, `# ${END_AI}`],
    [`-- ${AI} codex:gpt-5-5`, `-- ${END_AI}`],
    [`/* ${AI} codex:gpt-5-5 */`, `/* ${END_AI} */`],
    [`<!-- ${AI} codex:gpt-5-5 -->`, `<!-- ${END_AI} -->`],
    [`{/* ${AI} codex:gpt-5-5 */}`, `{/* ${END_AI} */}`],
  ])("supports marker wrapper %s", (start, end) => {
    const parsed = parseFileMarkers([start, "content", end].join("\n"), "source.txt", "source.txt");

    expect(parsed.aiLines).toBe(1);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("ignores marker examples inside Markdown fences", () => {
    const parsed = parseFileMarkers(
      [
        "```js",
        slashStart("example:other"),
        "const example = true;",
        slashEnd(),
        "```",
        `<!-- ${AI} codex:gpt-5-5 -->`,
        "Actual prose.",
        `<!-- ${END_AI} -->`,
      ].join("\n"),
      "README.md",
      "README.md",
    );

    expect(parsed.totalLines).toBe(6);
    expect(parsed.aiLines).toBe(1);
    expect(parsed.pairLines.has("example:other")).toBe(false);
    expect(parsed.pairLines.get("codex:gpt-5-5")).toBe(1);
  });

  it("reports malformed, unexpected, and unclosed markers", () => {
    const parsed = parseFileMarkers(
      [`// ${AI} CODEX:gpt-5-5`, slashEnd(), slashStart("codex:gpt-5-5"), "content"].join("\n"),
      "broken.ts",
      "broken.ts",
    );

    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({
        line: 1,
        message: expect.stringContaining("Invalid"),
      }),
      expect.objectContaining({
        line: 2,
        message: expect.stringContaining("Unexpected"),
      }),
      expect.objectContaining({
        line: 3,
        message: expect.stringContaining("Unclosed"),
      }),
    ]);
  });
});
// @end-ai
