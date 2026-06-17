#!/usr/bin/env bash
set -euo pipefail

TARGET_ORG="${SF_TARGET_ORG:-animal360}"

usage() {
  cat <<'USAGE'
Usage: scripts/check-review-reminder-schedule.sh [-o|--target-org ALIAS]

Checks the target org for scheduled jobs related to Animal360 review reminders.
The packaged reminder flow is intentionally org-scheduled, so this script reports
status without creating or modifying jobs.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--target-org)
      TARGET_ORG="$2"
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

sf data query \
  --target-org "$TARGET_ORG" \
  --query "SELECT Id, CronJobDetail.Name, State, NextFireTime, PreviousFireTime FROM CronTrigger WHERE CronJobDetail.Name LIKE 'A360%' OR CronJobDetail.Name LIKE '%Review%' ORDER BY CronJobDetail.Name" \
  --json
