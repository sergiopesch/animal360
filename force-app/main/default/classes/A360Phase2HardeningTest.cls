@IsTest
private class A360Phase2HardeningTest {
  @IsTest
  static void assessmentEntryContextResolvesOpenEpisodeAndTemplate() {
    A360AssessmentTemplateService.seedTemplates(true);
    Animal_Episode__c episodeRecord = createEpisode('Context Buddy', 'Dog');

    Test.startTest();
    A360AssessmentTemplateService.EntryContext context = A360AssessmentTemplateService.getAssessmentEntryContext(
      null,
      null,
      null
    );
    Test.stopTest();

    System.assertEquals('Routine', context.assessmentContext);
    System.assertEquals(
      String.valueOf(episodeRecord.Id),
      context.selectedEpisodeId
    );
    System.assertEquals('Dog', context.selectedSpecies);
    System.assertNotEquals(null, context.selectedTemplateId);
    System.assertNotEquals(null, context.template);
    System.assertEquals(5, context.template.domains.size());
    System.assert(!context.episodeOptions.isEmpty());
    System.assert(!context.templateOptions.isEmpty());
  }

  @IsTest
  static void templateResolutionFallsBackToDirectDefault() {
    Animal_Episode__c episodeRecord = createEpisode('Clinical Buddy', 'Dog');
    Assessment_Template__c clinicalTemplate = new Assessment_Template__c(
      Name = 'Dog Clinical Default',
      Template_Code__c = 'DOG_CLINICAL',
      Species__c = 'Dog',
      Context__c = 'Clinical',
      Version__c = '1.0',
      Status__c = 'Active',
      Default_For_Species__c = true
    );
    insert clinicalTemplate;

    Test.startTest();
    Id resolvedTemplateId = A360AssessmentTemplateService.resolveDefaultTemplateId(
      episodeRecord.Id,
      'Clinical'
    );
    Test.stopTest();

    System.assertEquals(clinicalTemplate.Id, resolvedTemplateId);
  }

  @IsTest
  static void saveAssessmentUsesDefaultsAndCalculatesPartialCompleteness() {
    A360AssessmentTemplateService.seedTemplates(true);
    Animal_Episode__c episodeRecord = createEpisode('Persistence Buddy', 'Dog');
    Assessment_Template__c templateRecord = [
      SELECT Id
      FROM Assessment_Template__c
      WHERE Metadata_Template_Key__c = 'COMPANION_ROUTINE_V1'
      LIMIT 1
    ];

    Map<String, Object> payload = new Map<String, Object>{
      'assessmentDateTime' => '2026-05-04T09:00:00.000Z',
      'assessmentContext' => 'Routine',
      'immediateActionRequired' => true,
      'nextReviewDate' => '2026-05-11',
      'observations' => new List<Object>{
        new Map<String, Object>{
          'indicatorKey' => 'APPETITE',
          'indicatorLabel' => 'Appetite',
          'domainCode' => 'D1_Nutrition',
          'observationValueType' => 'Picklist',
          'observedPicklistValue' => 'Reduced',
          'severityLevel' => 'Moderate',
          'requiresIntervention' => false
        }
      }
    };

    A360AssessmentPersistenceService.Request requestItem = new A360AssessmentPersistenceService.Request();
    requestItem.episodeId = episodeRecord.Id;
    requestItem.templateId = templateRecord.Id;
    requestItem.payloadJson = JSON.serialize(payload);

    Test.startTest();
    List<A360AssessmentPersistenceService.Result> results = A360AssessmentPersistenceService.saveAssessments(
      new List<A360AssessmentPersistenceService.Request>{ requestItem }
    );
    Test.stopTest();

    Welfare_Assessment__c assessmentRecord = [
      SELECT
        Assessment_Type__c,
        Assessment_Status__c,
        Completeness__c,
        Overall_Welfare_Concern__c,
        Next_Review_Date__c,
        Template_Code_Snapshot__c
      FROM Welfare_Assessment__c
      WHERE Id = :results[0].assessmentId
    ];
    System.assertEquals(1, results.size());
    System.assertEquals('Baseline', assessmentRecord.Assessment_Type__c);
    System.assertEquals('Completed', assessmentRecord.Assessment_Status__c);
    System.assertEquals(20, assessmentRecord.Completeness__c);
    System.assertEquals('High', assessmentRecord.Overall_Welfare_Concern__c);
    System.assertEquals(
      Date.newInstance(2026, 5, 11),
      assessmentRecord.Next_Review_Date__c
    );
    System.assertNotEquals(null, assessmentRecord.Template_Code_Snapshot__c);
  }

