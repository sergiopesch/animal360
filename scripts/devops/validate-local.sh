#!/usr/bin/env bash
set -euo pipefail

TARGET_ORG="${SF_TARGET_ORG:-animal360}"
RUN_SALESFORCE=false
RUN_SMOKE=false

usage() {
  cat <<'USAGE'
Usage: scripts/devops/validate-local.sh [options]

Runs local validation gates. Salesforce gates are opt-in because they require an
authenticated org and take longer.

Options:
  --salesforce          Run Code Analyzer, Apex tests, and check-only deploy.
  --smoke               Run the Phase II smoke script with cleanup-after. Implies --salesforce.
  -o, --target-org ORG  Salesforce org alias/username. Defaults to SF_TARGET_ORG or animal360.
  -h, --help            Show this help.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --salesforce)
      RUN_SALESFORCE=true
      shift
      ;;
    --smoke)
      RUN_SALESFORCE=true
      RUN_SMOKE=true
      shift
      ;;
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

timestamp() {
  date +%Y%m%d-%H%M%S
}

echo "== Local gates =="
npm run prettier:verify
npm run lint
npm test

if [[ "$RUN_SALESFORCE" != true ]]; then
  echo "Local validation complete. Add --salesforce for org-backed gates."
  exit 0
fi

echo "== Salesforce gates (${TARGET_ORG}) =="
sf org display --target-org "$TARGET_ORG" --json >/dev/null

mkdir -p artifacts/code-analyzer artifacts/apex-tests artifacts/deploy

CA_STAMP="$(timestamp)"
sf code-analyzer run \
  --config-file code-analyzer.yml \
  --rule-selector Recommended \
  --workspace . \
  --target force-app \
  --severity-threshold 2 \
  --output-file "artifacts/code-analyzer/code-analyzer-results-${CA_STAMP}.json" \
  2>&1 | tee "artifacts/code-analyzer/code-analyzer-${CA_STAMP}.log"

APEX_STAMP="$(timestamp)"
sf apex run test \
  --target-org "$TARGET_ORG" \
  --test-level RunLocalTests \
  --code-coverage \
  --result-format json \
  --wait 60 \
  >"artifacts/apex-tests/apex-test-results-${APEX_STAMP}.json"

DEPLOY_STAMP="$(timestamp)"
sf project deploy start \
  --target-org "$TARGET_ORG" \
  --manifest manifest/package.xml \
  --dry-run \
  --test-level RunLocalTests \
  --wait 60 \
  --json \
  >"artifacts/deploy/manifest-dry-run-${DEPLOY_STAMP}.json"

if [[ "$RUN_SMOKE" == true ]]; then
  scripts/phase2-smoke/run.sh --target-org "$TARGET_ORG" --cleanup-after
fi

echo "Validation complete."
