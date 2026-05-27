#!/usr/bin/env bash
# Download Cloud Comfort PDP media by color (run from repo root)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/scripts/cloud-comfort-media.json"
OUT="$ROOT/scripts/product-media/cloud-comfort"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install with: brew install jq"
  exit 1
fi

mkdir -p "$OUT"

for COLOR in White Pink Lavender Black; do
  DIR="$OUT/$(echo "$COLOR" | tr '[:upper:]' '[:lower:]')"
  mkdir -p "$DIR"
  echo "Downloading $COLOR ..."
  idx=0
  while IFS= read -r row; do
    url=$(echo "$row" | jq -r '.url')
    type=$(echo "$row" | jq -r '.type')
    idx=$((idx + 1))
    num=$(printf '%02d' "$idx")
    if [[ "$type" == "video" ]]; then
      ext="mp4"
    else
      ext="jpg"
    fi
    out="$DIR/${num}.${ext}"
    if [[ -f "$out" ]]; then
      echo "  skip $out"
      continue
    fi
    curl -fsSL "$url" -o "$out"
    echo "  $out"
  done < <(jq -c --arg c "$COLOR" '.colors[$c][]' "$MANIFEST")
done

echo ""
echo "Done. Files in: $OUT"
find "$OUT" -type f | wc -l | xargs echo "Total files:"
