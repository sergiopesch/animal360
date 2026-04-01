# Phase I Implementation Assumptions

## Delivery Defaults

- The repository remains a single-package Salesforce DX project rooted at `force-app`.
- The package has no namespace and continues to target API version 66.0.
- Initial validation is expected against the authenticated org alias `animal360`, with scratch-org support remaining optional.
- Record types, packaged distribution, and Phase II metadata-driven assessment work remain out of scope for this Phase I delivery.

## Data And Integrity Decisions

- `Animal__c`, `Housing_Unit__c`, and `Animal_Relationship__c` use public read/write sharing for Phase I to avoid blocking early operational rollout.
- Child records that are lifecycle-dependent on a parent record use master-detail and inherit sharing from the parent.
- Cross-record integrity rules are enforced in Apex trigger handlers, not validation rules, when the rule spans multiple rows:
  - one primary identifier per animal
  - one current episode per animal
  - one current stay per episode
  - no overlapping location stays within an episode
- Current-state summary fields on `Animal__c` and `Animal_Episode__c` are system-maintained. Care Manager access keeps those fields read-only.

## Automation Decisions

- Guided operational capture is delivered with three simple screen flows:
  - `A360_Intake_Flow`
  - `A360_Move_Animal_Flow`
  - `A360_Close_Episode_Flow`
- The screen flows deliberately accept Salesforce record Ids for lookup inputs in Phase I to keep the metadata bundle deployable without extra LWC work.
- A shared autolaunched flow, `A360_Animal_Current_State_Rollup_Flow`, wraps the Apex rollup service and is reused by operational flows and thin record-trigger wrappers.

## Reporting And Access

- Starter reporting is delivered with a public read-only `Animal 360` report folder and three baseline reports over the standard object report types.
- Custom report types are included for future joined reporting on animals, episodes, and housing utilisation.
- Phase I personas are delivered as permission sets:
  - `Animal360_Admin`
  - `Animal360_Care_Manager`
  - `Animal360_Read_Only`
