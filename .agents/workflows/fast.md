---
description: Defines fast execution as targeted exploration and minimal implementation while preserving correctness. It reduces unnecessary investigation but never bypasses rules, security, root-cause analysis, or verification.
---

# Agent Execution Rules — Scoped, Fast, Architecture-Aligned

## 1. Scope Lock (read first, every task)
- Before writing any code, restate the task in one sentence and list the **exact files/functions** you believe are relevant.
- Do NOT scan the entire codebase. Only open files that are:
  1. Directly named/referenced in the task, OR
  2. Direct imports/dependents of the file(s) in (1), OR
  3. Explicitly pointed to by the user.
- If you're unsure which file owns the feature, ask me to point to it OR search only by the specific keyword/function/component name the task mentions — not a broad architecture sweep.
- Never open, "review," or "align" files outside this scope unless the task explicitly asks for a refactor/architecture pass.

## 2. No Silent Extra Changes
- Only touch the lines required to satisfy the stated requirement.
- Do NOT: rename variables, reformat unrelated code, "improve" unrelated logic, add comments/docstrings, update unrelated imports, or fix unrelated bugs you notice — unless explicitly asked.
- If you spot an unrelated issue, **list it separately at the end of your response** as a suggestion. Do not implement it.
- Every file you touch must have a one-line reason tied directly to the task.

## 3. Plan Before Code
- Output a short plan first: files to change, what changes in each, and why.
- Wait for my go-ahead only if the change touches more than 2 files or any shared/core module. Otherwise proceed directly.

## 4. Match Existing Architecture & Style
- Before implementing, identify the existing pattern used nearby (naming convention, folder structure, state management pattern, error handling style, existing utility functions) and follow it exactly.
- Do NOT introduce a new library, pattern, or abstraction if an existing equivalent is already used in this codebase.
- If the "correct" pattern is ambiguous, ask a single clarifying question instead of guessing across multiple files.

## 5. Speed Rules
- Do not re-read files you've already opened in this session unless they were changed.
- Do not run full-project searches for common/generic keywords (e.g. "data", "handler", "service") — always scope search terms to the specific feature name/component.
- Prefer targeted grep/symbol search over directory-by-directory exploration.
- Batch related edits in one pass instead of multiple incremental edit cycles.

## 6. Output Discipline
- Show a diff-style summary of changes (file → what changed), not the full file, unless the file is new or fully rewritten.
- End every response with:
  - ✅ Files changed (list)
  - ⛔ Files intentionally left untouched but considered (list + why)
  - 💡 Unrelated issues spotted (not implemented)

## 7. Hard Stops — Ask Before Proceeding
Ask me before proceeding if the task would require:
- Changing a shared/core/global file used by multiple features
- Adding a new dependency/library
- Changing a public API, schema, or data contract
- Deleting existing functionality