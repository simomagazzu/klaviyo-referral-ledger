#!/usr/bin/env bash
# Regenerate .cursor/rules/project.mdc from AGENTS.md
# Cursor requires its own .mdc format with YAML frontmatter — can't symlink directly.
# Run this after editing AGENTS.md.

set -e
cd "$(dirname "$0")/.."

OUT=".cursor/rules/project.mdc"
mkdir -p .cursor/rules

{
  cat <<'FRONTMATTER'
---
description: Project rules for create-app-like-simo boilerplate
globs: ["**/*"]
alwaysApply: true
---

FRONTMATTER
  cat AGENTS.md
} > "$OUT"

echo "Wrote $OUT from AGENTS.md ($(wc -l < AGENTS.md) lines)"
