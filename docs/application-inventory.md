# Animal360 Application Inventory

This document is a metadata inventory and audit reference for the `animal360` Salesforce application. It is intended to make the application traceable back to source by listing the major metadata assets committed in the repository and summarizing what each one does.

## Audit Scope

This inventory covers the application metadata committed in `force-app/main/default`, especially:

- custom objects and their fields
- custom metadata types and key metadata records
- validation rules
- permission sets and custom permissions
- flows and triggers
- global value sets
- report types, reports, tabs, and layouts

It also points to the source-of-truth generator scripts and implementation documents that explain why the metadata exists.

## Source Of Truth And Traceability

Primary repository paths:

- `force-app/main/default`
- `manifest/package.xml`
- `scripts/generate-phase1-metadata.mjs`
- `scripts/generate-phase2-metadata.mjs`
- `scripts/generate-phase2-security-reporting.mjs`
- `docs/phase1-implementation-assumptions.md`
- `docs/phase2-implementation-assumptions.md`
- `docs/phase2-build-backlog.md`

Important traceability note:

- A large share of the XML metadata is generated from the `.mjs` scripts above.
- Apex classes, triggers, and the LWC bundle are the clearest handwritten runtime assets.
- Runtime template records are seeded from packaged custom metadata via `A360AssessmentTemplateService`.

## Inventory Summary

Current repository inventory at a glance:

- 18 runtime custom objects
- 9 custom metadata type definitions
- 53 custom metadata records
- 5 permission sets
- 2 custom permissions
- 11 flows
- 6 triggers
- 1 Lightning Web Component bundle
- 14 global value sets
- 8 report types
- 10 reports in the `Animal_360` folder
- 10 custom tabs
- 18 layouts
- 12 validation rules

## Metadata Categories

### Runtime Custom Objects

Core operational objects:

- `Animal__c`
- `Animal_Episode__c`
- `Animal_Identifier__c`
- `Animal_Location_Stay__c`
- `Animal_Relationship__c`
- `Housing_Unit__c`
- `Intake_Event__c`
- `Outcome_Event__c`

Welfare, template, and intervention objects:

- `Assessment_Template__c`
- `Template_Domain_Definition__c`
- `Template_Indicator_Assignment__c`
- `Welfare_Assessment__c`
- `Welfare_Domain_Summary__c`
- `Welfare_Observation__c`
- `Care_Plan__c`
- `Care_Plan_Action__c`
- `Clinical_Event__c`
- `Human_Animal_Interaction__c`

### Custom Metadata Types

- `Animal360_Assessment_Template_Default__mdt`
- `Animal360_Automation_Setting__mdt`
- `Animal360_Domain_Definition__mdt`
- `Animal360_Indicator_Definition__mdt`
- `Animal360_Indicator_Value_Option__mdt`
- `Animal360_Risk_Rule__mdt`
- `Animal360_Species_Template__mdt`
- `Animal360_Status_Transition_Rule__mdt`
- `Animal360_Template_Indicator_Default__mdt`

### Security And Automation

- Permission sets in `force-app/main/default/permissionsets`
- Custom permissions in `force-app/main/default/customPermissions`
- Flows in `force-app/main/default/flows`
- Triggers in `force-app/main/default/triggers`

## Permission Sets

Source: `force-app/main/default/permissionsets`

