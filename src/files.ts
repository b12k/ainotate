import { globby } from "globby";

import type { ResolvedConfig } from "./config";

// @ai codex:other
const BUILT_IN_IGNORES = [
  "**/.git/**",
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
];

export async function findCandidateFiles(root: string, config: ResolvedConfig): Promise<string[]> {
  const files = await globby(config.fileTypes, {
    absolute: true,
    cwd: root,
    dot: true,
    followSymbolicLinks: false,
    gitignore: true,
    ignore: [...BUILT_IN_IGNORES, ...config.ignore],
    onlyFiles: true,
  });

  return files.toSorted((left, right) => {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  });
}
// @end-ai
