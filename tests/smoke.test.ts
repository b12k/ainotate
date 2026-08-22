import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "@rstest/core";

// @ai codex:other
const execFileAsync = promisify(execFile);

describe("built executable", () => {
  it("contains a shebang and emits valid JSON", async () => {
    const executable = resolve(process.cwd(), "dist/index.js");
    const builtSource = await readFile(executable, "utf8");

    expect(builtSource.startsWith("#!/usr/bin/env node\n")).toBe(true);

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      executable,
      resolve(process.cwd(), "src"),
      "--json",
    ]);
    const report = JSON.parse(stdout) as {
      schemaVersion: number;
      lines: { ai: number; total: number };
    };

    expect(stderr).toBe("");
    expect(report.schemaVersion).toBe(1);
    expect(report.lines.total).toBeGreaterThan(0);
    expect(report.lines.ai).toBeGreaterThan(0);
  });
});
// @end-ai