| API name                  | Description                                                                 | Notable access scope                                                                                                                    | Custom permissions granted                                             | Flow access                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Animal360_Admin`         | Administrative access for Love 4 Animals operational and welfare workflows. | Full CRUD plus broad admin access across the application metadata and runtime objects.                                                  | `A360_Manage_Assessment_Templates`, `A360_Welfare_Escalation_Override` | All application flows                                                                                                                    |
| `Animal360_Care_Manager`  | Operational access for care, welfare, and intervention workflows.           | CRUD on core operational, welfare, care-plan, and interaction records; read-only on template/config and clinical event objects.         | `A360_Welfare_Escalation_Override`                                     | Intake, move, close, rollup, welfare assessment, risk evaluation, care plan, auto-create, reminder                                       |
| `Animal360_Clinical_User` | Clinical-event and follow-up access for clinical workflows.                 | Edit access focused on `Clinical_Event__c` and `Care_Plan_Action__c`; most other app records are read-only.                             | None                                                                   | `A360_Assessment_Risk_Evaluation_Flow`, `A360_Create_Care_Plan_Flow`, `A360_Care_Plan_Auto_Create_Flow`, `A360_Review_Due_Reminder_Flow` |
| `Animal360_Assessor`      | Assessment-entry access for welfare evidence capture.                       | Create and edit access for welfare assessments, domain summaries, observations, and interactions; most other app records are read-only. | None                                                                   | `A360_Welfare_Assessment_Flow`, `A360_Assessment_Risk_Evaluation_Flow`                                                                   |
| `Animal360_Read_Only`     | Read-only reporting and lookup access for Love 4 Animals data.              | Read-only and reporting-focused access across Love 4 Animals operational and welfare records.                                           | None                                                                   | None                                                                                                                                     |

## Custom Permissions

Source: `force-app/main/default/customPermissions`

| API name                           | Purpose                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `A360_Manage_Assessment_Templates` | Allows management of assessment template runtime records and seeding-related administration. |
| `A360_Welfare_Escalation_Override` | Allows override of default welfare escalation and care-plan automation behavior.             |

## Flows

Source: `force-app/main/default/flows`

| API name                                        | Process type     | Trigger / object                        | Purpose                                                                                             | Major called Apex / subflows / LWC                                                                                     |
| ----------------------------------------------- | ---------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `A360_Welfare_Assessment_Flow`                  | Screen Flow      | Manual user flow                        | Dynamic welfare assessment entry, persistence, risk evaluation, and conditional care-plan creation. | `c:a360WelfareAssessmentEntry`, `A360AssessmentPersistenceService`, `A360AssessmentRiskService`, `A360CarePlanService` |
| `A360_Review_Due_Reminder_Flow`                 | AutoLaunchedFlow | None                                    | Creates reminder tasks for due or upcoming reviews.                                                 | `A360ReviewReminderService`                                                                                            |
| `A360_Create_Care_Plan_Flow`                    | AutoLaunchedFlow | None                                    | Creates a care plan from supplied context.                                                          | `A360CarePlanService`                                                                                                  |
| `A360_Care_Plan_Auto_Create_Flow`               | AutoLaunchedFlow | None                                    | Re-evaluates assessment risk and auto-creates a care plan when metadata rules require it.           | `A360AssessmentRiskService`, `A360CarePlanService`                                                                     |
| `A360_Assessment_Risk_Evaluation_Flow`          | AutoLaunchedFlow | None                                    | Evaluates welfare risk for an assessment.                                                           | `A360AssessmentRiskService`                                                                                            |
| `A360_Move_Animal_Flow`                         | Screen Flow      | Manual user flow                        | Closes the current stay, creates a new stay, and reruns current-state rollups.                      | `A360_Animal_Current_State_Rollup_Flow`                                                                                |
| `A360_Location_Stay_Current_State_Trigger_Flow` | AutoLaunchedFlow | After-save on `Animal_Location_Stay__c` | Recomputes rollups when a location stay changes.                                                    | `A360_Animal_Current_State_Rollup_Flow`                                                                                |
| `A360_Intake_Flow`                              | Screen Flow      | Manual user flow                        | Creates animal, episode, intake event, and initial placement.                                       | `A360_Animal_Current_State_Rollup_Flow`                                                                                |
| `A360_Episode_Current_State_Trigger_Flow`       | AutoLaunchedFlow | After-save on `Animal_Episode__c`       | Recomputes rollups when an episode changes.                                                         | `A360_Animal_Current_State_Rollup_Flow`                                                                                |
| `A360_Close_Episode_Flow`                       | Screen Flow      | Manual user flow                        | Creates outcome event, closes current stay and episode, then reruns rollups.                        | `A360_Animal_Current_State_Rollup_Flow`                                                                                |
| `A360_Animal_Current_State_Rollup_Flow`         | AutoLaunchedFlow | None                                    | Central rollup automation for current-state animal and episode fields.                              | `A360AnimalRollupService`                                                                                              |

## Triggers

Source: `force-app/main/default/triggers`

| Trigger                           | Object / events                                          | Purpose                                                                                                            |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `A360AnimalEpisodeTrigger`        | `Animal_Episode__c` before insert, before update         | Enforces episode integrity through `A360AnimalIntegrityService.validateEpisodes()`.                                |
| `A360AnimalIdentifierTrigger`     | `Animal_Identifier__c` before insert, before update      | Enforces identifier integrity through `A360AnimalIntegrityService.validateIdentifiers()`.                          |
| `A360AnimalLocationStayTrigger`   | `Animal_Location_Stay__c` before insert, before update   | Enforces stay integrity through `A360AnimalIntegrityService.validateLocationStays()`.                              |
| `A360AssessmentTemplateTrigger`   | `Assessment_Template__c` before insert, before update    | Prepares template uniqueness and default-context behavior via `A360AssessmentIntegrityService.prepareTemplates()`. |
| `A360WelfareDomainSummaryTrigger` | `Welfare_Domain_Summary__c` before insert, before update | Derives `Assessment_Domain_Key__c` for domain-summary uniqueness.                                                  |
| `A360WelfareObservationTrigger`   | `Welfare_Observation__c` before insert, before update    | Derives `Observation_Value_Type__c` and `Observation_Key__c` for observation integrity.                            |

## Global Value Sets

Source: `force-app/main/default/globalValueSets`

| API name                   | Purpose                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| `A360_Episode_Type`        | Standard episode classifications.                                         |
| `A360_Housing_Type`        | Standard housing-unit classifications.                                    |
| `A360_Outcome_Type`        | Standard episode closeout and outcome values.                             |
| `A360_Reproductive_Status` | Animal reproductive status vocabulary.                                    |
| `A360_Sex`                 | Animal sex vocabulary.                                                    |
| `A360_Species`             | Supported species catalogue for operational and template records.         |
| `A360_Welfare_Risk`        | Welfare concern scale from `Low` to `Critical`.                           |
| `A360_Animal_Response`     | Animal response patterns for human-animal interactions.                   |
| `A360_Clinical_Priority`   | Clinical urgency and follow-up priority scale.                            |
| `A360_Confidence_Level`    | Confidence scale used in assessments, domain summaries, and observations. |
| `A360_Domain_Code`         | Five Domains code set.                                                    |
| `A360_Interaction_Quality` | Interaction quality vocabulary.                                           |
| `A360_Negative_Grade`      | Negative-grade scoring scale.                                             |
| `A360_Positive_Grade`      | Positive-grade scoring scale.                                             |

## Report Types

Source: `force-app/main/default/reportTypes`

| API name                                        | What it covers                                       |
| ----------------------------------------------- | ---------------------------------------------------- |
| `Animal_with_Episodes`                          | Animals joined to episodes.                          |
| `Animal_Episode_with_Location_Stays`            | Animal episodes joined to location stays.            |
| `Housing_Unit_with_Location_Stays`              | Housing units joined to location stays.              |
| `Animal_Episode_with_Care_Plans`                | Animal episodes joined to care plans.                |
| `Animal_Episode_with_Clinical_Events`           | Animal episodes joined to clinical events.           |
| `Animal_Episode_with_Human_Animal_Interactions` | Animal episodes joined to human-animal interactions. |
| `Animal_Episode_with_Welfare_Assessments`       | Animal episodes joined to welfare assessments.       |
| `Welfare_Assessment_with_Observations`          | Welfare assessments joined to child observations.    |

## Reports

Sources:

- `force-app/main/default/reports/Animal_360.reportFolder-meta.xml`
- `force-app/main/default/reports/Animal_360`

Report folder: `Animal_360`

| API name                                   | What it covers                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `Animals_Currently_In_Care`                | Animals currently in care, including species, status, and current housing. |
| `Housing_Unit_Capacity`                    | Housing-unit capacity and active occupancy.                                |
| `Open_Episodes`                            | Open episodes and current operational state.                               |
| `Assessments_Overdue_for_Review`           | Completed welfare assessments whose next review date is overdue.           |
| `Clinical_Events_by_Priority`              | Clinical events by date, type, priority, and next review.                  |
| `High_and_Critical_Cases_Requiring_Action` | Welfare assessments requiring immediate action.                            |
| `Interactions_by_Response_Pattern`         | Human-animal interactions by type, quality, and response pattern.          |
| `Open_Care_Plans_by_Type`                  | Open care plans by type, owner, and target review date.                    |
| `Welfare_Assessments_by_Concern_Level`     | Welfare assessments by concern level and immediate-action state.           |
| `Welfare_Trend_by_Animal`                  | Welfare assessment history over time by animal.                            |

## Tabs

Source: `force-app/main/default/tabs`

Custom tabs present:

- `Animal__c`
- `Animal_Episode__c`
- `Housing_Unit__c`
- `Intake_Event__c`
- `Outcome_Event__c`
- `Assessment_Template__c`
- `Welfare_Assessment__c`
- `Care_Plan__c`
- `Clinical_Event__c`
- `Human_Animal_Interaction__c`

## Layouts

Source: `force-app/main/default/layouts`

Operational layouts:

- `Animal__c-Animal Layout`
- `Animal_Episode__c-Animal Episode Layout`
- `Animal_Identifier__c-Animal Identifier Layout`
- `Animal_Location_Stay__c-Animal Location Stay Layout`
- `Animal_Relationship__c-Animal Relationship Layout`
- `Housing_Unit__c-Housing Unit Layout`
- `Intake_Event__c-Intake Event Layout`
- `Outcome_Event__c-Outcome Event Layout`

Template and runtime-config layouts:

- `Assessment_Template__c-Assessment Template Layout`
- `Template_Domain_Definition__c-Template Domain Definition Layout`
- `Template_Indicator_Assignment__c-Template Indicator Assignment Layout`

Welfare and intervention layouts:

- `Welfare_Assessment__c-Welfare Assessment Layout`
- `Welfare_Domain_Summary__c-Welfare Domain Summary Layout`
- `Welfare_Observation__c-Welfare Observation Layout`
- `Care_Plan__c-Care Plan Layout`
- `Care_Plan_Action__c-Care Plan Action Layout`
- `Clinical_Event__c-Clinical Event Layout`
- `Human_Animal_Interaction__c-Human Animal Interaction Layout`

## Runtime Custom Objects And Fields

### Animal (`Animal__c`)

- Purpose: Core animal record for intake, housing, episode management, and current-state reporting.
- Label: `Animal`
- Sharing model: `ReadWrite`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Animal__c`

