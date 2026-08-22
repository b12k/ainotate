import { describe, expect, it } from "@rstest/core";

import { createReport, renderTerminalReport } from "../src/report";

// @ai codex:other
describe("reports", () => {
  it("aggregates harnesses, models, and pairs deterministically", () => {
    const report = createReport(
      "/repo",
      3,
      1,
      21,
      7,
      new Map([
        ["codex:gpt-5-5", 5],
        ["cursor:gpt-5-5", 2],
      ]),
    );

    expect(report.lines).toEqual({
      total: 21,
      ai: 7,
      unattributed: 14,
      aiPercentage: 33,
    });
    expect(report.byAgentHarness).toEqual([
      { agentHarness: "codex", lines: 5, percentageOfTotal: 24 },
      { agentHarness: "cursor", lines: 2, percentageOfTotal: 10 },
    ]);
    expect(report.byModel).toEqual([{ model: "gpt-5-5", lines: 7, percentageOfTotal: 33 }]);
    expect(report.byPair.map((row) => row.pair)).toEqual(["codex:gpt-5-5", "cursor:gpt-5-5"]);
  });

  it("renders a harness-by-model terminal table", () => {
    const output = renderTerminalReport(
      createReport(
        "/repo",
        3,
        0,
        20,
        7,
        new Map([
          ["opencode:gpt-5-5", 5],
          ["pi:opus-4-7", 2],
        ]),
      ),
    );

    expect(output).toContain("Summary");
    expect(output).toContain("Harness / model");
    expect(output).toContain("gpt-5-5");
    expect(output).toContain("opus-4-7");
    expect(output).toContain("opencode");
    expect(output).toContain("5 / 25%");
    expect(output).toContain("0 / 0%");
  });
});
// @end-ai