  @IsTest
  static void riskEvaluationUsesFallbackSeverityAndIntervention() {
    Animal_Episode__c episodeRecord = createEpisode('Risk Buddy', 'Dog');
    Welfare_Assessment__c assessmentRecord = new Welfare_Assessment__c(
      Animal__c = episodeRecord.Animal__c,
      Animal_Episode__c = episodeRecord.Id,
      Assessor__c = UserInfo.getUserId(),
      Assessment_DateTime__c = System.now(),
      Assessment_Type__c = 'Baseline',
      Assessment_Context__c = 'Routine',
      Assessment_Status__c = 'Completed'
    );
    insert assessmentRecord;
    insert new Welfare_Observation__c(
      Welfare_Assessment__c = assessmentRecord.Id,
      Indicator_Key__c = 'UNMAPPED_INDICATOR',
      Domain_Code__c = 'D2_Environment',
      Severity_Level__c = 'Moderate',
      Observed_Text__c = 'Needs monitoring',
      Requires_Intervention__c = false
    );

    Test.startTest();
    List<A360AssessmentRiskService.Result> results = A360AssessmentRiskService.evaluateAssessments(
      new Set<Id>{ assessmentRecord.Id }
    );
    Test.stopTest();

    System.assertEquals(1, results.size());
    System.assertEquals('Moderate', results[0].overallConcern);
    System.assertEquals(false, results[0].immediateActionRequired);
    System.assertEquals(false, results[0].autoCreateCarePlan);
  }

  @IsTest
  static void carePlanServiceSupportsEpisodeOnlyAndCustomActions() {
    Animal_Episode__c episodeRecord = createEpisode('Care Buddy', 'Dog');
    List<Map<String, Object>> actionPayloads = new List<Map<String, Object>>{
      new Map<String, Object>{
        'actionType' => 'Review Assessment',
        'description' => 'Complete handling review',
        'assignedToId' => UserInfo.getUserId(),
        'dueDate' => '2026-05-12',
        'status' => 'Completed',
        'completionNotes' => 'Review completed'
      }
    };
    A360CarePlanService.Request requestItem = new A360CarePlanService.Request();
    requestItem.episodeId = episodeRecord.Id;
    requestItem.planType = 'Behaviour';
    requestItem.primaryGoal = 'Improve handling confidence';
    requestItem.successCriteria = 'Animal remains relaxed during handling';
    requestItem.targetReviewDate = '2026-05-14';
    requestItem.actionJson = JSON.serialize(actionPayloads);

    Test.startTest();
    List<A360CarePlanService.Result> results = A360CarePlanService.createPlans(
      new List<A360CarePlanService.Request>{ requestItem }
    );
    Test.stopTest();

    Care_Plan_Action__c actionRecord = [
      SELECT
        Action_Type__c,
        Assigned_To__c,
        Due_Date__c,
        Status__c,
        Completed_On__c,
        Completion_Notes__c
      FROM Care_Plan_Action__c
      WHERE Care_Plan__c = :results[0].carePlanId
      LIMIT 1
    ];
    System.assertEquals(1, results.size());
    System.assertEquals(1, results[0].actionCount);
    System.assertEquals('Completed', actionRecord.Status__c);
    System.assertEquals(
      Date.newInstance(2026, 5, 12),
      actionRecord.Due_Date__c
    );
    System.assertNotEquals(null, actionRecord.Completed_On__c);
    System.assertEquals('Review completed', actionRecord.Completion_Notes__c);
  }

