@IsTest
private class A360Phase2ServiceTest {
  @IsTest
  static void seedTemplatesCreatesRuntimeRows() {
    Test.startTest();
    A360AssessmentTemplateService.SeedResult result = A360AssessmentTemplateService.seedTemplates(
      true
    );
    Test.stopTest();

    System.assertEquals(1, result.templateCount);
    System.assertEquals(5, result.domainCount);
    System.assertEquals(6, result.indicatorCount);

    Assessment_Template__c templateRecord = [
      SELECT Id, Name, Metadata_Template_Key__c, Default_Context_Key__c
      FROM Assessment_Template__c
      WHERE Metadata_Template_Key__c = 'COMPANION_ROUTINE_V1'
      LIMIT 1
    ];
    System.assertEquals(
      'COMPANION_ROUTINE_V1',
      templateRecord.Metadata_Template_Key__c
    );
    System.assertEquals('Dog::Routine', templateRecord.Default_Context_Key__c);

    A360AssessmentTemplateService.TemplateDefinition definition = A360AssessmentTemplateService.buildTemplateDefinition(
      templateRecord.Id
    );
    System.assertEquals(5, definition.domains.size());
    System.assertEquals('COMPANION_ROUTINE_V1', definition.metadataTemplateKey);
  }

  @IsTest
  static void templateUniquenessBlocksDuplicateActiveDefault() {
    A360AssessmentTemplateService.seedTemplates(true);

    Assessment_Template__c duplicateTemplate = new Assessment_Template__c(
      Name = 'Duplicate Dog Routine',
      Template_Code__c = 'DUP_DOG_ROUTINE',
      Species__c = 'Dog',
      Context__c = 'Routine',
      Version__c = '1.0',
      Status__c = 'Active',
      Default_For_Species__c = true
    );

    Database.SaveResult saveResult = Database.insert(duplicateTemplate, false);
    System.assertEquals(false, saveResult.isSuccess());
    System.assert(saveResult.getErrors().size() > 0);
  }

