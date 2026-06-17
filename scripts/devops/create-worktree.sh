#!/usr/bin/env bash
set -euo pipefail

BASE_REF="HEAD"
WORKTREE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BRANCH_PREFIX="codex"

usage() {
  cat <<'USAGE'
Usage: scripts/devops/create-worktree.sh WORK_NAME [options]

Creates an isolated git worktree for parallel Animal360 work.

Options:
  --base REF          Base ref for the new branch. Defaults to HEAD.
  --root DIR          Directory that will contain the worktree. Defaults to the parent of this repo.
  --prefix PREFIX     Branch prefix. Defaults to codex.
  -h, --help          Show this help.

Example:
  scripts/devops/create-worktree.sh phase2-smoke-hardening
USAGE
}

if [[ $# -eq 0 ]]; then
  usage >&2
  exit 2
fi

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  usage
  exit 0
fi

WORK_NAME="$1"
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_REF="$2"
      shift 2
      ;;
    --root)
      WORKTREE_ROOT="$2"
      shift 2
      ;;
    --prefix)
      BRANCH_PREFIX="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

SLUG="$(printf '%s' "$WORK_NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//')"
if [[ -z "$SLUG" ]]; then
  echo "Work name must contain at least one alphanumeric character." >&2
  exit 2
fi

BRANCH_NAME="${BRANCH_PREFIX}/${SLUG}"
WORKTREE_PATH="${WORKTREE_ROOT%/}/animal360-${SLUG}"

if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  echo "Branch already exists: ${BRANCH_NAME}" >&2
  exit 1
fi

if [[ -e "$WORKTREE_PATH" ]]; then
  echo "Worktree path already exists: ${WORKTREE_PATH}" >&2
  exit 1
fi

git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_REF"

cat <<EOF
Created worktree:
  path:   ${WORKTREE_PATH}
  branch: ${BRANCH_NAME}
  base:   ${BASE_REF}

Next:
  cd "${WORKTREE_PATH}"
  npm ci
  scripts/devops/validate-local.sh
EOF