  @IsTest
  static void integrityServicePreparesKeysAndValueTypes() {
    A360AssessmentIntegrityService.prepareTemplates(null);
    A360AssessmentIntegrityService.prepareDomainSummaries(null);
    A360AssessmentIntegrityService.prepareObservations(null);

    List<Assessment_Template__c> templateRecords = new List<Assessment_Template__c>{
      new Assessment_Template__c(
        Status__c = 'Active',
        Default_For_Species__c = true,
        Species__c = 'Dog',
        Context__c = 'Routine'
      ),
      new Assessment_Template__c(
        Status__c = 'Draft',
        Default_For_Species__c = true
      )
    };
    A360AssessmentIntegrityService.prepareTemplates(templateRecords);
    System.assertEquals(
      'Dog::Routine',
      templateRecords[0].Default_Context_Key__c
    );
    System.assertEquals(null, templateRecords[1].Default_Context_Key__c);

    Animal_Episode__c episodeRecord = createEpisode('Integrity Buddy', 'Dog');
    Welfare_Assessment__c assessmentRecord = new Welfare_Assessment__c(
      Animal__c = episodeRecord.Animal__c,
      Animal_Episode__c = episodeRecord.Id,
      Assessor__c = UserInfo.getUserId(),
      Assessment_DateTime__c = System.now(),
      Assessment_Type__c = 'Baseline',
      Assessment_Context__c = 'Routine',
      Assessment_Status__c = 'Completed'
    );
    insert assessmentRecord;
    Id assessmentId = assessmentRecord.Id;
    List<Welfare_Domain_Summary__c> summaries = new List<Welfare_Domain_Summary__c>{
      new Welfare_Domain_Summary__c(
        Welfare_Assessment__c = assessmentId,
        Domain_Code__c = 'D1_Nutrition'
      ),
      new Welfare_Domain_Summary__c()
    };
    A360AssessmentIntegrityService.prepareDomainSummaries(summaries);
    System.assertEquals(
      String.valueOf(assessmentId) + '::D1_Nutrition',
      summaries[0].Assessment_Domain_Key__c
    );
    System.assertEquals(null, summaries[1].Assessment_Domain_Key__c);

    List<Welfare_Observation__c> observations = new List<Welfare_Observation__c>{
      new Welfare_Observation__c(
        Welfare_Assessment__c = assessmentId,
        Indicator_Key__c = 'PICK',
        Observed_Picklist_Value__c = 'Reduced'
      ),
      new Welfare_Observation__c(Observed_Numeric_Value__c = 12),
      new Welfare_Observation__c(Observed_Text__c = 'Text value'),
      new Welfare_Observation__c(Observed_DateTime__c = System.now()),
      new Welfare_Observation__c(Observed_Boolean__c = true),
      new Welfare_Observation__c()
    };
    A360AssessmentIntegrityService.prepareObservations(observations);
    System.assertEquals('Picklist', observations[0].Observation_Value_Type__c);
    System.assertEquals(
      String.valueOf(assessmentId) + '::PICK',
      observations[0].Observation_Key__c
    );
    System.assertEquals('Number', observations[1].Observation_Value_Type__c);
    System.assertEquals('Text', observations[2].Observation_Value_Type__c);
    System.assertEquals('DateTime', observations[3].Observation_Value_Type__c);
    System.assertEquals('Boolean', observations[4].Observation_Value_Type__c);
    System.assertEquals(null, observations[5].Observation_Value_Type__c);
  }

  @IsTest
  static void invocableAndEmptyInputsAreSafe() {
    System.assertEquals(0, A360CarePlanService.createPlans(null).size());
    System.assertEquals(
      0,
      A360CarePlanService.createPlans(new List<A360CarePlanService.Request>())
        .size()
    );
    System.assertEquals(0, A360AssessmentRiskService.evaluate(null).size());
    System.assertEquals(
      0,
      A360AssessmentRiskService.evaluate(
          new List<A360AssessmentRiskService.Request>()
        )
        .size()
    );
    System.assertEquals(
      0,
      A360AssessmentRiskService.evaluateAssessments(null).size()
    );
    System.assertEquals(
      0,
      A360AssessmentRiskService.evaluateAssessments(new Set<Id>()).size()
    );
    System.assertEquals(
      0,
      A360ReviewReminderService.createReminderTasks(null).size()
    );
    System.assertEquals(
      0,
      A360ReviewReminderService.createReminderTasks(
          new List<A360ReviewReminderService.Request>()
        )
        .size()
    );
    System.assertEquals(
      0,
      A360AssessmentPersistenceService.saveAssessments(null).size()
    );
    System.assertEquals(
      0,
      A360AssessmentPersistenceService.saveAssessments(
          new List<A360AssessmentPersistenceService.Request>()
        )
        .size()
    );
    System.assertEquals(
      null,
      A360AssessmentTemplateService.buildTemplateDefinition(null)
    );
    System.assertEquals(
      null,
      A360AssessmentTemplateService.resolveDefaultTemplateId(null, 'Routine')
    );

    A360AssessmentTemplateService.SeedRequest seedRequest = new A360AssessmentTemplateService.SeedRequest();
    seedRequest.forceResync = false;
    List<A360AssessmentTemplateService.SeedResult> seedResults = A360AssessmentTemplateService.seedAssessmentTemplates(
      new List<A360AssessmentTemplateService.SeedRequest>{ seedRequest }
    );
    System.assertEquals(1, seedResults.size());
  }

