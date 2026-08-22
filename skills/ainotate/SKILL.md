---
name: ainotate
description: Use when creating or modifying code, templates, or documentation that supports comments. Add `@ai <agent-harness>:<model>` and `@end-ai` markers around meaningful AI-authored spans using native comment syntax. Skip JSON, generated files, trivial edits, and places where comments break parsing or output.
---

# ainotate

Mark meaningful AI-authored edits so humans and tools can see what was written by AI.

## Marker Format

Wrap each annotated span with native comments:

```text
<comment> @ai <agent-harness>:<model>
...AI-authored lines...
<comment> @end-ai
```

- `<agent-harness>` is the application running the model, lowercase kebab-case, such as `opencode`, `claude-code`, `gemini`, `codex`, `cursor`, `copilot`, `aider`, `windsurf`, or `cline`.
- `<model>` is the current model slug, lowercase kebab-case, with no vendor prefix, such as `gpt-5-5`, `sonnet-4-6`, `opus-4-7`, `o4-mini`, or `gemini-2-5-pro`.
- Do not guess. If the agent harness or model is unknown, use `other` for that part, such as `opencode:other`, `other:gpt-5-5`, or `other:other`.

## When To Annotate

Annotate substantial AI-authored code, templates, or documentation when comments are valid and safe.

Wrap only lines you created or substantially rewrote in this edit:

- New function, class, block, or section: wrap that addition.
- Existing code edit: wrap only the edited region, not the whole surrounding function.
- Several separate edits: use separate marker pairs.
- New file: wrap the authored content, but keep required headers outside markers.

Required headers include shebangs, `"use strict"`, package/module declarations, imports, frontmatter, `<!DOCTYPE html>`, XML declarations, pragmas, and encoding lines.

## When To Skip

Skip annotation when:

- Comments are invalid, such as pure JSON.
- The file is generated, minified, compiled, or a lockfile.
- The edit is trivial, such as a typo, whitespace, punctuation, version bump, or single-name rename.
- Comments would break parsing, rendering, publishing, copy-paste behavior, or tool ingestion.
- You are only changing imports, package declarations, module declarations, or equivalent boilerplate.

If uncertain whether comments are safe, leave the change unannotated.

## Comment Syntax

Use the comment syntax for the edited region, not just the file extension.

Common forms:

- `// @ai <agent-harness>:<model>` and `// @end-ai`
- `# @ai <agent-harness>:<model>` and `# @end-ai`
- `-- @ai <agent-harness>:<model>` and `-- @end-ai`
- `<!-- @ai <agent-harness>:<model> -->` and `<!-- @end-ai -->`
- `{/* @ai <agent-harness>:<model> */}` and `{/* @end-ai */}` for JSX/TSX markup

## Existing Markers

Do not relabel another agent's unchanged code as yours.

- If editing inside your own same agent-harness/model marker, keep the existing marker.
- If editing inside another agent-harness/model marker and the edit is trivial, keep the existing marker and add no new marker.
- If editing inside another agent-harness/model marker and the edit is substantial, keep the outer marker and add your own nested marker around only your changed subregion.
- If you rewrite the entire marked span, replace the old marker pair with your own marker pair.

Short rule: preserve outer markers, nest only for substantial edits, replace only when you rewrite the whole marked span.

## Style

- Put markers on their own lines. For block-comment syntaxes, close the comment on the same marker line.
- Match surrounding indentation.
- Use lowercase `@ai`, `@end-ai`, agent harness, and model.
- Do not add trailing punctuation to markers.
- Prefer one clear annotated region over many tiny adjacent regions.

## Examples

JavaScript:

```js
// @ai opencode:gpt-5-5
function add(a, b) {
  return a + b
}
// @end-ai
```

HTML:

```html
<!-- @ai opencode:gpt-5-5 -->
<section class="hero">Welcome</section>
<!-- @end-ai -->
```

Nested edit inside another agent's span:

```js
// @ai claude-code:sonnet-4-6
function buildLabel(user) {
  const name = user.name || "Unknown"

  // @ai opencode:gpt-5-5
  const role = user.role?.trim() || "member"
  return `${name} (${role})`
  // @end-ai
}
// @end-ai
```
