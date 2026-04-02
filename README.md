# animal360

![Salesforce DX](https://img.shields.io/badge/Salesforce-DX-00A1E0?logo=salesforce&logoColor=white)
![API 66.0](https://img.shields.io/badge/API-66.0-0176D3)
![Package](https://img.shields.io/badge/Package-Single%20DX-0B5CAB)
![Phase II](https://img.shields.io/badge/Welfare%20Evidence-MVP-1589EE)
![CI](https://github.com/sergiopesch/animal360/actions/workflows/ci.yml/badge.svg)

**Salesforce-native animal welfare operations and welfare evidence management.**  
Track animals, episodes, housing, welfare assessments, clinical follow-up, and care-plan automation in a single Salesforce DX application.

## What It Does

`animal360` combines two major delivery layers:

- **Phase I operations**
  - animal and episode records
  - housing and location-stay tracking
  - intake, move, and closeout workflows
  - shared current-state rollups
- **Phase II welfare evidence**
  - metadata-driven assessment template configuration
  - runtime welfare assessment capture
  - `Welfare_Assessment__c`, `Welfare_Domain_Summary__c`, and `Welfare_Observation__c`
  - `Care_Plan__c`, `Care_Plan_Action__c`, `Clinical_Event__c`, and `Human_Animal_Interaction__c`
  - risk evaluation, care-plan auto-create, and review reminders
  - Phase II reporting and permission-set model

## Repository Layout

- `force-app/main/default`: primary Salesforce metadata and source
- `docs`: implementation assumptions, delivery backlog, and audit inventory
- `scripts`: metadata generation helpers and support assets
- `manifest/package.xml`: deployable package manifest
- `config/project-scratch-def.json`: scratch-org definition baseline

## App Surface

Primary flow entry points:

- `A360_Intake_Flow`
- `A360_Move_Animal_Flow`
- `A360_Close_Episode_Flow`
- `A360_Welfare_Assessment_Flow`
- `A360_Animal_Current_State_Rollup_Flow`
- `A360_Assessment_Risk_Evaluation_Flow`
- `A360_Create_Care_Plan_Flow`
- `A360_Care_Plan_Auto_Create_Flow`
- `A360_Review_Due_Reminder_Flow`

Primary Apex services:

- `A360AssessmentTemplateService`
- `A360AssessmentPersistenceService`
- `A360AssessmentRiskService`
- `A360CarePlanService`
- `A360ReviewReminderService`
- `A360AnimalRollupService`

## Requirements

- Salesforce CLI with `sf`
- access to a Salesforce org for deployment
- Node.js and npm for local tooling

The project is configured as:

- single-package Salesforce DX
- package root: `force-app`
- namespace: empty
- source API version: `66.0`

## Quick Start

```bash
git clone https://github.com/sergiopesch/animal360.git
cd animal360
npm install
sf org login web -a animal360
sf project deploy start -o animal360 -x manifest/package.xml
```

## Phase II Bootstrap

After the first Phase II deployment, seed the packaged assessment template defaults into runtime records:

```apex
A360AssessmentTemplateService.SeedResult result =
    A360AssessmentTemplateService.seedTemplates(true);
System.debug(JSON.serializePretty(result));
```

This materializes packaged defaults into:

- `Assessment_Template__c`
- `Template_Domain_Definition__c`
- `Template_Indicator_Assignment__c`

Review reminders are intentionally packaged as reusable automation rather than as a hardcoded org schedule. To schedule reminder generation, invoke `A360_Review_Due_Reminder_Flow` from your org-specific automation strategy.

## DevOps And Validation

Local repo checks:

```bash
npm run lint
npm test
npm run prettier:verify
```

Focused Phase II Apex regression:

```bash
sf apex run test -o animal360 --tests A360Phase2ServiceTest --result-format human --code-coverage --wait 30
```

Example narrow deploy during development:

```bash
sf project deploy start -o animal360 --source-dir force-app/main/default/lwc/a360WelfareAssessmentEntry
```

Current repository workflow notes:

- formatting is enforced through `prettier`
- LWC JavaScript is enforced through `eslint`
- staged LWC changes run related Jest checks through `lint-staged`
- GitHub Actions runs formatting verification, lint, and LWC unit tests on pushes and pull requests
- org-backed deployment validation remains CLI/org-driven because the repository does not commit org credentials or a CI auth flow

## Metadata Generators

The repository includes script-backed metadata generation:

- `scripts/generate-phase1-metadata.mjs`
- `scripts/generate-phase2-metadata.mjs`
- `scripts/generate-phase2-security-reporting.mjs`

If you rerun these scripts, review the generated metadata before deploying or committing.

## Documentation

Start here for implementation context:

- `docs/phase1-implementation-assumptions.md`
- `docs/phase2-implementation-assumptions.md`
- `docs/phase2-build-backlog.md`
- `docs/application-inventory.md`

## Contributing

Before opening a pull request:

- run formatting, lint, and targeted validation for your change
- review generated metadata if any generator script was used
- confirm the target org deploys cleanly for the changed metadata scope

## License

This repository does not currently include a license file. Add one if you want to define reuse terms.
