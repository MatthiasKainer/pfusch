#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SRC="$ROOT/pfusch.js"
MIN="$ROOT/pfusch.min.js"
README="$ROOT/Readme.md"

rm -f "$MIN"

echo "Building minified bundle..."
npx -y terser "$SRC" --module --compress --mangle > "$MIN"

raw_size=$(LC_ALL=C ls -lh "$MIN" | awk '{print $5}')

gzip -k -9 "$MIN"
gzip_size=$(LC_ALL=C ls -lh "${MIN}.gz" | awk '{print $5}')
rm -f "${MIN}.gz"

loc_count=$(wc -l < "$SRC" | tr -d '[:space:]')

perl -0pi -e "s/loc-\\d+-green/loc-${loc_count}-green/" "$README"
perl -0pi -e "s/size-[0-9.]+[KMG]?(-green)/size-${raw_size}\\1/" "$README"
perl -0pi -e "s/gzipped-[0-9.]+[KMG]?(-green)/gzipped-${gzip_size}\\1/" "$README"

echo "Updated ${README} badges to LOC ${loc_count}, size ${raw_size}, gzipped ${gzip_size}"
echo "Minified file at ${MIN}"
