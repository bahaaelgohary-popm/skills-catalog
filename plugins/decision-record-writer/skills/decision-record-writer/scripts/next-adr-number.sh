#!/usr/bin/env bash
# Prints the next ADR number (4 digits) for a folder of ADRs named like 0007-some-title.md.
# Read-only: it only lists files. Usage: next-adr-number.sh [adr-folder]
set -u
dir="${1:-docs/adr}"
if [ ! -d "$dir" ]; then
  echo "0001"
  exit 0
fi
last=$(ls "$dir" 2>/dev/null | grep -E '^[0-9]{4}-.*\.md$' | sort | tail -1 | cut -c1-4)
if [ -z "$last" ]; then
  echo "0001"
else
  printf '%04d\n' $((10#$last + 1))
fi
