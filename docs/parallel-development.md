# Parallel Development Workflow

Use isolated worktrees for parallel Animal360 work. Avoid stacking unrelated edits directly on `main`; this keeps Codex agents and humans from overwriting each other.

## Current Repo Rule

- One task per branch.
- One branch per worktree.
- Keep ownership clear: docs, CI, flows, Apex, LWC, and scripts should be assigned before implementation starts.
- Do not revert files you did not intentionally change.
- Before handoff, run at least local validation.

## Create A Worktree

From the main checkout:

```bash
scripts/devops/create-worktree.sh my-task-name
```

This creates:

- branch: `codex/my-task-name`
- worktree: `../animal360-my-task-name`

Use a specific base when needed:

```bash
scripts/devops/create-worktree.sh my-task-name --base origin/main
```

## Validate Before Handoff

Fast local checks:

```bash
scripts/devops/validate-local.sh
```

Org-backed checks:

```bash
scripts/devops/validate-local.sh --salesforce --target-org animal360
```

Full smoke path:

```bash
scripts/devops/validate-local.sh --salesforce --smoke --target-org animal360
```

## Handoff Checklist

Include this in PRs or agent final messages:

- Branch/worktree name.
- Files owned and changed.
- Validation commands run.
- Any skipped validation and why.
- Any org setup needed, such as `SF_AUTH_URL` or scheduled review reminders.

## Conflict Avoidance

- Flows and layouts are high-conflict XML files. Assign each flow/layout to one worker.
- Apex service and test changes should be paired when possible.
- CI and package metadata should have a single owner per change set.
- Generated artifacts under `artifacts/`, Salesforce caches, and analyzer/test JSON outputs should stay untracked.
