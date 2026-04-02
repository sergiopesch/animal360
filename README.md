# animal360

`animal360` is a single-package Salesforce DX application for animal welfare organisations. It combines Phase I operational workflows with the Phase II Welfare Evidence MVP so teams can manage animal intake and episode lifecycle, capture structured welfare evidence, evaluate risk, and coordinate follow-up care in Salesforce.

## Current Scope

The repository currently includes:

- Phase I operational foundations:
  - animal and episode records
  - housing and location-stay tracking
  - intake, move, and closeout screen flows
  - shared current-state rollup services
- Phase II welfare evidence foundations:
  - metadata-driven assessment template configuration
  - runtime assessment templates and template assignment records
  - `Welfare_Assessment__c`, `Welfare_Domain_Summary__c`, and `Welfare_Observation__c`
  - `Care_Plan__c`, `Care_Plan_Action__c`, `Clinical_Event__c`, and `Human_Animal_Interaction__c`
  - the `a360WelfareAssessmentEntry` LWC-assisted assessment flow
  - risk evaluation, care-plan auto-create, and review-reminder automation
  - Phase II report types, starter reports, and permission-set updates

## Repository Layout

- `force-app/main/default`: primary Salesforce metadata and source
- `docs`: implementation assumptions and delivery backlog documents
- `scripts`: metadata generation helpers and small CLI support assets
- `manifest/package.xml`: deployable metadata manifest for the current package scope

## Key Entry Points

Main user-facing or operational automation entry points in the repo include:

- `A360_Intake_Flow`
- `A360_Move_Animal_Flow`
- `A360_Close_Episode_Flow`
- `A360_Welfare_Assessment_Flow`
- `A360_Animal_Current_State_Rollup_Flow`
- `A360_Assessment_Risk_Evaluation_Flow`
- `A360_Create_Care_Plan_Flow`
- `A360_Care_Plan_Auto_Create_Flow`
- `A360_Review_Due_Reminder_Flow`

Key Apex services include:

- `A360AssessmentTemplateService`
- `A360AssessmentPersistenceService`
- `A360AssessmentRiskService`
- `A360CarePlanService`
- `A360ReviewReminderService`
- `A360AnimalRollupService`

## Prerequisites

You will need:

- Salesforce CLI with the `sf` command available
- access to a target Salesforce org
- Node.js and npm for repo tooling

The project is configured as a single-package DX workspace in `sfdx-project.json` with API version `66.0`. The implementation docs and validation commands assume an authenticated org alias of `animal360`.

## Getting Started

1. Clone the repository and install Node-based tooling:

   ```bash
   git clone https://github.com/sergiopesch/animal360.git
   cd animal360
   npm install
   ```

2. Authenticate to your target org, for example:

   ```bash
   sf org login web -a animal360
   ```

3. Deploy the current package:

   ```bash
   sf project deploy start -o animal360 -x manifest/package.xml
   ```

## Phase II Bootstrap

After deploying Phase II metadata for the first time, seed the packaged assessment template defaults into the runtime template objects by executing the following as anonymous Apex:

```apex
A360AssessmentTemplateService.SeedResult result =
    A360AssessmentTemplateService.seedTemplates(true);
System.debug(JSON.serializePretty(result));
```

This materializes the packaged defaults into:

- `Assessment_Template__c`
- `Template_Domain_Definition__c`
- `Template_Indicator_Assignment__c`

Review reminders are intentionally packaged as reusable automation, not as a hardcoded org schedule. If you want scheduled reminder creation, invoke `A360_Review_Due_Reminder_Flow` from your org-specific scheduling strategy.

## Local Tooling And Validation

Lint and test the repo tooling with:

```bash
npm run lint
npm test
```

Run the focused Phase II Apex regression suite with:

```bash
sf apex run test -o animal360 --tests A360Phase2ServiceTest --result-format human --code-coverage --wait 30
```

For iterative metadata deployment during development, deploy a narrower path instead of the full manifest, for example:

```bash
sf project deploy start -o animal360 --source-dir force-app/main/default/lwc/a360WelfareAssessmentEntry
```

## Metadata Generation Helpers

The repository includes generation scripts used to scaffold or regenerate major metadata sets:

- `scripts/generate-phase1-metadata.mjs`
- `scripts/generate-phase2-metadata.mjs`
- `scripts/generate-phase2-security-reporting.mjs`

If you rerun these scripts, review the generated metadata before deploying or committing.

## Project Documentation

Start with these docs for architecture and delivery context:

- `docs/phase1-implementation-assumptions.md`
- `docs/phase2-implementation-assumptions.md`
- `docs/phase2-build-backlog.md`

## Contributing

Contributions are welcome. Before opening a pull request, run the repo formatting, lint, and targeted validation commands relevant to your change.

## License

This repository does not currently include a license file. Add one if you want to define reuse terms.
