import { extname } from "node:path";

import type { Diagnostic } from "./types";

// @ai codex:other
const IDENTIFIER = "[a-z0-9]+(?:-[a-z0-9]+)*";
const START_MARKER = new RegExp(`^@ai\\s+(${IDENTIFIER}):(${IDENTIFIER})$`, "u");
const MARKER_LIKE = /^@(?:ai|end-ai)(?![a-z0-9-])/iu;

const JSX_COMMENT = /^\s*\{\/\*\s*(.*?)\s*\*\/\}\s*$/u;
const HTML_COMMENT = /^\s*<!--\s*(.*?)\s*-->\s*$/u;
const BLOCK_COMMENT = /^\s*\/\*\s*(.*?)\s*\*\/\s*$/u;
const SLASH_COMMENT = /^\s*\/\/\s*(.*?)\s*$/u;
const HASH_COMMENT = /^\s*#\s*(.*?)\s*$/u;
const DASH_COMMENT = /^\s*--\s*(.*?)\s*$/u;
const ALL_COMMENT_PATTERNS = [
  JSX_COMMENT,
  HTML_COMMENT,
  BLOCK_COMMENT,
  SLASH_COMMENT,
  HASH_COMMENT,
  DASH_COMMENT,
];
const MARKDOWN_COMMENT_PATTERNS = [HTML_COMMENT];
const FENCE_START = /^\s{0,3}(`{3,}|~{3,})/u;
const FENCE_END = /^\s{0,3}(`{3,}|~{3,})\s*$/u;

interface ActiveMarker {
  pair: string;
  startLine: number;
}

interface Fence {
  character: string;
  length: number;
}

interface ParsedMarker {
  kind: "end" | "invalid" | "start";
  pair?: string;
}

export interface ParsedFile {
  totalLines: number;
  aiLines: number;
  pairLines: Map<string, number>;
  diagnostics: Diagnostic[];
}

function extractCommentBody(line: string, markdown: boolean): string | null {
  const patterns = markdown ? MARKDOWN_COMMENT_PATTERNS : ALL_COMMENT_PATTERNS;

  for (const pattern of patterns) {
    const match = pattern.exec(line);
    if (match?.[1] !== undefined) return match[1].trim();
  }

  return null;
}

function parseMarker(line: string, markdown: boolean): ParsedMarker | null {
  const body = extractCommentBody(line, markdown);

  if (body === null || !MARKER_LIKE.test(body)) return null;
  if (body === "@end-ai") return { kind: "end" };

  const start = START_MARKER.exec(body);
  if (start?.[1] !== undefined && start[2] !== undefined) {
    return { kind: "start", pair: `${start[1]}:${start[2]}` };
  }

  return { kind: "invalid" };
}

function updateFence(line: string, activeFence: Fence | null): Fence | null {
  const match = (activeFence === null ? FENCE_START : FENCE_END).exec(line);
  const token = match?.[1];

  if (token === undefined) return activeFence;

  if (activeFence === null) {
    return { character: token[0] ?? "", length: token.length };
  }

  if (token[0] === activeFence.character && token.length >= activeFence.length) {
    return null;
  }

  return activeFence;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function parseFileMarkers(content: string, file: string, sourcePath: string): ParsedFile {
  const markdown = extname(sourcePath).toLowerCase() === ".md";
  const fenced = markdown || extname(sourcePath).toLowerCase() === ".mdx";
  const stack: ActiveMarker[] = [];
  const diagnostics: Diagnostic[] = [];
  const pairLines = new Map<string, number>();
  let totalLines = 0;
  let aiLines = 0;
  let activeFence: Fence | null = null;

  for (const [index, line] of content.split(/\r\n?|\n/u).entries()) {
    const lineNumber = index + 1;
    const wasInsideFence = activeFence !== null;

    if (fenced) activeFence = updateFence(line, activeFence);

    const isFenceLine =
      fenced && (wasInsideFence || activeFence !== null) && FENCE_START.test(line);
    const marker = wasInsideFence || isFenceLine ? null : parseMarker(line, markdown);

    if (marker?.kind === "invalid") {
      diagnostics.push({
        file,
        line: lineNumber,
        message:
          "Invalid marker. Expected @ai <agent-harness>:<model> or @end-ai using lowercase kebab-case identifiers.",
      });
      continue;
    }

    if (marker?.kind === "start" && marker.pair !== undefined) {
      stack.push({ pair: marker.pair, startLine: lineNumber });
      continue;
    }

    if (marker?.kind === "end") {
      if (stack.pop() === undefined) {
        diagnostics.push({
          file,
          line: lineNumber,
          message: "Unexpected @end-ai marker without a matching @ai marker.",
        });
      }
      continue;
    }

    if (line.trim().length === 0) continue;

    totalLines += 1;
    const owner = stack.at(-1);
    if (owner === undefined) continue;

    aiLines += 1;
    increment(pairLines, owner.pair);
  }

  for (const marker of stack) {
    diagnostics.push({
      file,
      line: marker.startLine,
      message: `Unclosed @ai ${marker.pair} marker.`,
    });
  }

  return { totalLines, aiLines, pairLines, diagnostics };
}
// @end-ai
