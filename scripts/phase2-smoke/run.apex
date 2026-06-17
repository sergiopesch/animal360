String runKey = Datetime.now().formatGmt('yyyyMMddHHmmss');
String animalName = 'A360 Phase II Smoke Animal ' + runKey;

A360AssessmentTemplateService.SeedResult seedResult = A360AssessmentTemplateService.seedTemplates(
  false
);

Assessment_Template__c templateRecord = [
  SELECT Id, Metadata_Template_Key__c, Template_Code__c, Version__c
  FROM Assessment_Template__c
  WHERE Metadata_Template_Key__c = 'COMPANION_ROUTINE_V1'
  LIMIT 1
];

Animal__c animalRecord = new Animal__c(
  Display_Name__c = animalName,
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

Map<String, Object> payload = new Map<String, Object>{
  'assessmentDateTime' => System.now().formatGmt('yyyy-MM-dd\'T\'HH:mm:ss\'Z\''),
  'assessmentType' => 'Baseline',
  'assessmentContext' => 'Routine',
  'assessmentStatus' => 'Completed',
  'confidenceLevel' => 'High',
  'immediateActionRequired' => true,
  'domain5MentalStateSummary' => 'Smoke test: critical clinical signs require an urgent care response.',
  'domainSummaries' => new List<Object>{
    new Map<String, Object>{
      'domainCode' => 'D3_Health',
      'negativeGrade' => 'E',
      'positiveGrade' => 'A',
      'keyFindings' => 'Smoke test critical clinical signs observed.',
      'inferredAffects' => 'Likely pain or acute discomfort.',
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
      'interventionNotes' => 'Smoke test expects automatic care-plan action creation.'
    }
  }
};

A360AssessmentPersistenceService.Request persistenceRequest = new A360AssessmentPersistenceService.Request();
persistenceRequest.episodeId = episodeRecord.Id;
persistenceRequest.templateId = templateRecord.Id;
persistenceRequest.payloadJson = JSON.serialize(payload);

List<A360AssessmentPersistenceService.Result> persistenceResults = A360AssessmentPersistenceService.saveAssessments(
  new List<A360AssessmentPersistenceService.Request>{ persistenceRequest }
);
System.assertEquals(1, persistenceResults.size(), 'Expected one assessment persistence result.');
Id assessmentId = persistenceResults[0].assessmentId;
System.assertNotEquals(null, assessmentId, 'Expected the smoke assessment to be created.');

List<A360AssessmentRiskService.Result> riskResults = A360AssessmentRiskService.evaluateAssessments(
  new Set<Id>{ assessmentId }
);
System.assertEquals(1, riskResults.size(), 'Expected one risk evaluation result.');
System.assertEquals('Critical', riskResults[0].overallConcern, 'Expected the critical observation to evaluate as Critical.');
System.assertEquals(true, riskResults[0].immediateActionRequired, 'Expected immediate action to be required.');
System.assertEquals(true, riskResults[0].autoCreateCarePlan, 'Expected metadata to request care-plan creation.');

A360CarePlanService.Request carePlanRequest = new A360CarePlanService.Request();
carePlanRequest.assessmentId = assessmentId;
carePlanRequest.skipIfOpenForAssessment = true;
List<A360CarePlanService.Result> carePlanResults = A360CarePlanService.createPlans(
  new List<A360CarePlanService.Request>{ carePlanRequest }
);
System.assertEquals(1, carePlanResults.size(), 'Expected one care-plan result.');
System.assertNotEquals(null, carePlanResults[0].carePlanId, 'Expected a care plan id.');
System.assertEquals(1, carePlanResults[0].actionCount, 'Expected one default care-plan action.');

Welfare_Assessment__c savedAssessment = [
  SELECT
    Id,
    Name,
    Overall_Welfare_Concern__c,
    Immediate_Action_Required__c,
    Next_Review_Date__c,
    Risk_Evaluated_On__c,
    Template_Key_Snapshot__c
  FROM Welfare_Assessment__c
  WHERE Id = :assessmentId
];
Animal_Episode__c updatedEpisode = [
  SELECT Id, Current_Welfare_Level__c, Current_Clinical_Priority__c, Next_Review_Date__c
  FROM Animal_Episode__c
  WHERE Id = :episodeRecord.Id
];
Animal__c updatedAnimal = [
  SELECT Id, Current_Welfare_Risk__c
  FROM Animal__c
  WHERE Id = :animalRecord.Id
];
Care_Plan__c carePlanRecord = [
  SELECT Id, Status__c, Plan_Type__c, Auto_Created__c, Primary_Assessment__c
  FROM Care_Plan__c
  WHERE Id = :carePlanResults[0].carePlanId
];
List<Care_Plan_Action__c> carePlanActions = [
  SELECT Id, Action_Type__c, Status__c, Description__c
  FROM Care_Plan_Action__c
  WHERE Care_Plan__c = :carePlanRecord.Id
];
List<Welfare_Observation__c> observations = [
  SELECT Id
  FROM Welfare_Observation__c
  WHERE Welfare_Assessment__c = :savedAssessment.Id
];
List<Welfare_Domain_Summary__c> summaries = [
  SELECT Id
  FROM Welfare_Domain_Summary__c
  WHERE Welfare_Assessment__c = :savedAssessment.Id
];

System.assertEquals('Critical', savedAssessment.Overall_Welfare_Concern__c);
System.assertEquals(true, savedAssessment.Immediate_Action_Required__c);
System.assertNotEquals(null, savedAssessment.Risk_Evaluated_On__c);
System.assertEquals('COMPANION_ROUTINE_V1', savedAssessment.Template_Key_Snapshot__c);
System.assertEquals('Critical', updatedEpisode.Current_Welfare_Level__c);
System.assertEquals('Emergency', updatedEpisode.Current_Clinical_Priority__c);
System.assertEquals('Critical', updatedAnimal.Current_Welfare_Risk__c);
System.assertEquals(assessmentId, carePlanRecord.Primary_Assessment__c);
System.assertEquals(true, carePlanRecord.Auto_Created__c);
System.assertEquals(1, carePlanActions.size());
System.assertEquals(1, observations.size());
System.assertEquals(1, summaries.size());

Map<String, Object> smokeSummary = new Map<String, Object>{
  'runKey' => runKey,
  'animalId' => animalRecord.Id,
  'episodeId' => episodeRecord.Id,
  'assessmentId' => savedAssessment.Id,
  'assessmentName' => savedAssessment.Name,
  'carePlanId' => carePlanRecord.Id,
  'carePlanActionCount' => carePlanActions.size(),
  'observationCount' => observations.size(),
  'domainSummaryCount' => summaries.size(),
  'overallConcern' => savedAssessment.Overall_Welfare_Concern__c,
  'episodeWelfareLevel' => updatedEpisode.Current_Welfare_Level__c,
  'episodeClinicalPriority' => updatedEpisode.Current_Clinical_Priority__c,
  'animalWelfareRisk' => updatedAnimal.Current_Welfare_Risk__c,
  'nextReviewDate' => String.valueOf(savedAssessment.Next_Review_Date__c),
  'templateId' => templateRecord.Id,
  'templateKey' => templateRecord.Metadata_Template_Key__c,
  'seedTemplateRowsProcessed' => seedResult.templateCount,
  'seedDomainRowsProcessed' => seedResult.domainCount,
  'seedIndicatorRowsProcessed' => seedResult.indicatorCount
};
System.debug('A360_PHASE2_SMOKE_RESULT ' + JSON.serialize(smokeSummary));
