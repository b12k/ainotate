import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "@rstest/core";

import { analyzeDirectory } from "../src/analyze";
import { AinotateError } from "../src/errors";

// @ai codex:other
const AI = "@ai";
const END_AI = "@end-ai";
const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "ainotate-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function write(
  root: string,
  relativePath: string,
  content: string | Uint8Array,
): Promise<void> {
  const file = join(root, relativePath);
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, content);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("analyzeDirectory", () => {
  it("scans all text files by default and skips binary files", async () => {
    const root = await temporaryDirectory();
    await write(root, "plain.txt", "one\n\ntwo\n");
    await write(root, "binary.dat", Uint8Array.from([0, 1, 2, 3]));

    const report = await analyzeDirectory(root);

    expect(report.files).toEqual({ scanned: 1, skippedBinary: 1 });
    expect(report.lines).toEqual({
      total: 2,
      ai: 0,
      unattributed: 2,
      aiPercentage: 0,
    });
  });

  it("loads extensionless rc YAML and applies globs and ignore rules", async () => {
    const root = await temporaryDirectory();
    await write(
      root,
      ".ainotaterc",
      ["fileTypes:", '  - "**/*.ts"', "ignore:", '  - "**/configured-ignore/**"'].join("\n"),
    );
    await write(root, ".gitignore", "git-ignore/\n");
    await write(
      root,
      "src/marked.ts",
      [`// ${AI} codex:gpt-5-5`, "const marked = true;", `// ${END_AI}`].join("\n"),
    );
    await write(root, "src/plain.ts", "const plain = true;\n");
    await write(root, "configured-ignore/skipped.ts", "ignored\n");
    await write(root, "git-ignore/skipped.ts", "ignored\n");
    await write(root, "src/not-selected.js", "ignored\n");

    const report = await analyzeDirectory(root);

    expect(report.files).toEqual({ scanned: 2, skippedBinary: 0 });
    expect(report.lines.total).toBe(2);
    expect(report.lines.ai).toBe(1);
    expect(report.byPair).toEqual([{ pair: "codex:gpt-5-5", lines: 1, percentageOfTotal: 50 }]);
  });

  it("loads .ainotaterc.json and supports negative file patterns", async () => {
    const root = await temporaryDirectory();
    await write(
      root,
      ".ainotaterc.json",
      JSON.stringify({ fileTypes: ["**/*.ts", "!**/*.generated.ts"] }),
    );
    await write(root, "included.ts", "included\n");
    await write(root, "excluded.generated.ts", "excluded\n");

    const report = await analyzeDirectory(root);

    expect(report.files.scanned).toBe(1);
    expect(report.lines.total).toBe(1);
  });

  it("respects nested .gitignore files", async () => {
    const root = await temporaryDirectory();
    await write(root, ".ainotaterc.json", JSON.stringify({ fileTypes: ["**/*.ts"] }));
    await write(root, "packages/demo/.gitignore", "ignored.ts\n");
    await write(root, "packages/demo/included.ts", "included\n");
    await write(root, "packages/demo/ignored.ts", "ignored\n");

    const report = await analyzeDirectory(root);

    expect(report.files.scanned).toBe(1);
    expect(report.lines.total).toBe(1);
  });

  it("fails without a partial report when markers are invalid", async () => {
    const root = await temporaryDirectory();
    await write(root, "broken.ts", `// ${AI} codex:gpt-5-5\ncontent\n`);

    const promise = analyzeDirectory(root);

    await expect(promise).rejects.toBeInstanceOf(AinotateError);
    await expect(promise).rejects.toMatchObject({
      code: "INVALID_MARKERS",
      diagnostics: [expect.objectContaining({ file: "broken.ts", line: 1 })],
    });
  });

  it("rejects unknown configuration properties", async () => {
    const root = await temporaryDirectory();
    await write(root, ".ainotaterc.json", JSON.stringify({ include: ["**/*"] }));

    await expect(analyzeDirectory(root)).rejects.toMatchObject({
      code: "INVALID_CONFIG",
    });
  });
});
// @end-ai
