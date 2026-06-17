# Animal360 Architecture and Org Review - 2026-06-16

## Scope

Reviewed the full local Salesforce DX workspace, project documentation, quality gates, deployed metadata in the connected `animal360` org, and representative runtime data.

Connected org:

- Alias: `animal360`
- Org name: `Love 4 Animals`
- Username: `storm.c55da5b5b54501@salesforce.com`
- Org ID: `00DJ6000002GiWwMAK`
- Instance: `https://storm-c55da5b5b54501.my.salesforce.com`
- Org API: 67.0
- Source API: 66.0

The local working tree was already dirty at review time in several Apex classes, two flows, `.gitignore`, and `.prettierignore`. This review treats the current filesystem as the reviewed source of truth.

## Executive Findings

1. The Animal360 source package is broadly aligned with the real org for the app-owned metadata. All major local Animal360 metadata categories checked were present in the org.
2. The architecture is coherent: Phase I operations, Phase II welfare evidence, metadata-driven assessment templates, service-backed Apex, LWC surfaces, reporting, and permission-set personas are all represented.
3. The real org is operationally incomplete for Phase II: welfare/care-plan metadata is deployed and seeded, but there is no runtime welfare assessment, observation, domain summary, care plan, or care plan action data.
4. CI is not yet a Salesforce release gate. It runs formatting, LWC lint, and LWC Jest only; Apex tests, deployment validation, and Code Analyzer are not enforced in GitHub Actions.
5. Security posture is headed in the right direction with user-mode Apex access, but the screen flows run in system mode with sharing and accept raw user-entered IDs/strings, which deserves hardening before broader rollout.
6. Persona access exists in metadata, but the real org currently has only two direct Animal360 permission assignments for the admin user. There is no evidence of assessor, care manager, clinical, or read-only persona assignments in the connected org.
7. Documentation is useful but had drifted in tab counts, layout ownership, and security model details; Workstream E updated those areas and retrieved the estate-map runtime layouts into source.

## Repository Architecture

The app is a single-package Salesforce DX project rooted at `force-app`, with no namespace and source API 66.0.

Main source inventory:

| Category                         | Local count |
| -------------------------------- | ----------: |
| Runtime custom objects           |          21 |
| Custom metadata type definitions |           9 |
| Custom metadata records          |          53 |
| Permission sets                  |           7 |
| Permission set groups            |           5 |
| Custom permissions               |           4 |
| Flows                            |          11 |
| Apex classes                     |          16 |
| Apex triggers                    |           6 |
| LWC bundles                      |           3 |
| FlexiPages                       |           2 |
| Layouts                          |          21 |
| Report types                     |           8 |
| Reports                          |          10 |
| Custom tabs                      |          12 |
| Global value sets                |          14 |
| Validation rules                 |          12 |

The core architecture follows the docs:

- Phase I: animal intake, episodes, location stays, housing units, identifiers, relationships, intake events, outcome events, current-state rollups.
- Phase II: welfare assessments, observations, domain summaries, metadata-driven templates, care plans, clinical events, human-animal interactions, reminders.
- Estate map: `A360_Estate_Map__c`, `A360_Map_Area__c`, `A360_Map_Connection__c`, app page, and LWC whiteboard.
- Security: permission sets and permission set groups rather than profile-centric access.
- Runtime templates: custom metadata drives seeded runtime `Assessment_Template__c`, `Template_Domain_Definition__c`, and `Template_Indicator_Assignment__c` records.

## Org Comparison

The app-owned local metadata is present in the connected org:

| Metadata type            | Local | Matching relevant org items | Missing in org |
| ------------------------ | ----: | --------------------------: | -------------- |
| CustomObject             |    30 |                          30 | None           |
| CustomField              |   306 |                         306 | None           |
| ValidationRule           |    12 |                          12 | None           |
| Flow                     |    11 |                          11 | None           |
| LightningComponentBundle |     3 |                           3 | None           |
| CustomTab                |    12 |                          12 | None           |
| FlexiPage                |     2 |                           2 | None           |
| PermissionSet            |     7 |                           7 | None           |
| PermissionSetGroup       |     5 |                           5 | None           |
| CustomPermission         |     4 |                           4 | None           |
| GlobalValueSet           |    14 |                          14 | None           |
| ReportType               |     8 |                           8 | None           |
| Layout                   |    21 |                          21 | None           |
| ApexClass                |    16 |                          16 | None           |
| ApexTrigger              |     6 |                           6 | None           |
| CustomApplication        |     1 |                           1 | None           |
| Report                   |    10 |                          10 | None           |

Layout source-control decision:

- Retrieved and source-controlled the three estate-map runtime object layouts because those objects have tabs/user-facing administration surfaces and the rest of the runtime object model already keeps layouts in source:
  - `A360_Estate_Map__c-Estate Map Layout`
  - `A360_Map_Area__c-Map Area Layout`
  - `A360_Map_Connection__c-Map Connection Layout`
- Left custom metadata type layouts out of source intentionally. They are generated/admin-maintenance surfaces in the connected org, not runtime user experience metadata.
- The org contains many unrelated/sample/managed assets, including `qbranch__*`, `xdo__*`, and other standard/industry/demo metadata. Keep package boundaries explicit to avoid accidental retrieval or dependency creep.

