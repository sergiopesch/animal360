# Phase II Smoke Procedure

This smoke path proves the Phase II workflow can run against a real org or a scratch org without deploying extra Apex:

1. Seed or verify the managed assessment template rows.
2. Create an isolated smoke animal and current episode.
3. Save a completed welfare assessment through `A360AssessmentPersistenceService`.
4. Evaluate risk through `A360AssessmentRiskService`.
5. Create a care plan through `A360CarePlanService`.
6. Verify the assessment, episode, animal rollup, care plan, action, observation, and domain summary records.

## Run

From the repository root:

```bash
scripts/phase2-smoke/run.sh --target-org animal360
```

The script defaults to `animal360` unless `SF_TARGET_ORG` is set. It pre-cleans prior smoke data created by the same running user, creates a new smoke dataset, validates the expected Critical risk path, and leaves the records in place for inspection.

For CI or scratch-org validation where no records should remain:

```bash
scripts/phase2-smoke/run.sh --target-org animal360 --cleanup-after
```

To remove smoke data only:

```bash
scripts/phase2-smoke/run.sh --target-org animal360 --cleanup-only
```

## Safety Model

Cleanup only targets `Animal__c` records created by the running Salesforce user with `Display_Name__c` beginning with `A360 Phase II Smoke Animal`. Dependent Phase II records linked to those smoke animals and episodes are deleted in child-to-parent order:

- `Care_Plan_Action__c`
- `Care_Plan__c`
- `Welfare_Observation__c`
- `Welfare_Domain_Summary__c`
- `Welfare_Assessment__c`
- `Animal_Episode__c`
- `Animal__c`

The smoke script does not modify existing operational animals, episodes, assessments, or care plans.

## Expected Result

`sf apex run` should complete successfully and emit a debug line beginning with `A360_PHASE2_SMOKE_RESULT`. The JSON payload includes the created record IDs and these expected values:

- `overallConcern`: `Critical`
- `episodeWelfareLevel`: `Critical`
- `episodeClinicalPriority`: `Emergency`
- `animalWelfareRisk`: `Critical`
- `observationCount`: `1`
- `domainSummaryCount`: `1`
- `carePlanActionCount`: `1`

The cleanup script emits `A360_PHASE2_SMOKE_CLEANUP` with deleted record counts.