  @IsTest
  static void assessmentLifecyclePersistsRiskAndCarePlan() {
    A360AssessmentTemplateService.seedTemplates(true);

    Animal__c animalRecord = new Animal__c(
      Display_Name__c = 'Buddy',
      Species__c = 'Dog',
      Estimated_Age_Months__c = 36
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

    Assessment_Template__c templateRecord = [
      SELECT Id
      FROM Assessment_Template__c
      WHERE Metadata_Template_Key__c = 'COMPANION_ROUTINE_V1'
      LIMIT 1
    ];

    Map<String, Object> payload = new Map<String, Object>{
      'assessmentDateTime' => System.now()
        .formatGmt('yyyy-MM-dd\'T\'HH:mm:ss\'Z\''),
      'assessmentType' => 'Baseline',
      'assessmentContext' => 'Routine',
      'assessmentStatus' => 'Completed',
      'confidenceLevel' => 'High',
      'immediateActionRequired' => true,
      'domain5MentalStateSummary' => 'Animal shows acute distress due to clinical pain signs.',
      'domainSummaries' => new List<Object>{
        new Map<String, Object>{
          'domainCode' => 'D3_Health',
          'negativeGrade' => 'E',
          'positiveGrade' => 'A',
          'keyFindings' => 'Critical clinical signs observed.',
          'inferredAffects' => 'Likely pain and discomfort.',
          'actionRequired' => true,
          'actionSummary' => 'Urgent clinical review required.',
          'confidenceLevel' => 'High'
        }
      },
      'observations' => new List<Object>{
        new Map<String, Object>{
          'indicatorKey' => 'CLINICAL_SIGNS',
          'indicatorLabel' => 'Clinical Signs',
          'domainCode' => 'D3_Health',
          'observationValueType' => 'Picklist',
          'observedPicklistValue' => 'Critical',
          'severityLevel' => 'Critical',
          'evidenceSource' => 'Clinical Examination',
          'confidenceLevel' => 'High',
          'requiresIntervention' => true,
          'interventionNotes' => 'Immediate triage needed.'
        }
      }
    };

    A360AssessmentPersistenceService.Request persistenceRequest = new A360AssessmentPersistenceService.Request();
    persistenceRequest.episodeId = episodeRecord.Id;
    persistenceRequest.templateId = templateRecord.Id;
    persistenceRequest.payloadJson = JSON.serialize(payload);

    Test.startTest();
    List<A360AssessmentPersistenceService.Result> persistenceResults = A360AssessmentPersistenceService.saveAssessments(
      new List<A360AssessmentPersistenceService.Request>{ persistenceRequest }
    );
    Id assessmentId = persistenceResults[0].assessmentId;
    List<A360AssessmentRiskService.Result> riskResults = A360AssessmentRiskService.evaluateAssessments(
      new Set<Id>{ assessmentId }
    );
    A360CarePlanService.Request carePlanRequest = new A360CarePlanService.Request();
    carePlanRequest.assessmentId = assessmentId;
    carePlanRequest.skipIfOpenForAssessment = true;
    List<A360CarePlanService.Result> carePlanResults = A360CarePlanService.createPlans(
      new List<A360CarePlanService.Request>{ carePlanRequest }
    );
    Test.stopTest();

    Welfare_Assessment__c savedAssessment = [
      SELECT
        Id,
        Overall_Welfare_Concern__c,
        Immediate_Action_Required__c,
        Next_Review_Date__c
      FROM Welfare_Assessment__c
      WHERE Id = :assessmentId
    ];
    Animal_Episode__c updatedEpisode = [
      SELECT
        Current_Welfare_Level__c,
        Current_Clinical_Priority__c,
        Next_Review_Date__c
      FROM Animal_Episode__c
      WHERE Id = :episodeRecord.Id
    ];
    Animal__c updatedAnimal = [
      SELECT Current_Welfare_Risk__c
      FROM Animal__c
      WHERE Id = :animalRecord.Id
    ];
    List<Care_Plan_Action__c> actions = [
      SELECT Id, Description__c
      FROM Care_Plan_Action__c
      WHERE Care_Plan__c = :carePlanResults[0].carePlanId
    ];

    System.assertEquals(1, persistenceResults.size());
    System.assertEquals(1, riskResults.size());
    System.assertEquals('Critical', riskResults[0].overallConcern);
    System.assertEquals(true, riskResults[0].autoCreateCarePlan);
    System.assertEquals('Critical', savedAssessment.Overall_Welfare_Concern__c);
    System.assertEquals(true, savedAssessment.Immediate_Action_Required__c);
    System.assertEquals('Critical', updatedEpisode.Current_Welfare_Level__c);
    System.assertEquals(
      'Emergency',
      updatedEpisode.Current_Clinical_Priority__c
    );
    System.assertEquals('Critical', updatedAnimal.Current_Welfare_Risk__c);
    System.assertEquals(1, carePlanResults.size());
    System.assertEquals(1, actions.size());
    System.assert(actions[0].Description__c.contains('Clinical Signs'));
  }

  @IsTest
  static void reviewReminderServiceCreatesAndDedupesTasks() {
    Animal__c animalRecord = new Animal__c(
      Display_Name__c = 'Reminder Buddy',
      Species__c = 'Dog',
      Estimated_Age_Months__c = 24
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

    Welfare_Assessment__c assessmentRecord = new Welfare_Assessment__c(
      Animal__c = animalRecord.Id,
      Animal_Episode__c = episodeRecord.Id,
      Assessor__c = UserInfo.getUserId(),
      Assessment_DateTime__c = System.now(),
      Assessment_Type__c = 'Baseline',
      Assessment_Context__c = 'Routine',
      Assessment_Status__c = 'Completed',
      Overall_Welfare_Concern__c = 'High',
      Next_Review_Date__c = Date.today().addDays(1)
    );
    insert assessmentRecord;

    A360ReviewReminderService.Request requestItem = new A360ReviewReminderService.Request();

    Test.startTest();
    List<A360ReviewReminderService.Result> firstRunResults = A360ReviewReminderService.createReminderTasks(
      new List<A360ReviewReminderService.Request>{ requestItem }
    );
    List<A360ReviewReminderService.Result> secondRunResults = A360ReviewReminderService.createReminderTasks(
      new List<A360ReviewReminderService.Request>{ requestItem }
    );
    Test.stopTest();

    List<Task> reminderTasks = [
      SELECT Subject, ActivityDate, Priority, OwnerId, WhatId
      FROM Task
      WHERE
        WhatId = :assessmentRecord.Id
        AND Subject = 'Review welfare assessment'
    ];

    System.assertEquals(1, firstRunResults.size());
    System.assertEquals(1, firstRunResults[0].reminderCount);
    System.assertEquals(Date.today().addDays(1), firstRunResults[0].targetDate);
    System.assertEquals(1, secondRunResults.size());
    System.assertEquals(0, secondRunResults[0].reminderCount);
    System.assertEquals(1, reminderTasks.size());
    System.assertEquals(Date.today().addDays(1), reminderTasks[0].ActivityDate);
    System.assertEquals('High', reminderTasks[0].Priority);
    System.assertEquals(UserInfo.getUserId(), reminderTasks[0].OwnerId);
  }
}