| API name                  | Label                  | Type     | Description                                                         |
| ------------------------- | ---------------------- | -------- | ------------------------------------------------------------------- |
| `Breed_Primary__c`        | Primary Breed          | Text     | Primary breed or type description.                                  |
| `Breed_Secondary__c`      | Secondary Breed        | Text     | Secondary breed or type description when known.                     |
| `Current_Care_Status__c`  | Current Care Status    | Picklist | System-maintained summary of the active episode status.             |
| `Current_Episode__c`      | Current Episode        | Lookup   | System-maintained pointer to the active episode.                    |
| `Current_Housing_Unit__c` | Current Housing Unit   | Lookup   | System-maintained pointer to the active housing unit.               |
| `Current_Status__c`       | Current Status         | Picklist | System-maintained lifecycle status summary.                         |
| `Current_Welfare_Risk__c` | Current Welfare Risk   | Picklist | Current welfare risk flag for operational reporting.                |
| `Date_of_Birth__c`        | Date of Birth          | Date     | Confirmed or best-known date of birth.                              |
| `Date_of_Death__c`        | Date of Death          | Date     | Known date of death.                                                |
| `Display_Name__c`         | Display Name           | Text     | User-facing display name for the animal.                            |
| `Estimated_Age_Months__c` | Estimated Age (Months) | Number   | Estimated age in whole months when the exact birth date is unknown. |
| `Is_Deceased__c`          | Is Deceased            | Checkbox | Marks the animal as deceased.                                       |
| `Reproductive_Status__c`  | Reproductive Status    | Picklist | Current reproductive status of the animal.                          |
| `Responsible_Account__c`  | Responsible Account    | Lookup   | Organisation currently responsible for the animal.                  |
| `Responsible_Contact__c`  | Responsible Contact    | Lookup   | Primary contact responsible for the animal.                         |
| `Sex__c`                  | Sex                    | Picklist | Recorded sex for the animal.                                        |
| `Species__c`              | Species                | Picklist | Primary species classification.                                     |

Validation rules:

- `A360_Animal_Age_Source_Required`: requires either `Date_of_Birth__c` or `Estimated_Age_Months__c`.
- `A360_Animal_Deceased_Date_Required`: requires `Date_of_Death__c` when `Is_Deceased__c` is true.

### Animal Episode (`Animal_Episode__c`)

- Purpose: Bounded period of care for an animal.
- Label: `Animal Episode`
- Sharing model: `ControlledByParent`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Animal_Episode__c`

| API name                       | Label                     | Type         | Description                                                                    |
| ------------------------------ | ------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `Animal__c`                    | Animal                    | MasterDetail | Animal that owns this episode.                                                 |
| `Current_Clinical_Priority__c` | Current Clinical Priority | Picklist     | System-maintained current clinical priority for the active episode.            |
| `Current_Location_Stay__c`     | Current Location Stay     | Lookup       | System-maintained pointer to the active location stay.                         |
| `Current_Welfare_Level__c`     | Current Welfare Level     | Picklist     | System-maintained current welfare level for the active episode.                |
| `End_DateTime__c`              | End Date Time             | DateTime     | Date and time the episode ended.                                               |
| `Episode_Status__c`            | Episode Status            | Picklist     | Current operational status for the episode.                                    |
| `Episode_Type__c`              | Episode Type              | Picklist     | Classification for this episode.                                               |
| `Intake_DateTime__c`           | Intake Date Time          | DateTime     | Date and time the episode started.                                             |
| `Intake_Source__c`             | Intake Source             | Picklist     | How the animal entered care for this episode.                                  |
| `Is_Current__c`                | Is Current                | Checkbox     | Marks the episode as the active episode for the animal.                        |
| `Next_Review_Date__c`          | Next Review Date          | Date         | System-maintained next welfare or clinical review date for the active episode. |
| `Notes__c`                     | Notes                     | LongTextArea | Operational notes for the episode.                                             |
| `Outcome_Account__c`           | Outcome Account           | Lookup       | Destination or responsible account captured at closeout.                       |
| `Outcome_Contact__c`           | Outcome Contact           | Lookup       | Destination or responsible contact captured at closeout.                       |
| `Outcome_Type__c`              | Outcome Type              | Picklist     | Outcome type recorded at closeout.                                             |

Validation rules:

- `A360_Current_Episode_No_End`: prevents current episodes from storing an end date.
- `A360_Episode_End_After_Start`: ensures episode end is not before intake datetime.

### Animal Identifier (`Animal_Identifier__c`)

- Purpose: Operational and external identifiers assigned to an animal.
- Label: `Animal Identifier`
- Sharing model: `ControlledByParent`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Animal_Identifier__c`

| API name              | Label            | Type         | Description                                                    |
| --------------------- | ---------------- | ------------ | -------------------------------------------------------------- |
| `Animal__c`           | Animal           | MasterDetail | Animal that owns this identifier.                              |
| `Country__c`          | Country          | Picklist     | Country associated with the identifier.                        |
| `End_Date__c`         | End Date         | Date         | Date the identifier stopped being effective.                   |
| `Identifier_Type__c`  | Identifier Type  | Picklist     | Operational or external identifier type.                       |
| `Identifier_Value__c` | Identifier Value | Text         | Unique identifier value used for matching and integrations.    |
| `Is_Primary__c`       | Is Primary       | Checkbox     | Marks the identifier as the primary identifier for the animal. |
| `Issuing_Body__c`     | Issuing Body     | Text         | Organisation that issued the identifier.                       |
| `Start_Date__c`       | Start Date       | Date         | Date the identifier became effective.                          |

Validation rules:

- `A360_Identifier_End_After_Start`: ensures identifier end date is not before start date.

### Animal Location Stay (`Animal_Location_Stay__c`)

- Purpose: Placement history of an episode in a housing unit over time.
- Label: `Animal Location Stay`
- Sharing model: `ControlledByParent`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Animal_Location_Stay__c`

| API name            | Label           | Type         | Description                                             |
| ------------------- | --------------- | ------------ | ------------------------------------------------------- |
| `Animal_Episode__c` | Animal Episode  | MasterDetail | Episode that owns this location stay.                   |
| `End_DateTime__c`   | End Date Time   | DateTime     | Date and time the stay ended.                           |
| `Housing_Unit__c`   | Housing Unit    | Lookup       | Housing unit assigned during this stay.                 |
| `Is_Current__c`     | Is Current      | Checkbox     | Marks the stay as the active placement for the episode. |
| `Move_Reason__c`    | Move Reason     | Picklist     | Reason the stay started.                                |
| `Notes__c`          | Notes           | LongTextArea | Operational notes about the stay.                       |
| `Start_DateTime__c` | Start Date Time | DateTime     | Date and time the stay started.                         |

Validation rules:

- `A360_Current_Stay_No_End`: prevents current stays from storing an end date.
- `A360_Stay_End_After_Start`: ensures stay end is not before stay start.

### Animal Relationship (`Animal_Relationship__c`)

- Purpose: Important operational relationship between animals.
- Label: `Animal Relationship`
- Sharing model: `ReadWrite`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Animal_Relationship__c`

| API name               | Label             | Type         | Description                               |
| ---------------------- | ----------------- | ------------ | ----------------------------------------- |
| `End_Date__c`          | End Date          | Date         | Date the relationship ended.              |
| `From_Animal__c`       | From Animal       | Lookup       | Source animal in the relationship.        |
| `Notes__c`             | Notes             | LongTextArea | Operational notes about the relationship. |
| `Relationship_Type__c` | Relationship Type | Picklist     | Type of relationship between the animals. |
| `Start_Date__c`        | Start Date        | Date         | Date the relationship started.            |
| `To_Animal__c`         | To Animal         | Lookup       | Target animal in the relationship.        |

Validation rules:

- `A360_No_Self_Relationship`: prevents the same animal from being both ends of the relationship.

### Housing Unit (`Housing_Unit__c`)

