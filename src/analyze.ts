import { readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import { isBinaryFile } from "isbinaryfile";
import pMap from "p-map";

import { loadConfig } from "./config";
import { AinotateError, errorMessage } from "./errors";
import { findCandidateFiles } from "./files";
import { parseFileMarkers } from "./markers";
import { createReport } from "./report";
import type { AnalysisReport, Diagnostic } from "./types";

// @ai codex:other
function relativePath(root: string, file: string): string {
  return relative(root, file).split(sep).join("/");
}

function decodeText(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }

  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  }

  return new TextDecoder("utf-8").decode(
    buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf ? buffer.subarray(3) : buffer,
  );
}

function mergeCounts(target: Map<string, number>, source: Map<string, number>): void {
  for (const [pair, lines] of source) {
    target.set(pair, (target.get(pair) ?? 0) + lines);
  }
}

async function validateRoot(root: string): Promise<void> {
  try {
    const rootStat = await stat(root);
    if (!rootStat.isDirectory()) {
      throw new AinotateError("FILESYSTEM_ERROR", `Scan target is not a directory: ${root}`);
    }
  } catch (error) {
    if (error instanceof AinotateError) throw error;
    throw new AinotateError(
      "FILESYSTEM_ERROR",
      `Cannot access scan target ${root}: ${errorMessage(error)}`,
      [],
      { cause: error },
    );
  }
}

export async function analyzeDirectory(target: string): Promise<AnalysisReport> {
  const root = resolve(target);
  await validateRoot(root);
  const config = await loadConfig(root);

  let candidateFiles: string[];
  try {
    candidateFiles = await findCandidateFiles(root, config);
  } catch (error) {
    throw new AinotateError(
      "FILESYSTEM_ERROR",
      `Could not discover files below ${root}: ${errorMessage(error)}`,
      [],
      { cause: error },
    );
  }

  const results = await pMap(
    candidateFiles,
    async (file) => {
      const relativeFile = relativePath(root, file);
      let buffer: Buffer;

      try {
        buffer = await readFile(file);
      } catch (error) {
        throw new AinotateError(
          "FILESYSTEM_ERROR",
          `Could not read ${relativeFile}: ${errorMessage(error)}`,
          [{ file: relativeFile, message: errorMessage(error) }],
          { cause: error },
        );
      }

      if (await isBinaryFile(buffer)) return { binary: true as const };

      return {
        binary: false as const,
        parsed: parseFileMarkers(decodeText(buffer), relativeFile, file),
      };
    },
    { concurrency: 32 },
  );

  let scannedFiles = 0;
  let skippedBinary = 0;
  let totalLines = 0;
  let aiLines = 0;
  const diagnostics: Diagnostic[] = [];
  const pairLines = new Map<string, number>();

  for (const result of results) {
    if (result.binary) {
      skippedBinary += 1;
      continue;
    }

    scannedFiles += 1;
    totalLines += result.parsed.totalLines;
    aiLines += result.parsed.aiLines;
    diagnostics.push(...result.parsed.diagnostics);
    mergeCounts(pairLines, result.parsed.pairLines);
  }

  if (diagnostics.length > 0) {
    throw new AinotateError(
      "INVALID_MARKERS",
      `Found ${diagnostics.length} invalid AI marker${diagnostics.length === 1 ? "" : "s"}.`,
      diagnostics,
    );
  }

  return createReport(root, scannedFiles, skippedBinary, totalLines, aiLines, pairLines);
}
// @end-ai