  @IsTest
  static void templateDefinitionUsesFallbackLabelsForCustomRows() {
    Assessment_Template__c templateRecord = new Assessment_Template__c(
      Name = 'Sparse Animal360 Template',
      Template_Code__c = 'SPARSE_A360',
      Context__c = 'Routine',
      Status__c = 'Active',
      Default_For_Species__c = false,
      Metadata_Template_Key__c = 'SPARSE_A360_TEST'
    );
    insert templateRecord;

    insert new Template_Domain_Definition__c(
      Assessment_Template__c = templateRecord.Id,
      Domain_Code__c = 'D1_Nutrition',
      Display_Order__c = 1,
      Is_Required__c = true,
      Metadata_Row_Key__c = 'SPARSE_A360_TEST::D1_Nutrition'
    );

    insert new List<Template_Indicator_Assignment__c>{
      new Template_Indicator_Assignment__c(
        Assessment_Template__c = templateRecord.Id,
        Domain_Code__c = 'D1_Nutrition',
        Indicator_Key__c = 'UNKNOWN_INDICATOR',
        Display_Order__c = 1,
        Is_Required__c = true,
        Metadata_Row_Key__c = 'SPARSE_A360_TEST::UNKNOWN_INDICATOR'
      ),
      new Template_Indicator_Assignment__c(
        Assessment_Template__c = templateRecord.Id,
        Domain_Code__c = 'D2_Environment',
        Indicator_Key__c = 'DETACHED_INDICATOR',
        Display_Order__c = 2,
        Is_Required__c = false,
        Metadata_Row_Key__c = 'SPARSE_A360_TEST::DETACHED_INDICATOR'
      )
    };

    Animal_Episode__c episodeRecord = createEpisode('Sparse Buddy', 'Dog');

    Test.startTest();
    A360AssessmentTemplateService.TemplateDefinition definition = A360AssessmentTemplateService.buildTemplateDefinition(
      templateRecord.Id
    );
    A360AssessmentTemplateService.EntryContext context = A360AssessmentTemplateService.getAssessmentEntryContext(
      episodeRecord.Id,
      templateRecord.Id,
      'Routine'
    );
    Test.stopTest();

    System.assertEquals('SPARSE_A360', definition.templateCode);
    System.assertEquals(1, definition.domains.size());
    System.assertEquals('D1 Nutrition', definition.domains[0].domainLabel);
    System.assertEquals(1, definition.domains[0].indicators.size());
    System.assertEquals(
      'UNKNOWN_INDICATOR',
      definition.domains[0].indicators[0].indicatorLabel
    );
    System.assertEquals('Text', definition.domains[0].indicators[0].valueType);
    System.assertEquals(0, definition.domains[0].indicators[0].options.size());
    System.assertEquals(
      String.valueOf(templateRecord.Id),
      context.selectedTemplateId
    );
    System.assertEquals(
      String.valueOf(episodeRecord.Id),
      context.selectedEpisodeId
    );
    System.assert(context.episodeOptions[0].label.contains('Sparse Buddy'));
  }

  @IsTest
  static void carePlanSkipsExistingOpenPlanAndDefaultsActions() {
    Animal_Episode__c episodeRecord = createEpisode('Care Defaults', 'Dog');
    Welfare_Assessment__c assessmentRecord = new Welfare_Assessment__c(
      Animal__c = episodeRecord.Animal__c,
      Animal_Episode__c = episodeRecord.Id,
      Assessor__c = UserInfo.getUserId(),
      Assessment_DateTime__c = System.now(),
      Assessment_Type__c = 'Baseline',
      Assessment_Context__c = 'Routine',
      Assessment_Status__c = 'Completed',
      Overall_Welfare_Concern__c = 'Moderate'
    );
    insert assessmentRecord;

    Care_Plan__c existingPlan = new Care_Plan__c(
      Animal_Episode__c = episodeRecord.Id,
      Primary_Assessment__c = assessmentRecord.Id,
      Plan_Type__c = 'Behaviour',
      Status__c = 'Open',
      Start_Date__c = Date.today(),
      Target_Review_Date__c = Date.today().addDays(7),
      Primary_Goal__c = 'Existing plan',
      Success_Criteria__c = 'Existing criteria',
      Owner_User__c = UserInfo.getUserId()
    );
    insert existingPlan;

    A360CarePlanService.Request skipRequest = new A360CarePlanService.Request();
    skipRequest.assessmentId = assessmentRecord.Id;
    skipRequest.skipIfOpenForAssessment = true;

    A360CarePlanService.Request defaultRequest = new A360CarePlanService.Request();
    defaultRequest.assessmentId = assessmentRecord.Id;

    Test.startTest();
    List<A360CarePlanService.Result> results = A360CarePlanService.createPlans(
      new List<A360CarePlanService.Request>{
        null,
        skipRequest,
        new A360CarePlanService.Request(),
        defaultRequest
      }
    );
    Test.stopTest();

    System.assertEquals(2, results.size());
    System.assertEquals(existingPlan.Id, results[0].carePlanId);
    System.assertEquals(0, results[0].actionCount);
    System.assertEquals(1, results[1].actionCount);
    Care_Plan_Action__c actionRecord = [
      SELECT Description__c, Assigned_To__c, Due_Date__c, Status__c
      FROM Care_Plan_Action__c
      WHERE Care_Plan__c = :results[1].carePlanId
      LIMIT 1
    ];
    System.assert(actionRecord.Description__c.contains('Moderate'));
    System.assertEquals(UserInfo.getUserId(), actionRecord.Assigned_To__c);
    System.assertEquals('Planned', actionRecord.Status__c);
    System.assertNotEquals(null, actionRecord.Due_Date__c);
  }