- Purpose: Physical or virtual placement location.
- Label: `Housing Unit`
- Sharing model: `ReadWrite`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Housing_Unit__c`

| API name               | Label             | Type         | Description                                          |
| ---------------------- | ----------------- | ------------ | ---------------------------------------------------- |
| `Capacity__c`          | Capacity          | Number       | Nominal capacity for the housing unit.               |
| `Current_Occupancy__c` | Current Occupancy | Number       | Operational reporting field for current occupancy.   |
| `Housing_Type__c`      | Housing Type      | Picklist     | Classification for the housing unit.                 |
| `Is_Active__c`         | Is Active         | Checkbox     | Marks whether the housing unit is available for use. |
| `Notes__c`             | Notes             | LongTextArea | Operational notes about the housing unit.            |
| `Site_Account__c`      | Site Account      | Lookup       | Owning or operating site account.                    |
| `Unit_Code__c`         | Unit Code         | Text         | Operational code used to identify the housing unit.  |

Validation rules:

- None.

### Intake Event (`Intake_Event__c`)

- Purpose: Intake transaction that opened an episode.
- Label: `Intake Event`
- Sharing model: `ControlledByParent`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Intake_Event__c`

| API name                 | Label               | Type         | Description                                  |
| ------------------------ | ------------------- | ------------ | -------------------------------------------- |
| `Animal_Episode__c`      | Animal Episode      | MasterDetail | Episode that owns this intake event.         |
| `Event_DateTime__c`      | Event Date Time     | DateTime     | When the intake was recorded.                |
| `Notes__c`               | Notes               | LongTextArea | Operational notes about the intake event.    |
| `Responsible_Account__c` | Responsible Account | Lookup       | Responsible organisation captured at intake. |
| `Responsible_Contact__c` | Responsible Contact | Lookup       | Responsible contact captured at intake.      |
| `Source__c`              | Source              | Picklist     | Recorded intake source for the event.        |

Validation rules:

- None.

### Outcome Event (`Outcome_Event__c`)

- Purpose: Closing transaction for an episode.
- Label: `Outcome Event`
- Sharing model: `ControlledByParent`
- Workstream: `Core Operations`
- Source: `force-app/main/default/objects/Outcome_Event__c`

| API name                 | Label               | Type         | Description                                |
| ------------------------ | ------------------- | ------------ | ------------------------------------------ |
| `Animal_Episode__c`      | Animal Episode      | MasterDetail | Episode that owns this outcome event.      |
| `Destination_Account__c` | Destination Account | Lookup       | Destination account captured at outcome.   |
| `Destination_Contact__c` | Destination Contact | Lookup       | Destination contact captured at outcome.   |
| `Event_DateTime__c`      | Event Date Time     | DateTime     | When the outcome was recorded.             |
| `Notes__c`               | Notes               | LongTextArea | Operational notes about the outcome event. |
| `Outcome_Type__c`        | Outcome Type        | Picklist     | Outcome recorded for the episode.          |

Validation rules:

- None.

### Assessment Template (`Assessment_Template__c`)

- Purpose: Editable runtime assessment template used to drive welfare capture.
- Label: `Assessment Template`
- Sharing model: `ReadWrite`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Assessment_Template__c`

| API name                   | Label                 | Type         | Description                                                                                                   |
| -------------------------- | --------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `Context__c`               | Context               | Picklist     | Assessment context targeted by the template.                                                                  |
| `Default_Context_Key__c`   | Default Context Key   | Text         | System-maintained uniqueness key that prevents more than one active default template per species and context. |
| `Default_For_Species__c`   | Default For Species   | Checkbox     | Marks the runtime template as the default for its species and context.                                        |
| `Description__c`           | Description           | LongTextArea | Administrative description of the template purpose and intended use.                                          |
| `Is_Managed_Seed__c`       | Is Managed Seed       | Checkbox     | Distinguishes package-managed seed templates from subscriber-authored runtime templates.                      |
| `Metadata_Template_Key__c` | Metadata Template Key | Text         | Stable packaged template key used for idempotent seed and upgrade sync.                                       |
| `Seed_Last_Synced_On__c`   | Seed Last Synced On   | DateTime     | Timestamp of the last successful seed or upgrade sync from packaged defaults.                                 |
| `Species__c`               | Species               | Picklist     | Species targeted by the template.                                                                             |
| `Status__c`                | Status                | Picklist     | Runtime lifecycle state for the template.                                                                     |
| `Template_Code__c`         | Template Code         | Text         | Unique runtime template code used in admin maintenance and reports.                                           |
| `Version__c`               | Version               | Text         | Version identifier preserved on completed assessments for historical traceability.                            |

Validation rules:

- None.

### Care Plan (`Care_Plan__c`)

- Purpose: Action-layer record responding to welfare assessments.
- Label: `Care Plan`
- Sharing model: `ControlledByParent`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Care_Plan__c`

| API name                | Label              | Type         | Description                                                    |
| ----------------------- | ------------------ | ------------ | -------------------------------------------------------------- |
| `Animal_Episode__c`     | Animal Episode     | MasterDetail | Episode that owns the care plan.                               |
| `Auto_Created__c`       | Auto Created       | Checkbox     | Indicates whether the plan was created by automation.          |
| `Owner_User__c`         | Owner User         | Lookup       | User accountable for progressing the care plan.                |
| `Plan_Type__c`          | Plan Type          | Picklist     | Type of intervention plan being created.                       |
| `Primary_Assessment__c` | Primary Assessment | Lookup       | Assessment that triggered or primarily supports the care plan. |
| `Primary_Goal__c`       | Primary Goal       | LongTextArea | Primary goal for the plan.                                     |
| `Start_Date__c`         | Start Date         | Date         | Start date for the plan.                                       |
| `Status__c`             | Status             | Picklist     | Lifecycle state of the care plan.                              |
| `Success_Criteria__c`   | Success Criteria   | LongTextArea | Criteria that define plan success.                             |
| `Target_Review_Date__c` | Target Review Date | Date         | Review date by which the plan should be reassessed.            |

Validation rules:

- None.

### Care Plan Action (`Care_Plan_Action__c`)

- Purpose: Action item belonging to a care plan.
- Label: `Care Plan Action`
- Sharing model: `ControlledByParent`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Care_Plan_Action__c`

| API name              | Label            | Type         | Description                                          |
| --------------------- | ---------------- | ------------ | ---------------------------------------------------- |
| `Action_Type__c`      | Action Type      | Picklist     | Type of action required under the care plan.         |
| `Assigned_To__c`      | Assigned To      | Lookup       | User assigned to complete the action.                |
| `Care_Plan__c`        | Care Plan        | MasterDetail | Care plan that owns the action item.                 |
| `Completed_On__c`     | Completed On     | DateTime     | Timestamp when the action was marked completed.      |
| `Completion_Notes__c` | Completion Notes | LongTextArea | Completion notes captured when the action is closed. |
| `Description__c`      | Description      | LongTextArea | Description of the action to complete.               |
| `Due_Date__c`         | Due Date         | Date         | Date by which the action should be completed.        |
| `Status__c`           | Status           | Picklist     | Lifecycle state of the action item.                  |

Validation rules:

- `A360_Completed_Action_Requires_Notes`: requires completion notes when the action status is `Completed`.

### Clinical Event (`Clinical_Event__c`)

- Purpose: Lightweight clinical event linked to an animal and episode.
- Label: `Clinical Event`
- Sharing model: `ReadWrite`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Clinical_Event__c`

