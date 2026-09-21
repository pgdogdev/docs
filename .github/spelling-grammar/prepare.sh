#!/usr/bin/env bash
set -euo pipefail

git diff --no-ext-diff --no-textconv --no-color --find-renames \
  --diff-filter=AMR --unified=3 "$BASE_SHA...$HEAD_SHA" \
  -- '*.md' > "$RUNNER_TEMP/prose.diff"
if [ ! -s "$RUNNER_TEMP/prose.diff" ]; then
  echo "No Markdown changes to check." >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi
echo 'changed=true' >> "$GITHUB_OUTPUT"
cat .github/spelling-grammar/prompt.txt "$RUNNER_TEMP/prose.diff" \
  > "$RUNNER_TEMP/grammar-prompt.txt"
