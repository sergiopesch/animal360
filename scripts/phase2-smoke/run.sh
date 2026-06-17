#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ORG="${SF_TARGET_ORG:-animal360}"
PRE_CLEAN=true
CLEANUP_AFTER=false
CLEANUP_ONLY=false

usage() {
  cat <<'USAGE'
Usage: scripts/phase2-smoke/run.sh [options]

Runs an org-safe Phase II smoke path:
  welfare assessment -> risk evaluation -> care plan creation.

Options:
  -o, --target-org ALIAS   Target org alias or username. Defaults to SF_TARGET_ORG or animal360.
      --cleanup-only       Delete smoke records for the running user and exit.
      --cleanup-after      Delete the newly-created smoke records after validation.
      --no-pre-clean       Do not delete prior smoke records before running.
  -h, --help               Show this help.

The cleanup scripts only target Animal__c rows named "A360 Phase II Smoke Animal%"
that were created by the running Salesforce user, then remove their dependent
Phase II records.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--target-org)
      TARGET_ORG="$2"
      shift 2
      ;;
    --cleanup-only)
      CLEANUP_ONLY=true
      shift
      ;;
    --cleanup-after)
      CLEANUP_AFTER=true
      shift
      ;;
    --no-pre-clean)
      PRE_CLEAN=false
      shift
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

run_apex() {
  local apex_file="$1"
  sf apex run --target-org "$TARGET_ORG" --file "$apex_file"
}

if [[ "$CLEANUP_ONLY" == true ]]; then
  run_apex "$SCRIPT_DIR/cleanup.apex"
  exit 0
fi

if [[ "$PRE_CLEAN" == true ]]; then
  run_apex "$SCRIPT_DIR/cleanup.apex"
fi

run_apex "$SCRIPT_DIR/run.apex"

if [[ "$CLEANUP_AFTER" == true ]]; then
  run_apex "$SCRIPT_DIR/cleanup.apex"
fi