| API name                  | Label                | Type         | Description                                                    |
| ------------------------- | -------------------- | ------------ | -------------------------------------------------------------- |
| `Animal_Episode__c`       | Animal Episode       | Lookup       | Episode linked to the clinical event.                          |
| `Animal__c`               | Animal               | Lookup       | Animal linked redundantly for direct reporting.                |
| `Body_Condition_Score__c` | Body Condition Score | Number       | Body condition score captured during the event.                |
| `Clinical_DateTime__c`    | Clinical Date Time   | DateTime     | Date and time of the clinical event.                           |
| `Clinical_Event_Type__c`  | Clinical Event Type  | Picklist     | Type of clinical event recorded.                               |
| `Clinical_Priority__c`    | Clinical Priority    | Picklist     | Clinical priority assigned to the event.                       |
| `Clinician_Contact__c`    | Clinician Contact    | Lookup       | External or internal clinician contact linked to the event.    |
| `Next_Review_Date__c`     | Next Review Date     | Date         | Planned next clinical review date.                             |
| `Pain_Observed__c`        | Pain Observed        | Checkbox     | Flags whether pain was observed in the event.                  |
| `Pain_Severity__c`        | Pain Severity        | Picklist     | Severity of pain observed during the event.                    |
| `Problem_Code__c`         | Problem Code         | Text         | Short problem or issue code used for reporting or integration. |
| `Problem_Summary__c`      | Problem Summary      | LongTextArea | Narrative summary of the clinical issue or treatment.          |
| `Pulse__c`                | Pulse                | Number       | Pulse captured during the event.                               |
| `Recorded_By__c`          | Recorded By          | Lookup       | User who recorded the event.                                   |
| `Related_Case__c`         | Related Case         | Lookup       | Optional case linked to the clinical event.                    |
| `Respiration__c`          | Respiration          | Number       | Respiration captured during the event.                         |
| `Temperature__c`          | Temperature          | Number       | Temperature captured during the event.                         |
| `Treatment_Given__c`      | Treatment Given      | LongTextArea | Treatment or intervention delivered during the event.          |
| `Weight__c`               | Weight               | Number       | Weight captured during the event.                              |

Validation rules:

- None.

### Human Animal Interaction (`Human_Animal_Interaction__c`)

- Purpose: Historical human-animal interaction record.
- Label: `Human Animal Interaction`
- Sharing model: `ReadWrite`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Human_Animal_Interaction__c`

| API name                        | Label                      | Type         | Description                                                                 |
| ------------------------------- | -------------------------- | ------------ | --------------------------------------------------------------------------- |
| `Animal_Episode__c`             | Animal Episode             | Lookup       | Episode linked to the interaction.                                          |
| `Animal_Response__c`            | Animal Response            | Picklist     | Observed animal response during the interaction.                            |
| `Animal__c`                     | Animal                     | Lookup       | Animal linked redundantly for direct reporting.                             |
| `Aversive_Stimulus_Observed__c` | Aversive Stimulus Observed | Checkbox     | Indicates whether an aversive stimulus was observed during the interaction. |
| `Follow_Up_Required__c`         | Follow Up Required         | Checkbox     | Flags whether the interaction requires follow-up.                           |
| `Human_Role__c`                 | Human Role                 | Picklist     | Role of the human participant.                                              |
| `Interaction_Contact__c`        | Interaction Contact        | Lookup       | Optional contact who participated in the interaction.                       |
| `Interaction_DateTime__c`       | Interaction Date Time      | DateTime     | Date and time of the interaction.                                           |
| `Interaction_Quality__c`        | Interaction Quality        | Picklist     | Quality of the interaction from the handler perspective.                    |
| `Interaction_Type__c`           | Interaction Type           | Picklist     | Type of interaction recorded.                                               |
| `Notes__c`                      | Notes                      | LongTextArea | Narrative notes captured for the interaction.                               |
| `Recorded_By__c`                | Recorded By                | Lookup       | User who recorded the interaction.                                          |
| `Restraint_Used__c`             | Restraint Used             | Checkbox     | Indicates whether restraint was used in the interaction.                    |
| `Reward_Used__c`                | Reward Used                | Checkbox     | Indicates whether a reward was used in the interaction.                     |

Validation rules:

- None.

### Template Domain Definition (`Template_Domain_Definition__c`)

- Purpose: Runtime domain row belonging to an assessment template.
- Label: `Template Domain Definition`
- Sharing model: `ControlledByParent`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Template_Domain_Definition__c`

| API name                 | Label               | Type         | Description                                                                  |
| ------------------------ | ------------------- | ------------ | ---------------------------------------------------------------------------- |
| `Assessment_Template__c` | Assessment Template | MasterDetail | Runtime template that owns the domain definition row.                        |
| `Default_Confidence__c`  | Default Confidence  | Picklist     | Default confidence level suggested for the domain summary.                   |
| `Display_Order__c`       | Display Order       | Number       | Runtime ordering for the domain within the template.                         |
| `Domain_Code__c`         | Domain Code         | Picklist     | Domain represented by the template row.                                      |
| `Guidance_Text__c`       | Guidance Text       | LongTextArea | Runtime guidance shown to assessors for the domain.                          |
| `Is_Required__c`         | Is Required         | Checkbox     | Marks the domain as required for completeness calculations.                  |
| `Metadata_Row_Key__c`    | Metadata Row Key    | Text         | System-maintained packaged row key used for idempotent seed synchronization. |

Validation rules:

- None.

### Template Indicator Assignment (`Template_Indicator_Assignment__c`)

- Purpose: Runtime indicator assignment row belonging to an assessment template.
- Label: `Template Indicator Assignment`
- Sharing model: `ControlledByParent`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Template_Indicator_Assignment__c`

| API name                    | Label                  | Type         | Description                                                                  |
| --------------------------- | ---------------------- | ------------ | ---------------------------------------------------------------------------- |
| `Assessment_Template__c`    | Assessment Template    | MasterDetail | Runtime template that owns the indicator assignment row.                     |
| `Default_Severity_Scale__c` | Default Severity Scale | Picklist     | Default severity-scale handling for the assignment.                          |
| `Display_Order__c`          | Display Order          | Number       | Runtime ordering for the indicator within the template.                      |
| `Domain_Code__c`            | Domain Code            | Picklist     | Domain grouping for the indicator assignment.                                |
| `Help_Text__c`              | Help Text              | LongTextArea | Runtime help text shown for the indicator assignment.                        |
| `Indicator_Key__c`          | Indicator Key          | Text         | Stable indicator key assigned to the template.                               |
| `Is_Required__c`            | Is Required            | Checkbox     | Marks the indicator as required for assessment completeness.                 |
| `Metadata_Row_Key__c`       | Metadata Row Key       | Text         | System-maintained packaged row key used for idempotent seed synchronization. |
| `Visible_When_Rule__c`      | Visible When Rule      | LongTextArea | Optional visibility rule interpreted by the assessment-entry component.      |

Validation rules:

- None.

### Welfare Assessment (`Welfare_Assessment__c`)

- Purpose: Historical welfare assessment event linked to an animal episode.
- Label: `Welfare Assessment`
- Sharing model: `ControlledByParent`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Welfare_Assessment__c`