Deployment validation:

- Check-only manifest deploy succeeded against `animal360`.
- 522 components validated.
- 0 component errors.
- Warnings only for standard objects referenced by source but not represented locally as object XML: `Account`, `Case`, `Contact`.
- The deploy response reported 0 tests run despite `--test-level RunLocalTests`; Apex tests were therefore run separately.

## Runtime Org State

Seed/runtime data in the connected org:

| Object                                       | Count |
| -------------------------------------------- | ----: |
| `Assessment_Template__c`                     |     1 |
| `Template_Domain_Definition__c`              |     5 |
| `Template_Indicator_Assignment__c`           |     6 |
| `Animal360_Assessment_Template_Default__mdt` |     1 |
| `Animal360_Domain_Definition__mdt`           |     5 |
| `Animal360_Indicator_Definition__mdt`        |     6 |
| `Animal360_Indicator_Value_Option__mdt`      |    21 |
| `Animal360_Risk_Rule__mdt`                   |     6 |
| `Animal360_Automation_Setting__mdt`          |     1 |
| `Animal360_Species_Template__mdt`            |     3 |

Operational data:

| Object                    | Count |
| ------------------------- | ----: |
| `Animal__c`               |    11 |
| `Animal_Episode__c`       |    11 |
| `Animal_Location_Stay__c` |    35 |
| `Animal_Identifier__c`    |     0 |
| `Intake_Event__c`         |     2 |
| `Outcome_Event__c`        |     2 |
| `A360_Estate_Map__c`      |     1 |
| `A360_Map_Area__c`        |     8 |
| `A360_Map_Connection__c`  |     5 |

Phase II runtime data:

| Object                      | Count |
| --------------------------- | ----: |
| `Welfare_Assessment__c`     |     0 |
| `Welfare_Observation__c`    |     0 |
| `Welfare_Domain_Summary__c` |     0 |
| `Care_Plan__c`              |     0 |
| `Care_Plan_Action__c`       |     0 |

Scheduled automation:

- No `CronTrigger` entries matched `A360%` or `%Review%`.
- `A360_Review_Due_Reminder_Flow` is deployed and active, but not scheduled in this org.

Permission assignments:

- `Animal360_Admin` assigned to `storm.c55da5b5b54501@salesforce.com`.
- `Animal360_Estate_Map_Manager` assigned to `storm.c55da5b5b54501@salesforce.com`.
- No connected-org assignments were found for the assessor, care manager, clinical user, read-only, or permission-set-group personas.

Person Accounts:

- Person Accounts are enabled.
- `Business_Account` and `PersonAccount` record types are active.
- `IsPersonAccount`, `PersonContactId`, `PersonEmail`, and `PersonMobilePhone` are available.

## Quality Gates

Local checks:

| Check                           | Result                                               |
| ------------------------------- | ---------------------------------------------------- |
| `npm run lint`                  | Passed                                               |
| `npm test`                      | Passed, 3 LWC suites / 15 tests                      |
| `npm run prettier:verify`       | Passed                                               |
| Apex tests in `animal360`       | Passed, 34/34                                        |
| Apex org-wide coverage          | 84%                                                  |
| Apex test-run coverage          | 92%                                                  |
| Code Analyzer recommended rules | 1031 findings: 79 moderate, 952 low, 0 high/critical |
| Check-only manifest deploy      | Succeeded, 0 component errors                        |

Code Analyzer strongest signals:

- 25 flow warnings for user-controlled data passed into database elements in system-context flows.
- 40 Apex complexity findings across service classes.
- 32 test methods/classes flagged for missing `System.runAs` persona coverage.
- 821 SLDS2 hardcoded-value warnings and 17 token/hook migration warnings, mostly LWC styling debt.
- 65 ApexDoc findings.
- 6 trigger logic warnings; these are lower signal because the triggers delegate into handlers/services.

LWC test warnings:

- Deprecated test-wire adapter usage in `a360AnimalVisualPanel` and `a360EstateMap` tests.

## Priority Opportunities

### P1 - Put Salesforce validation into CI

Current GitHub Actions CI only runs Node-oriented checks:

- Prettier
- LWC lint
- LWC Jest

It does not run:

- Apex tests
- check-only deployment validation
- Salesforce Code Analyzer
- permission/persona smoke tests

Recommendation:

- Add Salesforce CLI setup/auth in CI.
- Run `sf project deploy start --dry-run -x manifest/package.xml`.
- Run `sf apex run test --test-level RunLocalTests --code-coverage`.
- Run Code Analyzer with a committed config and publish JSON output as an artifact.
- Fail CI on severity 1/2 findings immediately, and ratchet severity 3 findings over time.

### P1 - Harden screen flows before broader user rollout

The user-facing screen flows run in `SystemModeWithSharing`:

- `A360_Intake_Flow`
- `A360_Move_Animal_Flow`
- `A360_Close_Episode_Flow`
- `A360_Welfare_Assessment_Flow`

