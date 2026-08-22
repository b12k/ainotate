import Table from "cli-table3";

import type { AgentHarnessBreakdown, AnalysisReport, ModelBreakdown, PairBreakdown } from "./types";

// @ai codex:other
function percentage(lines: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((lines / total) * 100);
}

function increment(map: Map<string, number>, key: string, lines: number): void {
  map.set(key, (map.get(key) ?? 0) + lines);
}

function sortBreakdown<T extends { lines: number }>(rows: T[], name: (row: T) => string): T[] {
  return rows.toSorted(
    (left, right) => right.lines - left.lines || name(left).localeCompare(name(right), "en"),
  );
}

export function createReport(
  root: string,
  scannedFiles: number,
  skippedBinary: number,
  totalLines: number,
  aiLines: number,
  pairLines: Map<string, number>,
): AnalysisReport {
  const harnessLines = new Map<string, number>();
  const modelLines = new Map<string, number>();

  for (const [pair, lines] of pairLines) {
    const separator = pair.indexOf(":");
    const harness = pair.slice(0, separator);
    const model = pair.slice(separator + 1);
    increment(harnessLines, harness, lines);
    increment(modelLines, model, lines);
  }

  const byAgentHarness = sortBreakdown<AgentHarnessBreakdown>(
    [...harnessLines].map(([agentHarness, lines]) => ({
      agentHarness,
      lines,
      percentageOfTotal: percentage(lines, totalLines),
    })),
    (row) => row.agentHarness,
  );
  const byModel = sortBreakdown<ModelBreakdown>(
    [...modelLines].map(([model, lines]) => ({
      model,
      lines,
      percentageOfTotal: percentage(lines, totalLines),
    })),
    (row) => row.model,
  );
  const byPair = sortBreakdown<PairBreakdown>(
    [...pairLines].map(([pair, lines]) => ({
      pair,
      lines,
      percentageOfTotal: percentage(lines, totalLines),
    })),
    (row) => row.pair,
  );

  return {
    schemaVersion: 1,
    root,
    files: { scanned: scannedFiles, skippedBinary },
    lines: {
      total: totalLines,
      ai: aiLines,
      unattributed: totalLines - aiLines,
      aiPercentage: percentage(aiLines, totalLines),
    },
    byAgentHarness,
    byModel,
    byPair,
  };
}

function formatPercentage(value: number): string {
  return `${value}%`;
}

function renderMatrix(report: AnalysisReport): string {
  const models = report.byModel.map((row) => row.model);
  const pairs = new Map(report.byPair.map((row) => [row.pair, row]));
  const table = new Table({
    colAligns: ["left", ...models.map(() => "right" as const)],
    head: ["Harness / model", ...models],
  });

  for (const { agentHarness } of report.byAgentHarness) {
    table.push([
      agentHarness,
      ...models.map((model) => {
        const pair = pairs.get(`${agentHarness}:${model}`);
        return `${pair?.lines ?? 0} / ${formatPercentage(pair?.percentageOfTotal ?? 0)}`;
      }),
    ]);
  }

  return `By harness and model\n${table.toString()}`;
}

export function renderTerminalReport(report: AnalysisReport): string {
  const summary = new Table({
    colAligns: ["left", "right", "right"],
    head: ["Metric", "Lines", "% of total"],
  });
  const totalPercentage = report.lines.total === 0 ? 0 : 100;

  summary.push(
    ["Total", String(report.lines.total), formatPercentage(totalPercentage)],
    ["AI-attributed", String(report.lines.ai), formatPercentage(report.lines.aiPercentage)],
    [
      "Unattributed",
      String(report.lines.unattributed),
      formatPercentage(percentage(report.lines.unattributed, report.lines.total)),
    ],
  );

  const sections = [
    `ainotate ${report.root}`,
    `Files: ${report.files.scanned} scanned, ${report.files.skippedBinary} binary skipped`,
    `Summary\n${summary.toString()}`,
    renderMatrix(report),
  ];

  return `${sections.join("\n\n")}\n`;
}
// @end-ai