| API name                           | Label                         | Type         | Description                                                                    |
| ---------------------------------- | ----------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `Animal_Episode__c`                | Animal Episode                | MasterDetail | Episode that owns the historical welfare assessment.                           |
| `Animal__c`                        | Animal                        | Lookup       | Animal linked redundantly for direct reporting and quick access.               |
| `Assessment_Context__c`            | Assessment Context            | Picklist     | Operational context in which the assessment occurred.                          |
| `Assessment_DateTime__c`           | Assessment Date Time          | DateTime     | When the assessment was completed or recorded.                                 |
| `Assessment_Status__c`             | Assessment Status             | Picklist     | Lifecycle state of the assessment record.                                      |
| `Assessment_Template__c`           | Assessment Template           | Lookup       | Runtime template used to capture the assessment.                               |
| `Assessment_Type__c`               | Assessment Type               | Picklist     | Type of assessment event.                                                      |
| `Assessor__c`                      | Assessor                      | Lookup       | User who completed or owns the assessment event.                               |
| `Completeness__c`                  | Completeness                  | Percent      | System-calculated completeness percentage for required domains and indicators. |
| `Confidence_Level__c`              | Confidence Level              | Picklist     | Overall confidence in the completed assessment.                                |
| `Domain_5_Mental_State_Summary__c` | Domain 5 Mental State Summary | LongTextArea | Narrative mental-state inference made from the combined evidence.              |
| `Immediate_Action_Required__c`     | Immediate Action Required     | Checkbox     | Flags assessments that require immediate escalation or intervention.           |
| `Next_Review_Date__c`              | Next Review Date              | Date         | Planned next welfare review date.                                              |
| `Overall_Negative_Grade__c`        | Overall Negative Grade        | Picklist     | Overall negative-grade summary for the assessment.                             |
| `Overall_Positive_Grade__c`        | Overall Positive Grade        | Picklist     | Overall positive-grade summary for the assessment.                             |
| `Overall_Welfare_Concern__c`       | Overall Welfare Concern       | Picklist     | Overall welfare concern assigned by metadata-driven risk evaluation.           |
| `Related_Case__c`                  | Related Case                  | Lookup       | Optional case linked to the welfare assessment.                                |
| `Risk_Evaluated_On__c`             | Risk Evaluated On             | DateTime     | Timestamp of the latest risk-evaluation pass for the assessment.               |
| `Template_Code_Snapshot__c`        | Template Code Snapshot        | Text         | Runtime template code captured when the assessment was completed.              |
| `Template_Key_Snapshot__c`         | Template Key Snapshot         | Text         | Packaged template key captured when the assessment was completed.              |
| `Template_Version_Snapshot__c`     | Template Version Snapshot     | Text         | Runtime template version captured when the assessment was completed.           |

Validation rules:

- `A360_Completed_Assessment_Req`: requires both assessor and assessment date/time for completed assessments.
- `A360_Immediate_Action_Requires_Concern`: disallows immediate action unless overall welfare concern is populated.

### Welfare Domain Summary (`Welfare_Domain_Summary__c`)

