import { cosmiconfig } from "cosmiconfig";
import { z } from "zod";

import { AinotateError, errorMessage } from "./errors";

// @ai codex:other
const globPattern = z.string().trim().min(1, "Glob patterns cannot be empty.");

const configSchema = z
  .object({
    fileTypes: z
      .array(globPattern)
      .refine(
        (patterns) => patterns.some((pattern) => !pattern.startsWith("!")),
        "fileTypes must contain at least one positive glob pattern.",
      )
      .optional(),
    ignore: z.array(globPattern).optional(),
  })
  .strict();

export interface ResolvedConfig {
  fileTypes: string[];
  ignore: string[];
  filepath: string | null;
}

export async function loadConfig(searchFrom: string): Promise<ResolvedConfig> {
  let result;

  try {
    result = await cosmiconfig("ainotate").search(searchFrom);
  } catch (error) {
    throw new AinotateError(
      "INVALID_CONFIG",
      `Could not load ainotate configuration: ${errorMessage(error)}`,
      [],
      { cause: error },
    );
  }

  const parsed = configSchema.safeParse(result?.config ?? {});

  if (!parsed.success) {
    const file = result?.filepath ?? "<configuration>";
    const diagnostics = parsed.error.issues.map((issue) => ({
      file,
      message: `${issue.path.join(".") || "config"}: ${issue.message}`,
    }));

    throw new AinotateError(
      "INVALID_CONFIG",
      `Invalid ainotate configuration in ${file}.`,
      diagnostics,
    );
  }

  return {
    fileTypes: parsed.data.fileTypes ?? ["**/*"],
    ignore: parsed.data.ignore ?? [],
    filepath: result?.filepath ?? null,
  };
}
// @end-ai
