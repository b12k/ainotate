---
name: ainotate
description: Annotate meaningful AI-authored changes in comment-safe code, templates, or documentation. Use inline or block `@ai` markers; skip trivial, generated, or comment-unsafe changes.
---

<!-- @ai codex:gpt-other -->
# ainotate

Annotate meaningful content you author using the edited region's native comment syntax (`//`, `#`, `--`, `<!-- -->`, or JSX/TSX `{/* */}`).

For one line, append a marker; the newline ends it:

```text
...AI-authored line... <comment> @ai harness:model
```

If a trailing comment is unsafe or exceeds the project's line-length limit, use a block with standalone markers and matching indentation:

```text
<comment> @ai harness:model
...AI-authored lines...
<comment> @end-ai
```

## Identity

Use `harness:model`. Write the harness in lowercase kebab-case. Prefer the exact lowercase model slug without a vendor prefix; otherwise use `family-version`, replace each unknown part with `other`, and collapse `other-other` to `other`. Never guess.

## Scope

- Merge consecutive same-identity inline-annotated lines, including intervening blank lines, into one block.
- An edit is trivial if it changes neither behavior nor substantive meaning; line count does not decide.
- In new files, leave required headers outside annotations, including shebangs, frontmatter, declarations, imports, pragmas, encoding lines, `<!DOCTYPE html>`, and XML declarations.
- Skip pure JSON; generated, minified, compiled, and lock files; trivial or boilerplate-only edits; and locations where comments could affect parsing, rendering, publishing, copying, or tool ingestion. If unsure, do not annotate.

Before finishing, ensure annotations match the final code; repair those affected by formatters or linters.

## Existing Annotations

Do not relabel another agent's unchanged work.

- Keep an existing annotation when its identity matches yours.
- For a trivial edit inside another identity's annotation, leave its attribution unchanged.
- For a nontrivial edit to another identity's inline-annotated line, replace its identity with yours.
- For another identity's block, keep it outer and annotate only your meaningful edits unless you authored more than half its nonblank content lines; then make yours outer and annotate retained content with its original identity using the appropriate one-line or block form.

<!-- @end-ai -->