- Purpose: Historical per-domain summary captured as part of a welfare assessment.
- Label: `Welfare Domain Summary`
- Sharing model: `ControlledByParent`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Welfare_Domain_Summary__c`

| API name                   | Label                 | Type         | Description                                                                             |
| -------------------------- | --------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `Action_Required__c`       | Action Required       | Checkbox     | Flags that the domain summary identified required action.                               |
| `Action_Summary__c`        | Action Summary        | LongTextArea | Summary of the action required for the domain.                                          |
| `Assessment_Domain_Key__c` | Assessment Domain Key | Text         | System-maintained unique key that ensures one domain summary per domain per assessment. |
| `Confidence_Level__c`      | Confidence Level      | Picklist     | Confidence level for the domain summary.                                                |
| `Domain_Code__c`           | Domain Code           | Picklist     | Domain represented by the summary row.                                                  |
| `Inferred_Affects__c`      | Inferred Affects      | LongTextArea | Narrative inferred affects for the domain.                                              |
| `Key_Findings__c`          | Key Findings          | LongTextArea | Summary of the main findings for the domain.                                            |
| `Negative_Grade__c`        | Negative Grade        | Picklist     | Negative grade for the domain.                                                          |
| `Positive_Grade__c`        | Positive Grade        | Picklist     | Positive grade for the domain.                                                          |
| `Welfare_Assessment__c`    | Welfare Assessment    | MasterDetail | Assessment that owns the domain summary.                                                |

Validation rules:

- None.

### Welfare Observation (`Welfare_Observation__c`)

- Purpose: Historical evidence line captured as part of a welfare assessment.
- Label: `Welfare Observation`
- Sharing model: `ControlledByParent`
- Workstream: `Welfare And Care`
- Source: `force-app/main/default/objects/Welfare_Observation__c`

| API name                     | Label                   | Type         | Description                                                                                |
| ---------------------------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `Confidence_Level__c`        | Confidence Level        | Picklist     | Confidence level for the captured evidence line.                                           |
| `Domain_Code__c`             | Domain Code             | Picklist     | Domain grouping for the observation.                                                       |
| `Duration__c`                | Duration                | Picklist     | Observed duration of the evidence line where known.                                        |
| `Enhancement_Level__c`       | Enhancement Level       | Picklist     | Enhancement level assigned when positive welfare evidence is present.                      |
| `Evidence_Source__c`         | Evidence Source         | Picklist     | Source of the evidence captured in the observation.                                        |
| `Frequency__c`               | Frequency               | Picklist     | Observed frequency of the evidence line where known.                                       |
| `Indicator_Key__c`           | Indicator Key           | Text         | Stable indicator key used to interpret the observation historically.                       |
| `Indicator_Label__c`         | Indicator Label         | Text         | Indicator label captured at the time of observation for direct reporting.                  |
| `Intervention_Notes__c`      | Intervention Notes      | LongTextArea | Narrative intervention notes linked to the observation.                                    |
| `Observation_Key__c`         | Observation Key         | Text         | System-maintained unique key that ensures one observation per indicator per assessment.    |
| `Observation_Value_Type__c`  | Observation Value Type  | Picklist     | Explicit value type used by the observation so false booleans remain reportable and valid. |
| `Observed_Boolean__c`        | Observed Boolean        | Checkbox     | Boolean observation value when the indicator is boolean-based.                             |
| `Observed_DateTime__c`       | Observed Date Time      | DateTime     | Observed date/time value when the indicator is datetime-based.                             |
| `Observed_Numeric_Value__c`  | Observed Numeric Value  | Number       | Observed numeric value when the indicator is number-based.                                 |
| `Observed_Picklist_Value__c` | Observed Picklist Value | Text         | Observed picklist value when the indicator is picklist-based.                              |
| `Observed_Text__c`           | Observed Text           | LongTextArea | Observed narrative value when the indicator is text-based.                                 |
| `Requires_Intervention__c`   | Requires Intervention   | Checkbox     | Flags that the observation requires intervention or immediate follow-up.                   |
| `Severity_Level__c`          | Severity Level          | Picklist     | Severity level assigned when negative evidence is present.                                 |
| `Welfare_Assessment__c`      | Welfare Assessment      | MasterDetail | Assessment that owns the evidence line.                                                    |

Validation rules:

- `A360_Observation_Value_Required`: requires at least one observed value or an explicit boolean/value-type combination.

## Custom Metadata Type Definitions And Fields

These are packaged configuration definitions rather than runtime data objects.

### Animal360 Assessment Template Default (`Animal360_Assessment_Template_Default__mdt`)

- Purpose: Packaged runtime template defaults used by the seed service.
- Source: `force-app/main/default/objects/Animal360_Assessment_Template_Default__mdt`

| API name                 | Label               | Type         | Description                                                                              |
| ------------------------ | ------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `Assessment_Context__c`  | Assessment Context  | Text         | Assessment context targeted by the template.                                             |
| `Default_For_Species__c` | Default For Species | Checkbox     | Marks the packaged template as the default runtime template for its species and context. |
| `Description_Text__c`    | Description Text    | LongTextArea | Packaged description for the runtime template.                                           |
| `Species__c`             | Species             | Text         | Species targeted by the template.                                                        |
| `Status__c`              | Status              | Text         | Packaged runtime status, such as Active or Retired.                                      |
| `Template_Code__c`       | Template Code       | Text         | Runtime template code exposed to admins and reports.                                     |
| `Template_Key__c`        | Template Key        | Text         | Stable packaged template key used by the seed service.                                   |
| `Template_Label__c`      | Template Label      | Text         | User-facing label for the seeded runtime template.                                       |
| `Version__c`             | Version             | Text         | Runtime version identifier for the packaged template.                                    |

### Animal360 Automation Setting (`Animal360_Automation_Setting__mdt`)

- Purpose: Global automation defaults used by assessment, care-plan, and reminder services.
- Source: `force-app/main/default/objects/Animal360_Automation_Setting__mdt`

| API name                    | Label                  | Type     | Description                                                           |
| --------------------------- | ---------------------- | -------- | --------------------------------------------------------------------- |
| `Auto_Create_Care_Plan__c`  | Auto Create Care Plan  | Checkbox | Enables care-plan auto creation for matching high-risk assessments.   |
| `Create_Reminder_Tasks__c`  | Create Reminder Tasks  | Checkbox | Enables scheduled reminder task generation.                           |
| `Default_Action_Type__c`    | Default Action Type    | Text     | Default action type used for generated care-plan actions.             |
| `Default_Care_Plan_Type__c` | Default Care Plan Type | Text     | Default care-plan type used for automated escalation plans.           |
| `Default_Review_Days__c`    | Default Review Days    | Number   | Fallback review interval used when no status transition rule applies. |
| `Reminder_Lead_Days__c`     | Reminder Lead Days     | Number   | How many days in advance reminder tasks should be created.            |
| `Setting_Key__c`            | Setting Key            | Text     | Stable setting key used by runtime services.                          |

### Animal360 Domain Definition (`Animal360_Domain_Definition__mdt`)

- Purpose: Five Domains catalogue used to seed runtime templates and reporting semantics.
- Source: `force-app/main/default/objects/Animal360_Domain_Definition__mdt`

| API name                    | Label                  | Type         | Description                                                       |
| --------------------------- | ---------------------- | ------------ | ----------------------------------------------------------------- |
| `Display_Order__c`          | Display Order          | Number       | Runtime order for presenting domains.                             |
| `Domain_Code__c`            | Domain Code            | Text         | Stable domain code used across templates.                         |
| `Domain_Label__c`           | Domain Label           | Text         | User-facing domain label.                                         |
| `Guidance_Text__c`          | Guidance Text          | LongTextArea | Packaged guidance shown when the domain is presented at runtime.  |
| `Is_Active__c`              | Is Active              | Checkbox     | Enables the domain for seeding and runtime selection.             |
| `Is_Mental_State_Domain__c` | Is Mental State Domain | Checkbox     | Marks the domain used for Domain 5 mental-state summary handling. |

### Animal360 Indicator Definition (`Animal360_Indicator_Definition__mdt`)

- Purpose: Indicator catalogue used for runtime assessment rendering and persistence.
- Source: `force-app/main/default/objects/Animal360_Indicator_Definition__mdt`

| API name             | Label           | Type         | Description                                                         |
| -------------------- | --------------- | ------------ | ------------------------------------------------------------------- |
| `Domain_Code__c`     | Domain Code     | Text         | Domain code associated with the indicator definition.               |
| `Help_Text__c`       | Help Text       | LongTextArea | Runtime help text shown during assessment entry.                    |
| `Indicator_Key__c`   | Indicator Key   | Text         | Stable indicator key used in template assignments and observations. |
| `Indicator_Label__c` | Indicator Label | Text         | User-facing label for the indicator.                                |
| `Is_Active__c`       | Is Active       | Checkbox     | Enables the indicator for packaged template seeding.                |
| `Value_Type__c`      | Value Type      | Picklist     | Primary runtime value type for the indicator.                       |

### Animal360 Indicator Value Option (`Animal360_Indicator_Value_Option__mdt`)

- Purpose: Picklist-style value options used by indicator definitions.
- Source: `force-app/main/default/objects/Animal360_Indicator_Value_Option__mdt`

| API name                       | Label                     | Type   | Description                                                   |
| ------------------------------ | ------------------------- | ------ | ------------------------------------------------------------- |
| `Default_Enhancement_Level__c` | Default Enhancement Level | Text   | Optional default enhancement hint associated with the option. |
| `Default_Severity_Level__c`    | Default Severity Level    | Text   | Optional default severity hint associated with the option.    |
| `Display_Order__c`             | Display Order             | Number | Runtime ordering for the option.                              |
| `Indicator_Key__c`             | Indicator Key             | Text   | Indicator key that owns the option.                           |
| `Option_Label__c`              | Option Label              | Text   | Displayed option label.                                       |
| `Option_Value__c`              | Option Value              | Text   | Stored option value.                                          |

### Animal360 Risk Rule (`Animal360_Risk_Rule__mdt`)

- Purpose: Metadata-driven rules for evaluating welfare risk from observations.
- Source: `force-app/main/default/objects/Animal360_Risk_Rule__mdt`

| API name                     | Label                   | Type     | Description                                                                       |
| ---------------------------- | ----------------------- | -------- | --------------------------------------------------------------------------------- |
| `Auto_Create_Care_Plan__c`   | Auto Create Care Plan   | Checkbox | Requests care-plan auto creation when the rule matches and automation is enabled. |
| `Indicator_Key__c`           | Indicator Key           | Text     | Optional indicator key that must match for the rule to fire.                      |
| `Is_Active__c`               | Is Active               | Checkbox | Enables the risk rule for runtime evaluation.                                     |
| `Observed_Picklist_Value__c` | Observed Picklist Value | Text     | Optional observed picklist value that must match.                                 |
| `Requires_Intervention__c`   | Requires Intervention   | Checkbox | Requires the observation intervention flag when selected.                         |
| `Result_Welfare_Risk__c`     | Result Welfare Risk     | Text     | Welfare risk level assigned when the rule matches.                                |
| `Rule_Order__c`              | Rule Order              | Number   | Evaluation order for the rule.                                                    |
| `Severity_Level__c`          | Severity Level          | Text     | Optional severity level that must match.                                          |

### Animal360 Species Template (`Animal360_Species_Template__mdt`)

- Purpose: Maps species and assessment context to a packaged template key.
- Source: `force-app/main/default/objects/Animal360_Species_Template__mdt`

| API name                | Label              | Type     | Description                                                          |
| ----------------------- | ------------------ | -------- | -------------------------------------------------------------------- |
| `Assessment_Context__c` | Assessment Context | Text     | Assessment context used for template resolution.                     |
| `Is_Active__c`          | Is Active          | Checkbox | Enables the species mapping for runtime resolution.                  |
| `Is_Default__c`         | Is Default         | Checkbox | Marks the packaged default mapping for the species and context.      |
| `Priority__c`           | Priority           | Number   | Higher-priority mappings win when multiple records match.            |
| `Species__c`            | Species            | Text     | Species label used for runtime template resolution.                  |
| `Template_Key__c`       | Template Key       | Text     | Stable template key that resolves to a packaged template definition. |

### Animal360 Status Transition Rule (`Animal360_Status_Transition_Rule__mdt`)

- Purpose: Maps welfare-risk levels to episode state, priority, and review timing.
- Source: `force-app/main/default/objects/Animal360_Status_Transition_Rule__mdt`

| API name                 | Label               | Type     | Description                                                     |
| ------------------------ | ------------------- | -------- | --------------------------------------------------------------- |
| `Action_Label__c`        | Action Label        | Text     | Short action guidance label used in escalation messaging.       |
| `Clinical_Priority__c`   | Clinical Priority   | Text     | Clinical priority set on the episode for the target risk level. |
| `Is_Active__c`           | Is Active           | Checkbox | Enables the transition rule for runtime use.                    |
| `Review_Days__c`         | Review Days         | Number   | Days until next review for the target risk level.               |
| `Target_Welfare_Risk__c` | Target Welfare Risk | Text     | Target welfare risk level produced by assessment evaluation.    |

### Animal360 Template Indicator Default (`Animal360_Template_Indicator_Default__mdt`)

- Purpose: Indicator assignments used to seed editable runtime template rows.
- Source: `force-app/main/default/objects/Animal360_Template_Indicator_Default__mdt`

| API name                    | Label                  | Type         | Description                                                              |
| --------------------------- | ---------------------- | ------------ | ------------------------------------------------------------------------ |
| `Default_Severity_Scale__c` | Default Severity Scale | Text         | Default severity scale handling for the assignment.                      |
| `Display_Order__c`          | Display Order          | Number       | Runtime ordering for the indicator within the template.                  |
| `Domain_Code__c`            | Domain Code            | Text         | Domain code used to group the indicator at runtime.                      |
| `Help_Text__c`              | Help Text              | LongTextArea | Packaged help text shown for the template assignment.                    |
| `Indicator_Key__c`          | Indicator Key          | Text         | Indicator key assigned to the template.                                  |
| `Is_Required__c`            | Is Required            | Checkbox     | Marks the indicator as required for completeness calculations.           |
| `Template_Key__c`           | Template Key           | Text         | Packaged template key that owns the assignment.                          |
| `Visible_When_Rule__c`      | Visible When Rule      | LongTextArea | Optional runtime visibility rule interpreted by the assessment-entry UI. |

## Metadata-Driven Rule And Configuration Records

Source: `force-app/main/default/customMetadata`

### Assessment Template Defaults

| Record name            | What it governs                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPANION_ROUTINE_V1` | Active packaged default template for companion-animal routine welfare assessments; labeled `Companion Routine V1`, version `1.0`, marked default-for-species. |

