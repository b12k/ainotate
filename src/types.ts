// @ai codex:other
export type AinotateErrorCode =
  | "FILESYSTEM_ERROR"
  | "INTERNAL_ERROR"
  | "INVALID_CONFIG"
  | "INVALID_MARKERS";

export interface Diagnostic {
  file: string;
  line?: number;
  message: string;
}

export interface FileCounts {
  scanned: number;
  skippedBinary: number;
}

export interface LineCounts {
  total: number;
  ai: number;
  unattributed: number;
  aiPercentage: number;
}

export interface AgentHarnessBreakdown {
  agentHarness: string;
  lines: number;
  percentageOfTotal: number;
}

export interface ModelBreakdown {
  model: string;
  lines: number;
  percentageOfTotal: number;
}

export interface PairBreakdown {
  pair: string;
  lines: number;
  percentageOfTotal: number;
}

export interface AnalysisReport {
  schemaVersion: 1;
  root: string;
  files: FileCounts;
  lines: LineCounts;
  byAgentHarness: AgentHarnessBreakdown[];
  byModel: ModelBreakdown[];
  byPair: PairBreakdown[];
}
// @end-ai
