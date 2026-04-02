# Phase II Build Backlog

## Baseline

- Phase I metadata, Apex integrity services, and the shared `A360_Animal_Current_State_Rollup_Flow` are already present in `force-app/main/default`.
- No separate package-structure document exists in the repo, so package assumptions are recorded in `docs/phase2-implementation-assumptions.md`.
- Phase II delivery remains single-package DX metadata rooted at `force-app`.

## Delivery Spine

1. Template architecture
2. Metadata and template configuration
3. Evidence schema
4. Action and event schema
5. Security and reporting baseline
6. Assessment and risk automation
7. Release gate

## Ordered Backlog

### Batch 0: Architecture and deployment guardrail

- Docs:
  - `docs/phase2-implementation-assumptions.md`
  - `docs/phase2-build-backlog.md`
- Manifest:
  - expand `manifest/package.xml` for `CustomMetadata`, `CustomPermission`, `Dashboard`, `DashboardFolder`, `LightningComponentBundle`, and `ListView`
- Apex:
  - phase II seed and service entry points
- Validation:
  - confirm package path remains `force-app`
  - confirm deployment target alias remains `animal360`

### Batch 1: Metadata-driven configuration foundation

- Global value sets:
  - `globalValueSets/A360_Negative_Grade.globalValueSet-meta.xml`
  - `globalValueSets/A360_Positive_Grade.globalValueSet-meta.xml`
  - `globalValueSets/A360_Confidence_Level.globalValueSet-meta.xml`
  - `globalValueSets/A360_Domain_Code.globalValueSet-meta.xml`
  - `globalValueSets/A360_Clinical_Priority.globalValueSet-meta.xml`
  - `globalValueSets/A360_Interaction_Quality.globalValueSet-meta.xml`
  - `globalValueSets/A360_Animal_Response.globalValueSet-meta.xml`
- Custom metadata type definitions:
  - `objects/Animal360_Domain_Definition__mdt/**`
  - `objects/Animal360_Species_Template__mdt/**`
  - `objects/Animal360_Indicator_Definition__mdt/**`
  - `objects/Animal360_Indicator_Value_Option__mdt/**`
  - `objects/Animal360_Assessment_Template_Default__mdt/**`
  - `objects/Animal360_Template_Indicator_Default__mdt/**`
  - `objects/Animal360_Risk_Rule__mdt/**`
  - `objects/Animal360_Automation_Setting__mdt/**`
  - `objects/Animal360_Status_Transition_Rule__mdt/**`
- Custom metadata default records:
  - `customMetadata/Animal360_Domain_Definition.*.md-meta.xml`
  - `customMetadata/Animal360_Indicator_Definition.*.md-meta.xml`
  - `customMetadata/Animal360_Indicator_Value_Option.*.md-meta.xml`
  - `customMetadata/Animal360_Assessment_Template_Default.*.md-meta.xml`
  - `customMetadata/Animal360_Template_Indicator_Default.*.md-meta.xml`
  - `customMetadata/Animal360_Species_Template.*.md-meta.xml`
  - `customMetadata/Animal360_Risk_Rule.*.md-meta.xml`
  - `customMetadata/Animal360_Automation_Setting.*.md-meta.xml`
  - `customMetadata/Animal360_Status_Transition_Rule.*.md-meta.xml`

### Batch 2: Runtime template layer

- Custom objects:
  - `objects/Assessment_Template__c/**`
  - `objects/Template_Domain_Definition__c/**`
  - `objects/Template_Indicator_Assignment__c/**`
- Validation and activation controls:
  - template default uniqueness
  - template status guardrails
- UX metadata:
  - `layouts/Assessment_Template__c-Assessment Template Layout.layout-meta.xml`
  - `layouts/Template_Domain_Definition__c-Template Domain Definition Layout.layout-meta.xml`
  - `layouts/Template_Indicator_Assignment__c-Template Indicator Assignment Layout.layout-meta.xml`
  - `tabs/Assessment_Template__c.tab-meta.xml`
  - `tabs/Template_Domain_Definition__c.tab-meta.xml`
  - `tabs/Template_Indicator_Assignment__c.tab-meta.xml`
  - `objects/*/listViews/**` for admin maintenance
- Apex:
  - template seed and sync service
  - template activation and uniqueness service

### Batch 3: Evidence schema and current-state extensions

- Phase II extensions to existing objects:
  - `objects/Animal_Episode__c/fields/Current_Welfare_Level__c.field-meta.xml`
  - `objects/Animal_Episode__c/fields/Current_Clinical_Priority__c.field-meta.xml`
  - `objects/Animal_Episode__c/fields/Next_Review_Date__c.field-meta.xml`
  - related layout updates on `Animal__c` and `Animal_Episode__c`
- Custom objects:
  - `objects/Welfare_Assessment__c/**`
  - `objects/Welfare_Domain_Summary__c/**`
  - `objects/Welfare_Observation__c/**`
- Validation and uniqueness controls:
  - completed assessment required fields
  - one domain summary per domain per assessment
  - one observation per indicator per assessment
  - observation has at least one observed value
- UX metadata:
  - layouts
  - tabs
  - related-list visibility on episode and animal layouts

### Batch 4: Action and event schema

- Custom objects:
  - `objects/Care_Plan__c/**`
  - `objects/Care_Plan_Action__c/**`
  - `objects/Clinical_Event__c/**`
  - `objects/Human_Animal_Interaction__c/**`
- Validation and retention controls:
  - action completion rules
  - care plan status consistency
- UX metadata:
  - layouts
  - tabs
  - related-list updates for episode and assessment contexts

### Batch 5: Security and reporting baseline

- Custom permissions:
  - metadata-maintenance and escalation override permissions
- Permission sets:
  - `permissionsets/Animal360_Assessor.permissionset-meta.xml`
  - `permissionsets/Animal360_Clinical_User.permissionset-meta.xml`
  - updates to `Animal360_Admin`
  - updates to `Animal360_Care_Manager`
- App and navigation:
  - `applications/Animal_360.app-meta.xml`
  - new custom tabs for welfare and care-plan objects
- Report metadata:
  - phase II report types
  - phase II starter reports
  - dashboard folder and dashboards

### Batch 6: Assessment and risk automation

- Apex:
  - assessment payload persistence service
  - metadata-driven risk evaluation service
  - care-plan auto-create service
  - review reminder task service
  - rollup service updates for current welfare propagation
  - focused phase II test class coverage
- Lightning web components:
  - dynamic assessment-entry screen component bundle
- Flows:
  - `flows/A360_Welfare_Assessment_Flow.flow-meta.xml`
  - `flows/A360_Assessment_Risk_Evaluation_Flow.flow-meta.xml`
  - `flows/A360_Create_Care_Plan_Flow.flow-meta.xml`
  - `flows/A360_Care_Plan_Auto_Create_Flow.flow-meta.xml`
  - `flows/A360_Review_Due_Reminder_Flow.flow-meta.xml`
- Trigger and service updates:
  - template guardrails
  - optional duplicate-prevention or seed synchronization hooks

### Batch 7: Release gate

- Deployment:
  - clean metadata deploy
  - idempotent seed execution for baseline templates
- Validation:
  - Apex tests
  - permission smoke tests for assessor, clinical user, and admin
  - end-to-end scenarios:
    - intake a new animal
    - assign housing
    - move housing
    - close outcome
    - create welfare assessment
    - record critical observation
    - trigger escalation
    - create and complete care plan action
- Handoff:
  - residual risks
  - validated workstreams
  - follow-on items for Phase III