### Automation Settings

| Record name | What it governs                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DEFAULT`   | Global automation defaults: auto-create care plans `true`, create reminder tasks `true`, default review days `14`, reminder lead days `1`, default care plan type `Escalation`, default action type `Review Assessment`. |

### Domain Definitions

| Record names                                                                     | What they govern                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `D1_Nutrition`, `D2_Environment`, `D3_Health`, `D4_Behaviour`, `D5_Mental_State` | The active Five Domains catalogue used by templates and reporting. |

### Indicator Definitions

| Record names                                                                                            | What they govern                                                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `APPETITE`, `CLINICAL_SIGNS`, `FEAR_STRESS`, `HYDRATION_ACCESS`, `RESTING_COMFORT`, `SOCIAL_ENGAGEMENT` | The active indicator catalogue, including domain association and value-type handling. |

### Indicator Value Options

| Record family         | What it governs                                      |
| --------------------- | ---------------------------------------------------- |
| `APPETITE_*`          | Picklist values for the appetite indicator.          |
| `CLINICAL_SIGNS_*`    | Picklist values for the clinical-signs indicator.    |
| `FEAR_STRESS_*`       | Picklist values for the fear/stress indicator.       |
| `RESTING_COMFORT_*`   | Picklist values for the resting-comfort indicator.   |
| `SOCIAL_ENGAGEMENT_*` | Picklist values for the social-engagement indicator. |

### Risk Rules

| Record name   | What it governs                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Risk_Rule_1` | `CLINICAL_SIGNS = Critical` results in welfare risk `Critical`; auto-create care plan enabled.                        |
| `Risk_Rule_2` | `CLINICAL_SIGNS = Severe` results in welfare risk `High`; auto-create care plan enabled.                              |
| `Risk_Rule_3` | `FEAR_STRESS = Panicked` results in welfare risk `High`; auto-create care plan enabled.                               |
| `Risk_Rule_4` | `APPETITE = Absent` results in welfare risk `High`; auto-create care plan enabled.                                    |
| `Risk_Rule_5` | Any observation with `Severity_Level__c = High` results in welfare risk `High`; auto-create care plan enabled.        |
| `Risk_Rule_6` | Any observation with `Requires_Intervention__c = true` results in welfare risk `High`; auto-create care plan enabled. |

### Status Transition Rules

| Record name           | What it governs                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Low_Transition`      | Maps welfare risk `Low` to clinical priority `Routine`, review in 30 days, action label `Continue routine monitoring`.        |
| `Moderate_Transition` | Maps welfare risk `Moderate` to clinical priority `Soon`, review in 14 days, action label `Schedule follow-up review`.        |
| `High_Transition`     | Maps welfare risk `High` to clinical priority `Urgent`, review in 3 days, action label `Escalate to care manager`.            |
| `Critical_Transition` | Maps welfare risk `Critical` to clinical priority `Emergency`, review in 1 day, action label `Immediate escalation required`. |

### Species To Template Mappings

| Record name              | What it governs                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `Dog_Routine_Default`    | Default template resolution for `Dog` + `Routine` to template key `COMPANION_ROUTINE_V1` with priority `1`.    |
| `Cat_Routine_Default`    | Default template resolution for `Cat` + `Routine` to template key `COMPANION_ROUTINE_V1` with priority `2`.    |
| `Rabbit_Routine_Default` | Default template resolution for `Rabbit` + `Routine` to template key `COMPANION_ROUTINE_V1` with priority `3`. |

### Template Indicator Defaults

| Record name                              | What it governs                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `COMPANION_ROUTINE_V1_APPETITE`          | `APPETITE` in `D1_Nutrition`; required; display order `10`; default severity scale `Negative`. |
| `COMPANION_ROUTINE_V1_HYDRATION_ACCESS`  | `HYDRATION_ACCESS` in `D1_Nutrition`; template-configured indicator defaults.                  |
| `COMPANION_ROUTINE_V1_RESTING_COMFORT`   | `RESTING_COMFORT` in `D2_Environment`; template-configured indicator defaults.                 |
| `COMPANION_ROUTINE_V1_CLINICAL_SIGNS`    | `CLINICAL_SIGNS` in `D3_Health`; template-configured indicator defaults.                       |
| `COMPANION_ROUTINE_V1_FEAR_STRESS`       | `FEAR_STRESS` in `D4_Behaviour`; template-configured indicator defaults.                       |
| `COMPANION_ROUTINE_V1_SOCIAL_ENGAGEMENT` | `SOCIAL_ENGAGEMENT` in `D4_Behaviour`; template-configured indicator defaults.                 |

## Notes For Future Audits

- If this inventory changes materially, regenerate the metadata-backed sections by reviewing:
  - `scripts/generate-phase1-metadata.mjs`
  - `scripts/generate-phase2-metadata.mjs`
  - `scripts/generate-phase2-security-reporting.mjs`
- Runtime behavior should be cross-checked against:
  - the Apex services in `force-app/main/default/classes`
  - the flows in `force-app/main/default/flows`
  - the LWC bundle `force-app/main/default/lwc/a360WelfareAssessmentEntry`
