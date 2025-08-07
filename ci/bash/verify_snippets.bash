#!/bin/bash
set -euo pipefail

OUTPUT_DIRECTORY="${PWD}/ci/tmp"

# const DOCKER_IMAGE = "ghcr.io/pgdogdev/pgdog:main";
DOCKER_IMAGE="ghcr.io/pgdogdev/pgdog:main@sha256:3036d2ac7b684643dd187c42971f003f9d76e5f54cd129dcba742c309d7debd0"

# nuke previous snippets
rm -rf "$OUTPUT_DIRECTORY"
mkdir -p "$OUTPUT_DIRECTORY"

# Pull image once
docker pull "$DOCKER_IMAGE"

# Run one container and do all checks inside it
docker run --rm \
  -v "$OUTPUT_DIRECTORY":/ci/tmp \
  "$DOCKER_IMAGE" \
  sh -euc '
    ANY_FAILED=0

    for toml in /ci/tmp/*.toml; do
      [ -f "$toml" ] || continue

      orig=$(head -n1 "$toml" | sed "s/# file: //")
      line=$(head -n2 "$toml" | tail -n1 | sed "s/# line_number: //")

      if pgdog configcheck --config "$toml" >/dev/null 2>&1 \
         || pgdog configcheck --users   "$toml" >/dev/null 2>&1; then
        echo "${orig}:${line} verified successfully"
      else
        echo "Validation failed for ${orig}:${line}" >&2
        ANY_FAILED=1
      fi
    done

    if [ "$ANY_FAILED" -eq 1 ]; then
      echo "Some snippets failed verification!" >&2
      exit 1
    else
      echo "All snippets verified successfully!"
      exit 0
    fi
  '
