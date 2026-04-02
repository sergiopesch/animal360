# Welfare And Care Implementation Assumptions

## Package And Delivery Defaults

- No separate package-structure document exists in the repository, so welfare and care delivery continues the existing package strategy explicitly in this document.
- The repository remains a single-package Salesforce DX project rooted at `force-app`.
- The package keeps an empty namespace and API version `66.0`.
- Delivery remains source-format and manifest-based. No secondary package directories are introduced.
- All new metadata stays under `force-app/main/default`, with supporting docs under `docs`, seed or validation helpers under `scripts`, and deploy scope managed through `manifest/package.xml`.
- Initial validation continues to target the authenticated org alias `animal360`, with scratch-org support remaining optional.

## Runtime Authority Decisions

- The welfare module uses a hybrid template architecture.
- Custom metadata is the packaged source of truth for:
  - domain definitions
  - indicator definitions and option catalogues
  - packaged template defaults
  - risk rules
  - automation settings
  - status transition rules
- Custom object template records are the runtime authority for active assessment entry:
  - `Assessment_Template__c`
  - `Template_Domain_Definition__c`
  - `Template_Indicator_Assignment__c`
- Completed assessments do not depend on mutable template records alone. Historical stability is preserved by storing the template lookup plus snapshot keys and version fields on `Welfare_Assessment__c`, while observations and domain summaries persist the indicator and domain keys used at capture time.

## Template Versioning And Lifecycle

- `Assessment_Template__c` records follow a `Draft -> Active -> Retired` lifecycle.
- Only one active default template can exist for a given species and assessment context combination.
- New runtime versions are created by cloning a prior template into a new version record rather than editing the active version in place.
- Packaged seed templates are marked as managed seed records so the seed service can update only the package-owned baseline without overwriting subscriber-created variants.
- Historical assessments remain interpretable after template changes because the assessment record stores:
  - template lookup
  - template code
  - template version
  - metadata template key

## Assessment Entry Decision

- Welfare assessment entry is delivered as a screen flow with an LWC screen component.
- `A360_Welfare_Assessment_Flow` remains the orchestration layer for launch context, template selection, error handling, and post-save routing.
- The LWC screen component is responsible for dynamic runtime rendering of template domains and indicators and for returning a structured payload to the flow.
- This avoids forcing arbitrary template layouts into static flow screens while keeping the primary user entry point Salesforce-native and Flow-based.

## Automation Boundary

- Declarative automation remains the outer orchestration layer.
- Apex or invocable services handle metadata-driven logic that would become brittle in Flow alone:
  - template seeding and sync
  - assessment payload persistence
  - metadata-driven risk evaluation
  - reminder task generation from automation settings
  - template activation guardrails
  - shared current-state rollups that affect existing operational state fields
- Record-triggered and scheduled flows are kept thin and call reusable Apex services where rule evaluation crosses many records or many metadata-driven conditions.
- Review reminders are packaged as an autolaunched flow plus Apex reminder service so each org can decide whether to invoke it with a scheduled flow, Flow Orchestrator, or an admin-run cadence without hardcoding a package-level start time.

## Defaults, Seeding, And Upgrade Strategy

- Custom metadata default records are deployed as metadata and version-controlled with the package.
- A dedicated Apex seed service materializes the packaged defaults into `Assessment_Template__c`, `Template_Domain_Definition__c`, and `Template_Indicator_Assignment__c` records using stable metadata keys.
- Seed operations are idempotent. Package-managed seed records can be refreshed safely by template key and version.
- Subscriber-editable templates are created as separate runtime records instead of editing package-managed seed records in place.
- Upgrades refresh only managed seed templates and do not overwrite subscriber-owned variants.

## Current-State And Reporting Semantics

- `Welfare_Assessment__c` is the historical assessment event.
- `Welfare_Domain_Summary__c` and `Welfare_Observation__c` remain the historical evidence layer and are never flattened into assessment header fields.
- `Animal_Episode__c` carries the current welfare projection for the active episode, including current welfare level, current clinical priority, and next review date.
- `Animal__c.Current_Welfare_Risk__c` continues to be the cross-object current-state summary and is derived from the current episode through the shared rollup service.
- The existing `A360AnimalRollupService` remains the shared current-state mutation service and is extended for welfare rollups instead of introducing a second rollup path.
