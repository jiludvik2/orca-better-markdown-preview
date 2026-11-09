#!/bin/sh
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
npm pack pele@1.13.0 --ignore-scripts --silent --pack-destination "$work" >/dev/null
printf '%s  %s\n' '00f879d86c5a6ece897ef70e18fd228a9952bba338a0cb1293b373900d7414bd' "$work/pele-1.13.0.tgz" | shasum -a 256 -c -
tar -xOf "$work/pele-1.13.0.tgz" package/dist/pele.global.js > "$work/pele.global.js"
tar -xOf "$work/pele-1.13.0.tgz" package/LICENSE > "$work/pele.LICENSE"
printf '%s  %s\n' '0b0a46c57a5a6971670c09f5ec4066705bd78505f90fd11adf6260325efa0910' "$work/pele.global.js" '311bccc30de6f7b9cbfb64232bb0c911ccb2191abe316550813ae25b2c7925b9' "$work/pele.LICENSE" | shasum -a 256 -c -
cp "$work/pele.global.js" "$root/lib/pele.global.js"
cp "$work/pele.LICENSE" "$root/lib/pele.LICENSE"
