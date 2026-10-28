#!/usr/bin/env bash
# Read-only health check of a git repository. Usage: health-check.sh [repo-path]
# Only reads files and runs read-only git commands; it never changes anything.
set -u
repo="${1:-.}"
cd "$repo" 2>/dev/null || { echo "Cannot open $repo"; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "$repo is not a git repository"; exit 1; }

echo "== Repository"
echo "Path: $(git rev-parse --show-toplevel)"
echo "Branch: $(git branch --show-current 2>/dev/null || echo detached)"
echo "Last commit: $(git log -1 --format='%cs %s' 2>/dev/null || echo none)"

echo
echo "== Basics"
for f in README.md README LICENSE LICENSE.md .gitignore; do
  if [ -e "$f" ]; then echo "present  $f"; fi
done
[ -e README.md ] || [ -e README ] || echo "missing  README"
[ -e LICENSE ] || [ -e LICENSE.md ] || echo "missing  LICENSE"
[ -e .gitignore ] || echo "missing  .gitignore"
if [ -d .github/workflows ] || [ -e .gitlab-ci.yml ] || [ -e Jenkinsfile ] || [ -e azure-pipelines.yml ]; then
  echo "present  CI configuration"
else
  echo "missing  CI configuration"
fi

echo
echo "== Large tracked files (over 5 MB)"
git ls-files -z | while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  size=$(wc -c < "$f" | tr -d ' ')
  if [ "$size" -gt 5242880 ]; then echo "$((size / 1048576)) MB  $f"; fi
done

echo
echo "== Branches not updated in 90+ days"
cutoff=$(( $(date +%s) - 90 * 86400 ))
git for-each-ref --format='%(committerdate:unix) %(committerdate:short) %(refname:short)' refs/heads refs/remotes |
  while read -r ts day name; do
    [ "$ts" -lt "$cutoff" ] && echo "$day  $name"
  done

echo
echo "== Branches already merged into the current branch"
git branch --merged 2>/dev/null | grep -v '^\*' | sed 's/^ */  /'

echo
echo "== TODO / FIXME markers"
count=$(git grep -I -n -w -E 'TODO|FIXME' 2>/dev/null | wc -l | tr -d ' ')
echo "Total: $count"
git grep -I -n -w -E 'TODO|FIXME' 2>/dev/null | head -10

echo
echo "== Uncommitted changes"
git status --short | head -20
[ -z "$(git status --porcelain)" ] && echo "None"
exit 0
