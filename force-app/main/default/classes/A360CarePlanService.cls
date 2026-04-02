public without sharing class A360CarePlanService {
  public class Request {
    @InvocableVariable
    public Id assessmentId;

    @InvocableVariable
    public Id episodeId;

    @InvocableVariable
    public String planType;

    @InvocableVariable
    public Id ownerUserId;

    @InvocableVariable
    public String targetReviewDate;

    @InvocableVariable
    public String primaryGoal;

    @InvocableVariable
    public String successCriteria;

    @InvocableVariable
    public String actionJson;

    @InvocableVariable
    public Boolean skipIfOpenForAssessment;
  }

  public class Result {
    @InvocableVariable
    public Id carePlanId;

    @InvocableVariable
    public Integer actionCount;
  }

  private class ActionPayload {
    public String actionType;
    public String description;
    public Id assignedToId;
    public String dueDate;
    public String status;
    public String completionNotes;
  }

  private class PendingPlan {
    public Request requestItem;
    public Welfare_Assessment__c assessmentRecord;
    public Care_Plan__c carePlanRecord;
    public List<ActionPayload> actionPayloads;
  }

  @InvocableMethod(label='Create Care Plan')
  public static List<Result> createPlans(List<Request> requests) {
    List<Result> results = new List<Result>();
    if (requests == null || requests.isEmpty()) {
      return results;
    }

    Set<Id> assessmentIds = new Set<Id>();
    for (Request requestItem : requests) {
      if (requestItem != null && requestItem.assessmentId != null) {
        assessmentIds.add(requestItem.assessmentId);
      }
    }

    Map<Id, Welfare_Assessment__c> assessmentsById = assessmentIds.isEmpty()
      ? new Map<Id, Welfare_Assessment__c>()
      : new Map<Id, Welfare_Assessment__c>(
          [
            SELECT
              Id,
              Animal_Episode__c,
              Assessor__c,
              Next_Review_Date__c,
              Overall_Welfare_Concern__c,
              Immediate_Action_Required__c
            FROM Welfare_Assessment__c
            WHERE Id IN :assessmentIds
          ]
        );

    Map<Id, Care_Plan__c> existingOpenPlanByAssessmentId = new Map<Id, Care_Plan__c>();
    if (!assessmentIds.isEmpty()) {
      for (Care_Plan__c existingPlan : [
        SELECT Id, Primary_Assessment__c
        FROM Care_Plan__c
        WHERE
          Primary_Assessment__c IN :assessmentIds
          AND Status__c NOT IN ('Completed', 'Cancelled')
      ]) {
        if (
          !existingOpenPlanByAssessmentId.containsKey(
            existingPlan.Primary_Assessment__c
          )
        ) {
          existingOpenPlanByAssessmentId.put(
            existingPlan.Primary_Assessment__c,
            existingPlan
          );
        }
      }
    }

    Animal360_Automation_Setting__mdt automationSetting = [
      SELECT
        Default_Care_Plan_Type__c,
        Default_Action_Type__c,
        Default_Review_Days__c
      FROM Animal360_Automation_Setting__mdt
      WHERE Setting_Key__c = 'DEFAULT'
      LIMIT 1
    ];

    Map<Id, List<Welfare_Observation__c>> observationsByAssessmentId = new Map<Id, List<Welfare_Observation__c>>();
    if (!assessmentIds.isEmpty()) {
      for (Welfare_Observation__c observationRecord : [
        SELECT
          Welfare_Assessment__c,
          Indicator_Label__c,
          Indicator_Key__c,
          Observed_Picklist_Value__c,
          Observed_Text__c,
          Severity_Level__c,
          Requires_Intervention__c
        FROM Welfare_Observation__c
        WHERE
          Welfare_Assessment__c IN :assessmentIds
          AND (Requires_Intervention__c = TRUE
          OR Severity_Level__c IN ('High', 'Critical'))
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
    }

    List<PendingPlan> pendingPlans = new List<PendingPlan>();
    List<Care_Plan__c> plansToInsert = new List<Care_Plan__c>();
    for (Request requestItem : requests) {
      if (requestItem == null) {
        continue;
      }

      if (
        requestItem.assessmentId != null &&
        requestItem.skipIfOpenForAssessment == true &&
        existingOpenPlanByAssessmentId.containsKey(requestItem.assessmentId)
      ) {
        Result existingResult = new Result();
        existingResult.carePlanId = existingOpenPlanByAssessmentId
          .get(requestItem.assessmentId)
          .Id;
        existingResult.actionCount = 0;
        results.add(existingResult);
        continue;
      }

      PendingPlan pending = new PendingPlan();
      pending.requestItem = requestItem;
      pending.assessmentRecord = requestItem.assessmentId == null
        ? null
        : assessmentsById.get(requestItem.assessmentId);

      Id resolvedEpisodeId = requestItem.episodeId;
      if (resolvedEpisodeId == null && pending.assessmentRecord != null) {
        resolvedEpisodeId = pending.assessmentRecord.Animal_Episode__c;
      }
      if (resolvedEpisodeId == null) {
        continue;
      }

      Id resolvedOwnerUserId = requestItem.ownerUserId;
      if (resolvedOwnerUserId == null && pending.assessmentRecord != null) {
        resolvedOwnerUserId = pending.assessmentRecord.Assessor__c;
      }
      if (resolvedOwnerUserId == null) {
        resolvedOwnerUserId = UserInfo.getUserId();
      }

      Date targetReviewDate = parseDate(requestItem.targetReviewDate);
      if (targetReviewDate == null && pending.assessmentRecord != null) {
        targetReviewDate = pending.assessmentRecord.Next_Review_Date__c;
      }
      if (targetReviewDate == null) {
        targetReviewDate = Date.today()
          .addDays(
            Integer.valueOf(
              String.valueOf(automationSetting.Default_Review_Days__c)
            )
          );
      }

      String resolvedPlanType = String.isBlank(requestItem.planType)
        ? automationSetting.Default_Care_Plan_Type__c
        : requestItem.planType;
      String resolvedPrimaryGoal = String.isBlank(requestItem.primaryGoal)
        ? defaultPrimaryGoal(pending.assessmentRecord)
        : requestItem.primaryGoal;
      String resolvedSuccessCriteria = String.isBlank(
          requestItem.successCriteria
        )
        ? 'Document that the identified risk has reduced and the next review can proceed as planned.'
        : requestItem.successCriteria;

      pending.carePlanRecord = new Care_Plan__c(
        Animal_Episode__c = resolvedEpisodeId,
        Primary_Assessment__c = requestItem.assessmentId,
        Plan_Type__c = resolvedPlanType,
        Status__c = 'Open',
        Start_Date__c = Date.today(),
        Target_Review_Date__c = targetReviewDate,
        Primary_Goal__c = resolvedPrimaryGoal,
        Success_Criteria__c = resolvedSuccessCriteria,
        Owner_User__c = resolvedOwnerUserId,
        Auto_Created__c = requestItem.skipIfOpenForAssessment == true
      );
      pending.actionPayloads = parseActionPayloads(requestItem.actionJson);
      pendingPlans.add(pending);
      plansToInsert.add(pending.carePlanRecord);
    }

    if (!plansToInsert.isEmpty()) {
      insert plansToInsert;
    }

    List<Care_Plan_Action__c> actionsToInsert = new List<Care_Plan_Action__c>();
    for (PendingPlan pending : pendingPlans) {
      List<ActionPayload> actionPayloads = pending.actionPayloads;
      if (actionPayloads == null || actionPayloads.isEmpty()) {
        actionPayloads = buildDefaultActions(
          pending.assessmentRecord,
          observationsByAssessmentId.containsKey(
              pending.requestItem.assessmentId
            )
            ? observationsByAssessmentId.get(pending.requestItem.assessmentId)
            : new List<Welfare_Observation__c>(),
          automationSetting
        );
      }

      for (ActionPayload actionPayload : actionPayloads) {
        Date actionDueDate = parseDate(actionPayload.dueDate);
        actionsToInsert.add(
          new Care_Plan_Action__c(
            Care_Plan__c = pending.carePlanRecord.Id,
            Action_Type__c = String.isBlank(actionPayload.actionType)
              ? automationSetting.Default_Action_Type__c
              : actionPayload.actionType,
            Description__c = actionPayload.description,
            Assigned_To__c = actionPayload.assignedToId == null
              ? pending.carePlanRecord.Owner_User__c
              : actionPayload.assignedToId,
            Due_Date__c = actionDueDate == null
              ? pending.carePlanRecord.Target_Review_Date__c
              : actionDueDate,
            Status__c = String.isBlank(actionPayload.status)
              ? 'Planned'
              : actionPayload.status,
            Completion_Notes__c = actionPayload.completionNotes,
            Completed_On__c = actionPayload.status == 'Completed'
              ? System.now()
              : null
          )
        );
      }

      Result result = new Result();
      result.carePlanId = pending.carePlanRecord.Id;
      result.actionCount = actionPayloads.size();
      results.add(result);
    }

    if (!actionsToInsert.isEmpty()) {
      insert actionsToInsert;
    }

    return results;
  }

  private static List<ActionPayload> parseActionPayloads(String actionJson) {
    if (String.isBlank(actionJson)) {
      return new List<ActionPayload>();
    }

    List<ActionPayload> actionPayloads = (List<ActionPayload>) JSON.deserialize(
      actionJson,
      List<ActionPayload>.class
    );
    return actionPayloads == null ? new List<ActionPayload>() : actionPayloads;
  }

  private static List<ActionPayload> buildDefaultActions(
    Welfare_Assessment__c assessmentRecord,
    List<Welfare_Observation__c> observations,
    Animal360_Automation_Setting__mdt automationSetting
  ) {
    List<ActionPayload> actions = new List<ActionPayload>();
    for (Welfare_Observation__c observationRecord : observations) {
      ActionPayload actionPayload = new ActionPayload();
      actionPayload.actionType = automationSetting.Default_Action_Type__c;
      actionPayload.description =
        'Review ' +
        displayIndicatorName(observationRecord) +
        ' and document the intervention response.' +
        observedValueSuffix(observationRecord);
      actions.add(actionPayload);
    }

    if (actions.isEmpty()) {
      ActionPayload actionPayload = new ActionPayload();
      actionPayload.actionType = automationSetting.Default_Action_Type__c;
      actionPayload.description = String.isBlank(
          defaultPrimaryGoal(assessmentRecord)
        )
        ? 'Review the assessment and confirm the next intervention step.'
        : defaultPrimaryGoal(assessmentRecord);
      actions.add(actionPayload);
    }

    return actions;
  }

  private static String defaultPrimaryGoal(
    Welfare_Assessment__c assessmentRecord
  ) {
    if (assessmentRecord == null) {
      return 'Stabilise the identified welfare concern and confirm follow-up actions.';
    }
    return 'Address the ' +
      assessmentRecord.Overall_Welfare_Concern__c +
      ' welfare concern identified by the linked assessment.';
  }

  private static String displayIndicatorName(
    Welfare_Observation__c observationRecord
  ) {
    return String.isBlank(observationRecord.Indicator_Label__c)
      ? observationRecord.Indicator_Key__c
      : observationRecord.Indicator_Label__c;
  }

  private static String observedValueSuffix(
    Welfare_Observation__c observationRecord
  ) {
    if (!String.isBlank(observationRecord.Observed_Picklist_Value__c)) {
      return ' Observed value: ' +
        observationRecord.Observed_Picklist_Value__c +
        '.';
    }
    if (!String.isBlank(observationRecord.Observed_Text__c)) {
      return ' Observation note: ' + observationRecord.Observed_Text__c + '.';
    }
    return '';
  }

  private static Date parseDate(String rawValue) {
    if (String.isBlank(rawValue)) {
      return null;
    }
    return Date.valueOf(rawValue);
  }
}