The first three accept raw string inputs for record IDs and picklist-like values, then write records. Code Analyzer flags these paths because user-controlled values flow into DB elements in system context.

Recommendation:

- Replace raw ID text inputs with record-choice components, lookup screen components, or LWC-backed selectors.
- Validate picklist values through actual choices instead of free text.
- Consider moving write-heavy flow behavior behind invocable Apex methods that use explicit `WITH USER_MODE` and `Database.*(..., AccessLevel.USER_MODE)`.
- Add persona-based flow tests/manual smoke scripts for users with only the intended permission sets.

### P1 - Exercise real Phase II workflows in the org

Phase II metadata and seed records are deployed, but there are no runtime welfare assessments, observations, summaries, care plans, or care-plan actions in the connected org.

Recommendation:

- Seed a realistic welfare assessment scenario for at least one animal/episode.
- Verify template resolution, assessment save, risk evaluation, care-plan auto-create, review reminders, and reports end to end.
- Add a repeatable script or documented smoke-test path for Phase II demo/regression data.

### P2 - Complete persona assignment and access testing

The metadata includes 7 permission sets, 5 permission set groups, and 4 custom permissions. The connected org currently assigns only `Animal360_Admin` and `Animal360_Estate_Map_Manager`, both to the admin user.

Recommendation:

- Create or identify users for assessor, care manager, clinical user, read-only, estate map viewer, and estate map manager.
- Assign permission set groups rather than individual permission sets where possible.
- Add Apex `System.runAs` tests and UI/API smoke checks for each persona.
- Validate object CRUD, field-level security, custom permissions, flow access, and LWC/Apex user-mode behavior.

### P2 - Keep layout ownership explicit

The estate-map object layouts have been retrieved into source because they support user-facing runtime objects with tabs and admin surfaces. Custom metadata type layouts remain intentionally org-only because they are generated/admin-maintenance surfaces and do not define the application runtime experience.

Recommendation:

- Keep the three estate-map layouts under source control with the other runtime object layouts.
- Continue excluding custom metadata type layouts unless a future release adds a packaged admin UX requirement for those pages.
- Avoid broad layout retrieval from this org because it contains unrelated/sample/managed assets.

### P2 - Schedule or explicitly operationalize review reminders

`A360_Review_Due_Reminder_Flow` is active, but there is no scheduled job in the org. The docs say scheduling is org-specific, which is reasonable, but the connected org currently has no reminder runtime.

Recommendation:

- Use `docs/review-reminder-operations.md` as the post-install operations guide.
- Run `scripts/check-review-reminder-schedule.sh --target-org animal360` during release validation to confirm whether the target org has an active review-reminder cadence.
- Either schedule a daily org-level wrapper flow for `A360_Review_Due_Reminder_Flow` or explicitly record that reminders are manual during the pilot.

### P2 - Reduce service complexity in the highest-change areas

The architecture uses appropriate service classes, but several methods have high cyclomatic/cognitive complexity:

- `A360AssessmentPersistenceService.saveAssessments`
- `A360CarePlanService.createPlans`
- `A360AnimalIntegrityService.validateLocationStays`
- `A360AnimalRollupService.rollupAnimals`
- `A360AssessmentRiskService.evaluateAssessments`
- `A360AssessmentTemplateService.buildTemplateDefinition`
- `A360EstateMapService` overall

Recommendation:

- Refactor only around active change pressure.
- Extract validation/normalization/calculation helpers where tests already exist.
- Add focused tests before refactoring behavior-heavy methods.

### P3 - Keep documentation drift contained

Resolved in Workstream E:

- Updated `docs/application-inventory.md` from 10 to 12 custom tabs and added `A360_Estate_Map__c` plus `Animal360_Estate_Whiteboard`.
- Updated layout count from 18 to 21 after retrieving the three estate-map runtime layouts.
- Updated `docs/animal360-architecture-data-model.md` from 5 to 7 permission sets and from 2 to 4 custom permissions.
- Added the five permission set groups and estate-map permission model to the docs.

Recommendation:

- Update inventory counts from source automatically or add a script/check.
- Add estate map security details to the architecture document.
- Keep the source/org comparison table as a living release checklist.

### P3 - Address UI modernization debt

Code Analyzer reports SLDS2 token/hook migration debt across LWC CSS. This is not blocking today, but it will become expensive if the UI grows before styling conventions are stabilized.

Recommendation:

- Normalize LWC styling around SLDS hooks/tokens.
- Replace deprecated LWC Jest wire adapters.
- Add visual smoke tests for the estate map and welfare assessment entry surfaces if those are core demos.

## Recommended Next Sequence

1. Add CI Salesforce gates: deploy dry-run, Apex tests, Code Analyzer artifact.
2. Assign/test persona users in the connected org.
3. Build a Phase II end-to-end smoke dataset and run assessment-to-care-plan flow.
4. Harden screen flow inputs and execution boundaries.
5. Keep the retrieved estate-map layouts under source control and continue excluding generated custom metadata layouts.
6. Keep documentation counts/security model current with source/org checks.
7. Ratchet Code Analyzer findings after the functional gates are in place.