  @IsTest
  static void riskInvocableCoversFallbackBranches() {
    Animal_Episode__c episodeRecord = createEpisode('Risk Branches', 'Dog');
    Welfare_Assessment__c assessmentRecord = new Welfare_Assessment__c(
      Animal__c = episodeRecord.Animal__c,
      Animal_Episode__c = episodeRecord.Id,
      Assessor__c = UserInfo.getUserId(),
      Assessment_DateTime__c = System.now(),
      Assessment_Type__c = 'Baseline',
      Assessment_Context__c = 'Routine',
      Assessment_Status__c = 'Completed'
    );
    insert assessmentRecord;

    insert new List<Welfare_Observation__c>{
      new Welfare_Observation__c(
        Welfare_Assessment__c = assessmentRecord.Id,
        Indicator_Key__c = 'BLANK_INTERVENTION',
        Domain_Code__c = 'D1_Nutrition',
        Observation_Value_Type__c = 'Text',
        Observed_Text__c = 'Intervention required',
        Requires_Intervention__c = true
      ),
      new Welfare_Observation__c(
        Welfare_Assessment__c = assessmentRecord.Id,
        Indicator_Key__c = 'CRITICAL_BRANCH',
        Domain_Code__c = 'D2_Environment',
        Observation_Value_Type__c = 'Text',
        Observed_Text__c = 'Critical concern',
        Severity_Level__c = 'Critical',
        Requires_Intervention__c = false
      ),
      new Welfare_Observation__c(
        Welfare_Assessment__c = assessmentRecord.Id,
        Indicator_Key__c = 'LOW_BRANCH',
        Domain_Code__c = 'D3_Health',
        Observation_Value_Type__c = 'Text',
        Observed_Text__c = 'Low concern',
        Severity_Level__c = 'Low',
        Requires_Intervention__c = false
      )
    };

    A360AssessmentRiskService.Request requestItem = new A360AssessmentRiskService.Request();
    requestItem.assessmentId = assessmentRecord.Id;

    Test.startTest();
    List<A360AssessmentRiskService.Result> results = A360AssessmentRiskService.evaluate(
      new List<A360AssessmentRiskService.Request>{ null, requestItem }
    );
    Test.stopTest();

    System.assertEquals(1, results.size());
    System.assertEquals('Critical', results[0].overallConcern);
    System.assertEquals(true, results[0].immediateActionRequired);
  }

