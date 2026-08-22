<!-- @ai codex:other -->

# ainotate

`ainotate` scans a codebase for `@ai <agent-harness>:<model>` markers and
reports how many nonblank lines are attributed to each harness, model, and
pair.

## Install and run

```sh
pnpm install
pnpm build
node dist/index.js [path]
```

The path is optional and defaults to the current directory:

```sh
ainotate
ainotate ./src
ainotate . --json
```

The default output contains a summary followed by a harness-by-model matrix.
Each matrix cell shows attributed lines and percentage of total lines.
`--json` writes a stable machine-readable report to stdout.

## Marker format

Markers must be standalone native-comment lines. Harness and model identifiers
must use lowercase kebab-case.

```ts
// @ai codex:gpt-5-5
function add(left: number, right: number): number {
  return left + right;
}
// @end-ai
```

Supported wrappers are `//`, `#`, `--`, `/* */`, `<!-- -->`, and JSX
`{/* */}` comments. Nested spans are valid; their content belongs to the
innermost pair. Malformed, unmatched, or unclosed markers fail the analysis
without producing a partial report.

## Configuration

Configuration is loaded with Cosmiconfig. Supported locations include an
`ainotate` property in `package.json`, `.ainotaterc`,
`.ainotaterc.json`, `.ainotaterc.yaml`, `.ainotaterc.yml`,
`.ainotaterc.{js,ts,mjs,cjs}`, `.config/ainotaterc*`, and
`ainotate.config.{js,ts,mjs,cjs}`.

```yaml
fileTypes:
  - "**/*.{ts,tsx,js,jsx}"
  - "!**/*.generated.ts"
ignore:
  - "**/fixtures/**"
```

- `fileTypes` contains Globby patterns relative to the scan target. When
  present, it replaces the default `["**/*"]`.
- `ignore` adds Globby ignore patterns to `.gitignore` and the built-in
  `.git`, `build`, `coverage`, `dist`, and `node_modules` ignores.
- Dotfiles are included, symbolic links are not followed, and binary files are
  skipped.

Without configuration, every non-binary text file is included. This can include
JSON, lockfiles, and project metadata; use `fileTypes` when those files should
not contribute to total lines.

## Counting rules

- Blank and whitespace-only lines do not count.
- Marker lines do not count.
- Lines outside markers are reported as `unattributed`, not assumed to be
  human-authored.
- Each percentage uses all counted lines as its denominator and is rounded to
  the nearest integer.
- A zero-line repository reports `0`, never `NaN`.

## Development

```sh
pnpm build
pnpm test
pnpm check
```

Rslib builds the ESM CLI and declarations. Rstest runs unit, integration, and
built-executable smoke tests. Oxlint checks the code and Oxfmt enforces
formatting.

<!-- @end-ai -->
