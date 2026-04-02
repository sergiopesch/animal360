public without sharing class A360AssessmentRiskService {
  public class Request {
    @InvocableVariable(required=true)
    public Id assessmentId;
  }

  public class Result {
    @InvocableVariable
    public Id assessmentId;

    @InvocableVariable
    public Id episodeId;

    @InvocableVariable
    public String overallConcern;

    @InvocableVariable
    public Boolean immediateActionRequired;

    @InvocableVariable
    public Boolean autoCreateCarePlan;
  }

  private class RuleMatch {
    public String riskLevel;
    public Boolean autoCreateCarePlan;
  }

  @InvocableMethod(label='Evaluate Welfare Risk')
  public static List<Result> evaluate(List<Request> requests) {
    Set<Id> assessmentIds = new Set<Id>();
    for (Request requestItem : requests) {
      if (requestItem != null && requestItem.assessmentId != null) {
        assessmentIds.add(requestItem.assessmentId);
      }
    }

    return evaluateAssessments(assessmentIds);
  }

  public static List<Result> evaluateAssessments(Set<Id> assessmentIds) {
    List<Result> results = new List<Result>();
    if (assessmentIds == null || assessmentIds.isEmpty()) {
      return results;
    }

    Map<Id, Welfare_Assessment__c> assessmentsById = new Map<Id, Welfare_Assessment__c>(
      [
        SELECT Id, Animal_Episode__c, Animal__c, Immediate_Action_Required__c
        FROM Welfare_Assessment__c
        WHERE Id IN :assessmentIds
      ]
    );
    if (assessmentsById.isEmpty()) {
      return results;
    }

    Map<Id, List<Welfare_Observation__c>> observationsByAssessmentId = new Map<Id, List<Welfare_Observation__c>>();
    for (Welfare_Observation__c observationRecord : [
      SELECT
        Id,
        Welfare_Assessment__c,
        Indicator_Key__c,
        Indicator_Label__c,
        Observed_Picklist_Value__c,
        Severity_Level__c,
        Requires_Intervention__c
      FROM Welfare_Observation__c
      WHERE Welfare_Assessment__c IN :assessmentIds
    ]) {
      if (
        !observationsByAssessmentId.containsKey(
          observationRecord.Welfare_Assessment__c
        )
      ) {
        observationsByAssessmentId.put(
          observationRecord.Welfare_Assessment__c,
          new List<Welfare_Observation__c>()
        );
      }
      observationsByAssessmentId.get(observationRecord.Welfare_Assessment__c)
        .add(observationRecord);
    }

    List<Animal360_Risk_Rule__mdt> riskRules = [
      SELECT
        Indicator_Key__c,
        Observed_Picklist_Value__c,
        Severity_Level__c,
        Requires_Intervention__c,
        Result_Welfare_Risk__c,
        Auto_Create_Care_Plan__c
      FROM Animal360_Risk_Rule__mdt
      WHERE Is_Active__c = TRUE
      ORDER BY Rule_Order__c ASC
    ];

    Map<String, Animal360_Status_Transition_Rule__mdt> transitionRuleByRisk = new Map<String, Animal360_Status_Transition_Rule__mdt>();
    for (Animal360_Status_Transition_Rule__mdt transitionRule : [
      SELECT Target_Welfare_Risk__c, Clinical_Priority__c, Review_Days__c
      FROM Animal360_Status_Transition_Rule__mdt
      WHERE Is_Active__c = TRUE
    ]) {
      transitionRuleByRisk.put(
        transitionRule.Target_Welfare_Risk__c,
        transitionRule
      );
    }

    Animal360_Automation_Setting__mdt automationSetting = [
      SELECT Auto_Create_Care_Plan__c, Default_Review_Days__c
      FROM Animal360_Automation_Setting__mdt
      WHERE Setting_Key__c = 'DEFAULT'
      LIMIT 1
    ];

    List<Welfare_Assessment__c> assessmentsToUpdate = new List<Welfare_Assessment__c>();
    List<Animal_Episode__c> episodesToUpdate = new List<Animal_Episode__c>();
    Set<Id> animalIdsForRollup = new Set<Id>();

    for (Welfare_Assessment__c assessmentRecord : assessmentsById.values()) {
      String highestRisk = 'Low';
      Boolean autoCreateCarePlan = false;

      List<Welfare_Observation__c> observations = observationsByAssessmentId
          .containsKey(assessmentRecord.Id)
        ? observationsByAssessmentId.get(assessmentRecord.Id)
        : new List<Welfare_Observation__c>();
      for (Welfare_Observation__c observationRecord : observations) {
        RuleMatch match = matchRiskRule(observationRecord, riskRules);
        String riskFromObservation = match == null
          ? fallbackRisk(observationRecord)
          : match.riskLevel;
        if (riskRank(riskFromObservation) > riskRank(highestRisk)) {
          highestRisk = riskFromObservation;
        }
        if (
          match != null &&
          match.autoCreateCarePlan &&
          automationSetting.Auto_Create_Care_Plan__c
        ) {
          autoCreateCarePlan = true;
        }
      }

      Boolean immediateActionRequired =
        assessmentRecord.Immediate_Action_Required__c ||
        riskRank(highestRisk) >= riskRank('High');
      if (immediateActionRequired && riskRank(highestRisk) < riskRank('High')) {
        highestRisk = 'High';
      }

      Animal360_Status_Transition_Rule__mdt transitionRule = transitionRuleByRisk.get(
        highestRisk
      );
      Integer reviewOffsetDays = transitionRule == null ||
        transitionRule.Review_Days__c == null
        ? Integer.valueOf(
            String.valueOf(automationSetting.Default_Review_Days__c)
          )
        : Integer.valueOf(String.valueOf(transitionRule.Review_Days__c));
      Date nextReviewDate = Date.today().addDays(reviewOffsetDays);
      String clinicalPriority = transitionRule == null
        ? 'Routine'
        : transitionRule.Clinical_Priority__c;

      assessmentsToUpdate.add(
        new Welfare_Assessment__c(
          Id = assessmentRecord.Id,
          Overall_Welfare_Concern__c = highestRisk,
          Immediate_Action_Required__c = immediateActionRequired,
          Next_Review_Date__c = nextReviewDate,
          Risk_Evaluated_On__c = System.now()
        )
      );

      if (assessmentRecord.Animal_Episode__c != null) {
        episodesToUpdate.add(
          new Animal_Episode__c(
            Id = assessmentRecord.Animal_Episode__c,
            Current_Welfare_Level__c = highestRisk,
            Current_Clinical_Priority__c = clinicalPriority,
            Next_Review_Date__c = nextReviewDate
          )
        );
      }
      if (assessmentRecord.Animal__c != null) {
        animalIdsForRollup.add(assessmentRecord.Animal__c);
      }

      Result result = new Result();
      result.assessmentId = assessmentRecord.Id;
      result.episodeId = assessmentRecord.Animal_Episode__c;
      result.overallConcern = highestRisk;
      result.immediateActionRequired = immediateActionRequired;
      result.autoCreateCarePlan = autoCreateCarePlan;
      results.add(result);
    }

    if (!assessmentsToUpdate.isEmpty()) {
      update assessmentsToUpdate;
    }
    if (!episodesToUpdate.isEmpty()) {
      update episodesToUpdate;
    }
    if (!animalIdsForRollup.isEmpty()) {
      A360AnimalRollupService.rollupAnimals(animalIdsForRollup);
    }

    return results;
  }

  private static RuleMatch matchRiskRule(
    Welfare_Observation__c observationRecord,
    List<Animal360_Risk_Rule__mdt> riskRules
  ) {
    RuleMatch bestMatch = null;
    for (Animal360_Risk_Rule__mdt riskRule : riskRules) {
      if (
        !String.isBlank(riskRule.Indicator_Key__c) &&
        riskRule.Indicator_Key__c != observationRecord.Indicator_Key__c
      ) {
        continue;
      }
      if (
        !String.isBlank(riskRule.Observed_Picklist_Value__c) &&
        riskRule.Observed_Picklist_Value__c !=
        observationRecord.Observed_Picklist_Value__c
      ) {
        continue;
      }
      if (
        !String.isBlank(riskRule.Severity_Level__c) &&
        riskRule.Severity_Level__c != observationRecord.Severity_Level__c
      ) {
        continue;
      }
      if (
        riskRule.Requires_Intervention__c &&
        !observationRecord.Requires_Intervention__c
      ) {
        continue;
      }

      if (
        bestMatch == null ||
        riskRank(riskRule.Result_Welfare_Risk__c) >
        riskRank(bestMatch.riskLevel)
      ) {
        bestMatch = new RuleMatch();
        bestMatch.riskLevel = riskRule.Result_Welfare_Risk__c;
        bestMatch.autoCreateCarePlan = riskRule.Auto_Create_Care_Plan__c;
      } else if (bestMatch != null && riskRule.Auto_Create_Care_Plan__c) {
        bestMatch.autoCreateCarePlan = true;
      }
    }
    return bestMatch;
  }

  private static String fallbackRisk(Welfare_Observation__c observationRecord) {
    if (String.isBlank(observationRecord.Severity_Level__c)) {
      return observationRecord.Requires_Intervention__c ? 'High' : 'Low';
    }
    if (observationRecord.Severity_Level__c == 'Critical') {
      return 'Critical';
    }
    if (observationRecord.Severity_Level__c == 'High') {
      return 'High';
    }
    if (observationRecord.Severity_Level__c == 'Moderate') {
      return 'Moderate';
    }
    return 'Low';
  }

  private static Integer riskRank(String riskLevel) {
    if (riskLevel == 'Critical') {
      return 4;
    }
    if (riskLevel == 'High') {
      return 3;
    }
    if (riskLevel == 'Moderate') {
      return 2;
    }
    return 1;
  }
}
