# Animal360 Data Model

This page documents the Animal360 application architecture in the style of the Salesforce Data Model Gallery. It summarizes the core entities, relationships, and implementation status for the connected `animal360` Salesforce org.

Entities and relationships for managing animal identity, time-bounded care episodes, housing, welfare evidence, assessments, interventions, constituents, and current-state reporting.

Animal, Animal Episode, Animal Location Stay, Housing Unit, Intake Event, Outcome Event, Assessment Template, Template Domain Definition, Template Indicator Assignment, Welfare Assessment, Welfare Observation, Welfare Domain Summary, Care Plan, Care Plan Action, Clinical Event, Human Animal Interaction, Account, Person Account, Contact, Case

See [Salesforce Data Model Notation](https://developer.salesforce.com/docs/platform/data-models/guide/salesforce-data-model-notation.html).

![Animal360 Salesforce data model](animal360-data-model-salesforce-style.png)

## Scope

Animal360 is implemented as a single-package Salesforce DX application rooted at `force-app`. The current model covers Phase I operational care tracking and Phase II welfare evidence capture.

Phase I establishes the foundational operational model:

- animal identity
- time-bounded care episodes
- housing and location stays
- intake, movement, and outcome events
- current-state rollups

Phase II adds the welfare intelligence layer:

- metadata-driven assessment templates
- structured observations aligned to the Five Domains model
- domain summaries and inferred mental-state summary
- risk evaluation
- care plans and care-plan actions
- clinical and human-animal interaction records

## Implementation Status

The connected `animal360` org was inspected with Salesforce CLI against API version 66.0.

| Area                      | Status  | Evidence                                                                                                                                                                                       |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core runtime objects      | Present | 21 runtime custom objects exist in the org, including Phase I/II care objects and estate whiteboard objects.                                                                                   |
| Phase I operations        | Present | `Animal__c`, `Animal_Episode__c`, `Animal_Location_Stay__c`, `Housing_Unit__c`, `Intake_Event__c`, and `Outcome_Event__c` are deployed.                                                        |
| Phase II welfare evidence | Present | `Welfare_Assessment__c`, `Welfare_Observation__c`, `Welfare_Domain_Summary__c`, `Assessment_Template__c`, `Care_Plan__c`, `Clinical_Event__c`, and `Human_Animal_Interaction__c` are deployed. |
| Active automation         | Present | 11 `A360_*` flows have active versions in the org.                                                                                                                                             |
| Apex service layer        | Present | 16 `A360*` Apex classes are deployed: 12 runtime service/handler classes plus 4 Apex test classes covering Phase I, Phase II, and estate whiteboard behavior.                                  |
| Security model            | Present | 7 permission sets, 5 permission set groups, and 4 custom permissions are deployed, covering operational, welfare, clinical, read-only, and estate-map access.                                  |
| Runtime template seed     | Present | The org has 1 runtime assessment template, 5 domain definitions, and 6 indicator assignments.                                                                                                  |
| Packaged configuration    | Present | Custom metadata includes 5 domain definitions, 6 indicator definitions, and 6 risk rules.                                                                                                      |
| Estate whiteboard         | Present | Estate map metadata, mapped housing areas, visual animal cards, drag-to-move, and add-animal placement are deployed.                                                                           |

## Architecture Principles

Animal360 follows the principles from the Phase I and Phase II foundation documents.

| Principle                                | Implementation                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model reality first                      | The data model separates identity, care context, location, events, evidence, interpretation, and action.                                                                                                     |
| Episode-based architecture               | `Animal_Episode__c` is the parent context for operational events, location stays, welfare assessments, care plans, clinical events, and interactions.                                                        |
| Objective evidence before interpretation | `Welfare_Observation__c` stores observed values; `Welfare_Domain_Summary__c` stores interpretation by domain; `Welfare_Assessment__c` stores the overall assessment and Domain 5 mental-state summary.       |
| Location as a first-class entity         | `Housing_Unit__c` and `Animal_Location_Stay__c` model environment and time-based placement separately from animal identity.                                                                                  |
| Events as records                        | Intake and outcome are modeled as event records, and movement is represented through location stay start and end times.                                                                                      |
| Metadata-driven design                   | Custom metadata stores packaged domain, indicator, option, template, risk, automation, species, and status transition configuration. Runtime template records provide active org-level assessment structure. |
| Salesforce standard object reuse         | `Account`, Person Accounts, `Contact`, and `Case` are extended instead of duplicated for organizations, individuals, people, and welfare or operational issues.                                              |

## CRM and Person Accounts

The connected org has Person Accounts enabled. This is represented in Salesforce as an `Account` record type, not as a separate object. The org includes active `Account` record types for `Business_Account` and `PersonAccount`; the `Account` object also exposes `IsPersonAccount`, `PersonContactId`, `PersonEmail`, and `PersonMobilePhone`.

Animal360 uses this CRM layer as follows:

- `Account` represents organizations, sites, partners, owner/adopter households, and Person Account individuals.
- Person Accounts are Account records with a Salesforce-managed linked Contact through `Account.PersonContactId`.
- `Contact` remains part of the model for business contacts, clinicians, interaction participants, and responsible contacts.
- `Animal__c.Responsible_Account__c` and `Animal__c.Responsible_Contact__c` keep animal responsibility explicit.
- `Animal__c.Primary_Image_URL__c` stores the primary image reference used by visual animal tags and detail cards.
- Animal visual formula fields render the profile image, welfare rating, lifecycle signal, and care signal on the record page from existing operational data.
- `Intake_Event__c`, `Animal_Episode__c`, `Clinical_Event__c`, and `Human_Animal_Interaction__c` use Account and Contact lookups where the operational event needs responsible, outcome, clinician, or interaction context.

## Estate Whiteboard And Visual Placement

The estate whiteboard is an operational view layered on top of the core episode and location-stay model. It does not replace the canonical placement history. Instead, it maps active `Animal_Location_Stay__c` records to visual areas through each area's linked `Housing_Unit__c`.

Key implementation points:

- `A360_Estate_Map__c` stores the board canvas, default/published state, and background style.
- `A360_Map_Area__c` stores each visible area, its geometry, label, operational status, and optional housing-unit mapping.
- `A360_Map_Connection__c` stores optional visual relationships between areas.
- `A360EstateMapService.moveAnimal()` closes any current stay and creates the destination stay for the selected housing unit.
- `A360EstateMapService.searchAnimalsForArea()` finds current-care animals that can be added to the selected area, including animals not currently visible on the board.
- `c:a360EstateMap` renders visual animal tokens, image-backed animal tags, detail drilldown, area status controls, drag-to-move, and the add-animal picker.
- `c:a360AnimalVisualPanel` renders the Animal record-page visual summary from `Animal__c` current-state fields and `Primary_Image_URL__c`.

## Entity Relationship Overview

```mermaid
erDiagram
    Account ||--o{ Contact : business_contacts
    Account ||--|| Contact : person_contact
    Account ||--o{ Housing_Unit__c : site_account
    Account ||--o{ Animal__c : responsible_for
    Contact ||--o{ Animal__c : responsible_for
    Account ||--o{ Intake_Event__c : responsible_account
    Contact ||--o{ Intake_Event__c : responsible_contact
    Account ||--o{ Animal_Episode__c : outcome_account
    Contact ||--o{ Animal_Episode__c : outcome_contact
    Animal__c ||--o{ Animal_Episode__c : has
    Animal__c ||--o{ Animal_Identifier__c : has
    Animal__c ||--o{ Animal_Relationship__c : relates_from_to
    Animal_Episode__c ||--o{ Intake_Event__c : records
    Animal_Episode__c ||--o{ Outcome_Event__c : closes_with
    Animal_Episode__c ||--o{ Animal_Location_Stay__c : contains
    Housing_Unit__c ||--o{ Animal_Location_Stay__c : houses
    Housing_Unit__c ||--o{ Case : contextualizes
    Animal_Episode__c ||--o{ Welfare_Assessment__c : assessed_by
    Assessment_Template__c ||--o{ Template_Domain_Definition__c : defines
    Assessment_Template__c ||--o{ Template_Indicator_Assignment__c : assigns
    Assessment_Template__c ||--o{ Welfare_Assessment__c : structures
    Welfare_Assessment__c ||--o{ Welfare_Observation__c : contains
    Welfare_Assessment__c ||--o{ Welfare_Domain_Summary__c : summarizes
    Welfare_Assessment__c ||--o{ Care_Plan__c : informs
    Animal_Episode__c ||--o{ Care_Plan__c : has
    Care_Plan__c ||--o{ Care_Plan_Action__c : contains
    Animal_Episode__c ||--o{ Clinical_Event__c : has
    Contact ||--o{ Clinical_Event__c : clinician
    Case ||--o{ Clinical_Event__c : relates_to
    Animal_Episode__c ||--o{ Human_Animal_Interaction__c : has
    Animal__c ||--o{ Human_Animal_Interaction__c : participates_in
    Contact ||--o{ Human_Animal_Interaction__c : interaction_contact
    Animal__c ||--o{ Case : relates_to
    Animal_Episode__c ||--o{ Case : relates_to
    Case ||--o{ Welfare_Assessment__c : relates_to
```

## Core Entities

### Animal

Represents the animal identity record. Animal identity is intentionally separate from care context, location, assessments, and events.

Key CRM fields include:

- `Responsible_Account__c`
- `Responsible_Contact__c`

Key related entities:

- Animal Episode
- Animal Identifier
- Animal Relationship
- Human Animal Interaction

### Animal Episode

Represents a time-bounded context of care. This object is the backbone of the model and is the primary parent for operational and welfare activity.

Key fields include:

- `Animal__c`
- `Episode_Type__c`
- `Episode_Status__c`
- `Intake_DateTime__c`
- `End_DateTime__c`
- `Current_Location_Stay__c`
- `Current_Welfare_Level__c`
- `Current_Clinical_Priority__c`
- `Next_Review_Date__c`

Key related entities:

- Intake Event
- Outcome Event
- Animal Location Stay
- Welfare Assessment
- Care Plan
- Clinical Event
- Human Animal Interaction

### Housing Unit

Represents a physical or operational housing location. Housing is modeled independently so capacity and environment can be managed without flattening location state onto the animal record.

Key related entities:

- Animal Location Stay
- Account

### Animal Location Stay

Represents a time-bounded placement of an animal episode in a housing unit.

Key fields include:

- `Animal_Episode__c`
- `Housing_Unit__c`
- `Start_DateTime__c`
- `End_DateTime__c`
- `Is_Current__c`
- `Move_Reason__c`

### Welfare Assessment

Represents a structured welfare assessment for an animal in a specific episode.

Key fields include:

- `Animal_Episode__c`
- `Animal__c`
- `Assessment_Template__c`
- `Assessment_DateTime__c`
- `Assessment_Type__c`
- `Assessment_Status__c`
- `Overall_Welfare_Concern__c`
- `Domain_5_Mental_State_Summary__c`
- `Immediate_Action_Required__c`

### Welfare Observation

Represents objective evidence captured during an assessment. Observations support multiple value types so indicator definitions can remain metadata-driven.

Key fields include:

- `Welfare_Assessment__c`
- `Indicator_Key__c`
- `Domain_Code__c`
- `Observed_Boolean__c`
- `Observed_Picklist_Value__c`
- `Observed_Numeric_Value__c`
- `Observed_Text__c`
- `Severity_Level__c`
- `Enhancement_Level__c`
- `Evidence_Source__c`
- `Requires_Intervention__c`

### Welfare Domain Summary

Represents the interpreted summary for one Five Domains domain in an assessment.

Key fields include:

- `Welfare_Assessment__c`
- `Domain_Code__c`
- `Negative_Grade__c`
- `Positive_Grade__c`
- `Key_Findings__c`
- `Inferred_Affects__c`
- `Action_Required__c`

### Assessment Template

Represents the runtime assessment structure used by active assessment entry.

Key related entities:

- Template Domain Definition
- Template Indicator Assignment
- Welfare Assessment

### Care Plan

Represents an intervention plan linked to an episode and optionally sourced from a welfare assessment.

Key fields include:

- `Animal_Episode__c`
- `Primary_Assessment__c`
- `Plan_Type__c`
- `Status__c`
- `Primary_Goal__c`
- `Success_Criteria__c`

### Care Plan Action

Represents a task or intervention within a care plan.

Key related entity:

- Care Plan

### Clinical Event

Represents a clinical observation, treatment, or follow-up event linked to an animal episode and animal.

### Human Animal Interaction

Represents Domain 4 interaction evidence, including interaction type, human role, interaction quality, animal response, and follow-up indicators.

## Automation Model

Animal360 uses flows for orchestration and Apex services for integrity, persistence, and metadata-driven logic.

Primary operational flows:

- `A360_Intake_Flow`
- `A360_Move_Animal_Flow`
- `A360_Close_Episode_Flow`
- `A360_Animal_Current_State_Rollup_Flow`
- `A360_Episode_Current_State_Trigger_Flow`
- `A360_Location_Stay_Current_State_Trigger_Flow`

Primary welfare flows:

- `A360_Welfare_Assessment_Flow`
- `A360_Assessment_Risk_Evaluation_Flow`
- `A360_Create_Care_Plan_Flow`
- `A360_Care_Plan_Auto_Create_Flow`
- `A360_Review_Due_Reminder_Flow`

Primary Apex service areas:

- animal and episode integrity
- current-state rollups
- assessment template seeding and guardrails
- assessment payload persistence
- risk evaluation
- care plan creation
- review reminder generation

## Reporting Model

The reporting model follows the same entity boundaries as the operational model.

Included custom report types cover:

- animals with episodes
- episodes with location stays
- housing units with location stays
- episodes with welfare assessments
- welfare assessments with observations
- episodes with care plans
- episodes with clinical events
- episodes with human-animal interactions

## Security Model

Animal360 uses permission sets rather than profile-centric access.

Packaged permission sets:

- `Animal360_Admin`
- `Animal360_Care_Manager`
- `Animal360_Assessor`
- `Animal360_Clinical_User`
- `Animal360_Read_Only`
- `Animal360_Estate_Map_Manager`
- `Animal360_Estate_Map_Viewer`

Packaged permission set groups:

- `Animal360_Admin_Group`
- `Animal360_Care_Manager_Group`
- `Animal360_Assessor_Group`
- `Animal360_Clinical_User_Group`
- `Animal360_Read_Only_Group`

Custom permissions:

- `A360_Manage_Assessment_Templates`
- `A360_Manage_Estate_Maps`
- `A360_Move_Animals`
- `A360_Welfare_Escalation_Override`

Estate-map access is split from the core welfare personas. `Animal360_Estate_Map_Manager` grants map administration and animal movement permissions, while `Animal360_Estate_Map_Viewer` grants read-only access to estate maps, mapped areas, and current animal placement context.

## Notes

The included PNG is rendered from `docs/animal360-data-model-salesforce-style.svg` so the published image and source diagram can be reviewed together.
