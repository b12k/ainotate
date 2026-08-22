import { Command, CommanderError } from "commander";

import { analyzeDirectory } from "./analyze";
import { AinotateError, errorMessage } from "./errors";
import { renderTerminalReport } from "./report";
import type { AinotateErrorCode, Diagnostic } from "./types";

// @ai codex:other
const VERSION = "0.1.0";

export interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
}

interface SerializedError {
  error: {
    code: AinotateErrorCode | "CLI_USAGE";
    message: string;
    diagnostics: Diagnostic[];
  };
}

const processIo: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

function serializeError(
  code: AinotateErrorCode | "CLI_USAGE",
  message: string,
  diagnostics: Diagnostic[] = [],
): SerializedError {
  return { error: { code, message, diagnostics } };
}

function renderHumanError(
  code: AinotateErrorCode,
  message: string,
  diagnostics: Diagnostic[],
): string {
  const lines = [`Error [${code}]: ${message}`];

  for (const diagnostic of diagnostics) {
    const location =
      diagnostic.line === undefined ? diagnostic.file : `${diagnostic.file}:${diagnostic.line}`;
    lines.push(`  ${location} ${diagnostic.message}`);
  }

  return `${lines.join("\n")}\n`;
}

export async function runCli(
  argv: readonly string[] = process.argv.slice(2),
  io: CliIo = processIo,
): Promise<number> {
  const jsonRequested = argv.includes("--json");
  const program = new Command()
    .name("ainotate")
    .description("Analyze @ai markers and report AI-attributed lines of code.")
    .version(VERSION)
    .argument("[path]", "directory to analyze", ".")
    .option("--json", "write a machine-readable JSON report")
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (value) => io.stdout(value),
      writeErr: (value) => {
        if (!jsonRequested) io.stderr(value);
      },
    });

  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) return 0;

      if (jsonRequested) {
        io.stderr(`${JSON.stringify(serializeError("CLI_USAGE", error.message), null, 2)}\n`);
      }

      return 2;
    }

    throw error;
  }

  const options = program.opts<{ json?: boolean }>();
  const target = program.processedArgs[0];

  try {
    const report = await analyzeDirectory(typeof target === "string" ? target : ".");
    io.stdout(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderTerminalReport(report));
    return 0;
  } catch (error) {
    const code = error instanceof AinotateError ? error.code : "INTERNAL_ERROR";
    const message = errorMessage(error);
    const diagnostics = error instanceof AinotateError ? error.diagnostics : [];

    io.stderr(
      options.json
        ? `${JSON.stringify(serializeError(code, message, diagnostics), null, 2)}\n`
        : renderHumanError(code, message, diagnostics),
    );
    return 1;
  }
}
// @end-ai
