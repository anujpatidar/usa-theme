#!/usr/bin/env bash
# Upload Active Casual Sneakers (men's) PDP gallery from CDN URLs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/scripts"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "DRY_RUN=1 — preview only"
  DRY_RUN=1 node upload-product-media-from-urls.mjs active-casual-sneakers-mens-media.json
else
  node upload-product-media-from-urls.mjs active-casual-sneakers-mens-media.json
fi
