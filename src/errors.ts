import type { AinotateErrorCode, Diagnostic } from "./types";

// @ai codex:other
export class AinotateError extends Error {
  readonly code: AinotateErrorCode;
  readonly diagnostics: Diagnostic[];

  constructor(
    code: AinotateErrorCode,
    message: string,
    diagnostics: Diagnostic[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AinotateError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
// @end-ai
