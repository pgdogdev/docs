#!/bin/bash
set -eo pipefail

PGDOG_IMAGE="${PGDOG_IMAGE:-ghcr.io/pgdogdev/pgdog-enterprise:main-ent}"

docker run --rm \
  -v /tmp:/tmp \
  "$PGDOG_IMAGE" \
  /usr/local/bin/pgdog "$@"