  @IsTest
  static void reviewReminderHandlesNoWorkAndNormalPriority() {
    A360ReviewReminderService.Request emptyRequest = new A360ReviewReminderService.Request();
    emptyRequest.asOfDate = String.valueOf(Date.today().addDays(-365));

    List<A360ReviewReminderService.Result> emptyResults = A360ReviewReminderService.createReminderTasks(
      new List<A360ReviewReminderService.Request>{ null, emptyRequest }
    );

    System.assertEquals(2, emptyResults.size());
    System.assertEquals(0, emptyResults[0].reminderCount);
    System.assertEquals(0, emptyResults[1].reminderCount);

    Animal_Episode__c episodeRecord = createEpisode('Reminder Normal', 'Dog');
    Welfare_Assessment__c assessmentRecord = new Welfare_Assessment__c(
      Animal__c = episodeRecord.Animal__c,
      Animal_Episode__c = episodeRecord.Id,
      Assessor__c = UserInfo.getUserId(),
      Assessment_DateTime__c = System.now(),
      Assessment_Type__c = 'Baseline',
      Assessment_Context__c = 'Routine',
      Assessment_Status__c = 'Completed',
      Overall_Welfare_Concern__c = 'Moderate',
      Next_Review_Date__c = Date.today()
    );
    insert assessmentRecord;

    A360ReviewReminderService.Request dueRequest = new A360ReviewReminderService.Request();
    dueRequest.asOfDate = String.valueOf(Date.today());

    Test.startTest();
    List<A360ReviewReminderService.Result> dueResults = A360ReviewReminderService.createReminderTasks(
      new List<A360ReviewReminderService.Request>{ dueRequest }
    );
    Test.stopTest();

    Task reminderTask = [
      SELECT Priority, OwnerId, Description
      FROM Task
      WHERE WhatId = :assessmentRecord.Id
      LIMIT 1
    ];
    System.assertEquals(1, dueResults.size());
    System.assertEquals(1, dueResults[0].reminderCount);
    System.assertEquals('Normal', reminderTask.Priority);
    System.assertEquals(UserInfo.getUserId(), reminderTask.OwnerId);
    System.assert(reminderTask.Description.contains('Moderate'));
  }

  @IsTest
  static void persistenceSkipsInvalidRequestsAndParsesLocalDateTime() {
    Animal_Episode__c episodeRecord = createEpisode(
      'Persistence Branches',
      'Dog'
    );
    A360AssessmentPersistenceService.Request missingEpisodeRequest = new A360AssessmentPersistenceService.Request();
    missingEpisodeRequest.payloadJson = '{}';

    Map<String, Object> payload = new Map<String, Object>{
      'assessmentDateTime' => '2026-05-04 10:00:00',
      'assessmentContext' => 'Routine',
      'domainSummaries' => new List<Object>{
        new Map<String, Object>{
          'domainCode' => 'D1_Nutrition',
          'negativeGrade' => 'B',
          'positiveGrade' => 'B',
          'keyFindings' => 'Stable intake',
          'actionRequired' => false
        }
      },
      'observations' => new List<Object>{
        new Map<String, Object>{
          'indicatorKey' => 'TEXT_BRANCH',
          'indicatorLabel' => 'Text Branch',
          'domainCode' => 'D1_Nutrition',
          'observedText' => 'Calm',
          'observedDateTime' => '2026-05-04 11:00:00',
          'requiresIntervention' => false
        }
      }
    };

    A360AssessmentPersistenceService.Request validRequest = new A360AssessmentPersistenceService.Request();
    validRequest.episodeId = episodeRecord.Id;
    validRequest.payloadJson = JSON.serialize(payload);

    Test.startTest();
    List<A360AssessmentPersistenceService.Result> results = A360AssessmentPersistenceService.saveAssessments(
      new List<A360AssessmentPersistenceService.Request>{
        null,
        missingEpisodeRequest,
        validRequest
      }
    );
    Test.stopTest();

    System.assertEquals(1, results.size());
    Welfare_Assessment__c assessmentRecord = [
      SELECT Completeness__c, Assessment_DateTime__c
      FROM Welfare_Assessment__c
      WHERE Id = :results[0].assessmentId
    ];
    System.assertEquals(100, assessmentRecord.Completeness__c);
    System.assertNotEquals(null, assessmentRecord.Assessment_DateTime__c);
    System.assertEquals(
      1,
      [
        SELECT COUNT()
        FROM Welfare_Domain_Summary__c
        WHERE Welfare_Assessment__c = :assessmentRecord.Id
      ]
    );
    System.assertEquals(
      1,
      [
        SELECT COUNT()
        FROM Welfare_Observation__c
        WHERE Welfare_Assessment__c = :assessmentRecord.Id
      ]
    );
  }

  private static Animal_Episode__c createEpisode(
    String displayName,
    String species
  ) {
    Animal__c animalRecord = new Animal__c(
      Display_Name__c = displayName,
      Species__c = species,
      Estimated_Age_Months__c = 30
    );
    insert animalRecord;

    Animal_Episode__c episodeRecord = new Animal_Episode__c(
      Animal__c = animalRecord.Id,
      Episode_Type__c = 'Intake',
      Episode_Status__c = 'Open',
      Intake_DateTime__c = System.now(),
      Is_Current__c = true
    );
    insert episodeRecord;
    return episodeRecord;
  }
}
