import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "@rstest/core";

import { runCli, type CliIo } from "../src/cli";

// @ai codex:other
const AI = "@ai";
const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "ainotate-cli-"));
  temporaryDirectories.push(directory);
  return directory;
}

function captureIo(): { io: CliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
    },
    stdout,
    stderr,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("runCli", () => {
  it("writes only the report to stdout in JSON mode", async () => {
    const root = await temporaryDirectory();
    await writeFile(join(root, "source.ts"), "const value = true;\n");
    const capture = captureIo();

    const exitCode = await runCli([root, "--json"], capture.io);

    expect(exitCode).toBe(0);
    expect(capture.stderr).toEqual([]);
    expect(JSON.parse(capture.stdout.join(""))).toMatchObject({
      schemaVersion: 1,
      files: { scanned: 1, skippedBinary: 0 },
      lines: { total: 1, ai: 0 },
    });
  });

  it("writes structured errors to stderr without a partial report", async () => {
    const root = await temporaryDirectory();
    await writeFile(join(root, "broken.ts"), `// ${AI} codex:gpt-5-5\nconst value = true;\n`);
    const capture = captureIo();

    const exitCode = await runCli([root, "--json"], capture.io);

    expect(exitCode).toBe(1);
    expect(capture.stdout).toEqual([]);
    expect(JSON.parse(capture.stderr.join(""))).toMatchObject({
      error: {
        code: "INVALID_MARKERS",
        diagnostics: [expect.objectContaining({ file: "broken.ts", line: 1 })],
      },
    });
  });

  it("uses exit code 2 and JSON for invalid CLI usage", async () => {
    const capture = captureIo();

    const exitCode = await runCli(["--json", "--unknown"], capture.io);

    expect(exitCode).toBe(2);
    expect(capture.stdout).toEqual([]);
    expect(JSON.parse(capture.stderr.join(""))).toMatchObject({
      error: { code: "CLI_USAGE" },
    });
  });

  it("renders terminal tables by default", async () => {
    const root = await temporaryDirectory();
    await writeFile(join(root, "source.ts"), "const value = true;\n");
    const capture = captureIo();

    const exitCode = await runCli([root], capture.io);

    expect(exitCode).toBe(0);
    expect(capture.stdout.join("")).toContain("Harness / model");
    expect(capture.stdout.join("")).toContain("Unattributed");
  });
});
// @end-ai
