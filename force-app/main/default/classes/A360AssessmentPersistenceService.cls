public without sharing class A360AssessmentPersistenceService {
  public class Request {
    @InvocableVariable(required=true)
    public Id episodeId;

    @InvocableVariable
    public Id templateId;

    @InvocableVariable(required=true)
    public String payloadJson;
  }

  public class Result {
    @InvocableVariable
    public Id assessmentId;

    @InvocableVariable
    public Id episodeId;
  }

  private class AssessmentPayload {
    public String assessmentDateTime;
    public String assessmentType;
    public String assessmentContext;
    public String assessmentStatus;
    public Decimal completeness;
    public String overallNegativeGrade;
    public String overallPositiveGrade;
    public String overallWelfareConcern;
    public String domain5MentalStateSummary;
    public String confidenceLevel;
    public Boolean immediateActionRequired;
    public String nextReviewDate;
    public Id assessorId;
    public Id relatedCaseId;
    public List<DomainSummaryPayload> domainSummaries;
    public List<ObservationPayload> observations;
  }

  private class DomainSummaryPayload {
    public String domainCode;
    public String negativeGrade;
    public String positiveGrade;
    public String keyFindings;
    public String inferredAffects;
    public Boolean actionRequired;
    public String actionSummary;
    public String confidenceLevel;
  }

  private class ObservationPayload {
    public String indicatorKey;
    public String indicatorLabel;
    public String domainCode;
    public String observationValueType;
    public Boolean observedBoolean;
    public String observedPicklistValue;
    public Decimal observedNumericValue;
    public String observedText;
    public String observedDateTime;
    public String severityLevel;
    public String enhancementLevel;
    public String duration;
    public String frequency;
    public String evidenceSource;
    public String confidenceLevel;
    public Boolean requiresIntervention;
    public String interventionNotes;
  }

  private class PendingAssessment {
    public Request requestItem;
    public AssessmentPayload payload;
    public Animal_Episode__c episodeRecord;
    public Assessment_Template__c templateRecord;
    public Welfare_Assessment__c assessmentRecord;
  }

  @InvocableMethod(label='Save Welfare Assessment')
  public static List<Result> saveAssessments(List<Request> requests) {
    List<Result> results = new List<Result>();
    if (requests == null || requests.isEmpty()) {
      return results;
    }

    Set<Id> episodeIds = new Set<Id>();
    Set<Id> templateIds = new Set<Id>();
    List<PendingAssessment> pendingAssessments = new List<PendingAssessment>();

    for (Request requestItem : requests) {
      if (requestItem == null || requestItem.episodeId == null) {
        continue;
      }

      episodeIds.add(requestItem.episodeId);
      if (requestItem.templateId != null) {
        templateIds.add(requestItem.templateId);
      }

      PendingAssessment pending = new PendingAssessment();
      pending.requestItem = requestItem;
      pending.payload = parsePayload(requestItem.payloadJson);
      pendingAssessments.add(pending);
    }

    Map<Id, Animal_Episode__c> episodesById = new Map<Id, Animal_Episode__c>(
      [
        SELECT Id, Animal__c
        FROM Animal_Episode__c
        WHERE Id IN :episodeIds
      ]
    );

    for (PendingAssessment pending : pendingAssessments) {
      if (pending.requestItem.templateId == null) {
        pending.requestItem.templateId = A360AssessmentTemplateService.resolveDefaultTemplateId(
          pending.requestItem.episodeId,
          pending.payload.assessmentContext
        );
      }
      if (pending.requestItem.templateId != null) {
        templateIds.add(pending.requestItem.templateId);
      }
    }

    Map<Id, Assessment_Template__c> templatesById = templateIds.isEmpty()
      ? new Map<Id, Assessment_Template__c>()
      : new Map<Id, Assessment_Template__c>(
          [
            SELECT Id, Template_Code__c, Metadata_Template_Key__c, Version__c
            FROM Assessment_Template__c
            WHERE Id IN :templateIds
          ]
        );

    Map<Id, Set<String>> requiredIndicatorKeysByTemplateId = new Map<Id, Set<String>>();
    if (!templateIds.isEmpty()) {
      for (Template_Indicator_Assignment__c assignmentRecord : [
        SELECT Assessment_Template__c, Indicator_Key__c
        FROM Template_Indicator_Assignment__c
        WHERE Assessment_Template__c IN :templateIds AND Is_Required__c = TRUE
      ]) {
        if (
          !requiredIndicatorKeysByTemplateId.containsKey(
            assignmentRecord.Assessment_Template__c
          )
        ) {
          requiredIndicatorKeysByTemplateId.put(
            assignmentRecord.Assessment_Template__c,
            new Set<String>()
          );
        }
        requiredIndicatorKeysByTemplateId.get(
            assignmentRecord.Assessment_Template__c
          )
          .add(assignmentRecord.Indicator_Key__c);
      }
    }

    List<Welfare_Assessment__c> assessmentsToInsert = new List<Welfare_Assessment__c>();
    for (PendingAssessment pending : pendingAssessments) {
      pending.episodeRecord = episodesById.get(pending.requestItem.episodeId);
      pending.templateRecord = pending.requestItem.templateId == null
        ? null
        : templatesById.get(pending.requestItem.templateId);

      if (pending.episodeRecord == null) {
        continue;
      }

      Decimal completeness = pending.payload.completeness;
      if (completeness == null) {
        completeness = calculateCompleteness(
          pending.templateRecord == null
            ? null
            : requiredIndicatorKeysByTemplateId.get(pending.templateRecord.Id),
          pending.payload.observations
        );
      }

      String resolvedOverallConcern = pending.payload.overallWelfareConcern;
      if (
        String.isBlank(resolvedOverallConcern) &&
        pending.payload.immediateActionRequired == true
      ) {
        resolvedOverallConcern = 'High';
      }

      Welfare_Assessment__c assessmentRecord = new Welfare_Assessment__c(
        Animal_Episode__c = pending.episodeRecord.Id,
        Animal__c = pending.episodeRecord.Animal__c,
        Assessment_Template__c = pending.templateRecord == null
          ? null
          : pending.templateRecord.Id,
        Assessor__c = pending.payload.assessorId == null
          ? UserInfo.getUserId()
          : pending.payload.assessorId,
        Related_Case__c = pending.payload.relatedCaseId,
        Assessment_DateTime__c = parseDateTime(
          pending.payload.assessmentDateTime
        ),
        Assessment_Type__c = String.isBlank(pending.payload.assessmentType)
          ? 'Baseline'
          : pending.payload.assessmentType,
        Assessment_Context__c = String.isBlank(
            pending.payload.assessmentContext
          )
          ? 'Routine'
          : pending.payload.assessmentContext,
        Assessment_Status__c = String.isBlank(pending.payload.assessmentStatus)
          ? 'Completed'
          : pending.payload.assessmentStatus,
        Completeness__c = completeness,
        Overall_Negative_Grade__c = pending.payload.overallNegativeGrade,
        Overall_Positive_Grade__c = pending.payload.overallPositiveGrade,
        Overall_Welfare_Concern__c = resolvedOverallConcern,
        Domain_5_Mental_State_Summary__c = pending.payload.domain5MentalStateSummary,
        Confidence_Level__c = pending.payload.confidenceLevel,
        Immediate_Action_Required__c = pending.payload.immediateActionRequired ==
          true,
        Next_Review_Date__c = parseDate(pending.payload.nextReviewDate),
        Template_Code_Snapshot__c = pending.templateRecord == null
          ? null
          : pending.templateRecord.Template_Code__c,
        Template_Version_Snapshot__c = pending.templateRecord == null
          ? null
          : pending.templateRecord.Version__c,
        Template_Key_Snapshot__c = pending.templateRecord == null
          ? null
          : pending.templateRecord.Metadata_Template_Key__c
      );
      if (assessmentRecord.Assessment_DateTime__c == null) {
        assessmentRecord.Assessment_DateTime__c = System.now();
      }

      pending.assessmentRecord = assessmentRecord;
      assessmentsToInsert.add(assessmentRecord);
    }

    if (!assessmentsToInsert.isEmpty()) {
      insert assessmentsToInsert;
    }

    List<Welfare_Domain_Summary__c> domainSummariesToInsert = new List<Welfare_Domain_Summary__c>();
    List<Welfare_Observation__c> observationsToInsert = new List<Welfare_Observation__c>();

    for (PendingAssessment pending : pendingAssessments) {
      if (
        pending.assessmentRecord == null ||
        pending.assessmentRecord.Id == null
      ) {
        continue;
      }

      if (pending.payload.domainSummaries != null) {
        for (
          DomainSummaryPayload summaryPayload : pending.payload.domainSummaries
        ) {
          if (
            summaryPayload == null || String.isBlank(summaryPayload.domainCode)
          ) {
            continue;
          }

          domainSummariesToInsert.add(
            new Welfare_Domain_Summary__c(
              Welfare_Assessment__c = pending.assessmentRecord.Id,
              Domain_Code__c = summaryPayload.domainCode,
              Negative_Grade__c = summaryPayload.negativeGrade,
              Positive_Grade__c = summaryPayload.positiveGrade,
              Key_Findings__c = summaryPayload.keyFindings,
              Inferred_Affects__c = summaryPayload.inferredAffects,
              Action_Required__c = summaryPayload.actionRequired == true,
              Action_Summary__c = summaryPayload.actionSummary,
              Confidence_Level__c = summaryPayload.confidenceLevel,
              Assessment_Domain_Key__c = String.valueOf(
                  pending.assessmentRecord.Id
                ) +
                '::' +
                summaryPayload.domainCode
            )
          );
        }
      }

      if (pending.payload.observations != null) {
        for (
          ObservationPayload observationPayload : pending.payload.observations
        ) {
          if (
            observationPayload == null ||
            String.isBlank(observationPayload.indicatorKey)
          ) {
            continue;
          }

          observationsToInsert.add(
            new Welfare_Observation__c(
              Welfare_Assessment__c = pending.assessmentRecord.Id,
              Indicator_Key__c = observationPayload.indicatorKey,
              Indicator_Label__c = observationPayload.indicatorLabel,
              Domain_Code__c = observationPayload.domainCode,
              Observation_Value_Type__c = observationPayload.observationValueType,
              Observed_Boolean__c = observationPayload.observedBoolean == true,
              Observed_Picklist_Value__c = observationPayload.observedPicklistValue,
              Observed_Numeric_Value__c = observationPayload.observedNumericValue,
              Observed_Text__c = observationPayload.observedText,
              Observed_DateTime__c = parseDateTime(
                observationPayload.observedDateTime
              ),
              Severity_Level__c = observationPayload.severityLevel,
              Enhancement_Level__c = observationPayload.enhancementLevel,
              Duration__c = observationPayload.duration,
              Frequency__c = observationPayload.frequency,
              Evidence_Source__c = observationPayload.evidenceSource,
              Confidence_Level__c = observationPayload.confidenceLevel,
              Requires_Intervention__c = observationPayload.requiresIntervention ==
                true,
              Intervention_Notes__c = observationPayload.interventionNotes,
              Observation_Key__c = String.valueOf(pending.assessmentRecord.Id) +
                '::' +
                observationPayload.indicatorKey
            )
          );
        }
      }

      Result result = new Result();
      result.assessmentId = pending.assessmentRecord.Id;
      result.episodeId = pending.assessmentRecord.Animal_Episode__c;
      results.add(result);
    }

    if (!domainSummariesToInsert.isEmpty()) {
      insert domainSummariesToInsert;
    }
    if (!observationsToInsert.isEmpty()) {
      insert observationsToInsert;
    }

    return results;
  }

  private static AssessmentPayload parsePayload(String payloadJson) {
    if (String.isBlank(payloadJson)) {
      return new AssessmentPayload();
    }

    AssessmentPayload payload = (AssessmentPayload) JSON.deserialize(
      payloadJson,
      AssessmentPayload.class
    );
    return payload == null ? new AssessmentPayload() : payload;
  }

  private static Decimal calculateCompleteness(
    Set<String> requiredIndicatorKeys,
    List<ObservationPayload> observations
  ) {
    if (requiredIndicatorKeys == null || requiredIndicatorKeys.isEmpty()) {
      return 100;
    }

    Set<String> capturedIndicatorKeys = new Set<String>();
    if (observations != null) {
      for (ObservationPayload observation : observations) {
        if (observation != null && !String.isBlank(observation.indicatorKey)) {
          capturedIndicatorKeys.add(observation.indicatorKey);
        }
      }
    }

    Integer matchedCount = 0;
    for (String requiredIndicatorKey : requiredIndicatorKeys) {
      if (capturedIndicatorKeys.contains(requiredIndicatorKey)) {
        matchedCount++;
      }
    }

    Decimal completeness =
      (Decimal.valueOf(String.valueOf(matchedCount)) * 100) /
      Decimal.valueOf(String.valueOf(requiredIndicatorKeys.size()));
    return completeness.setScale(0);
  }

  private static Datetime parseDateTime(String rawValue) {
    if (String.isBlank(rawValue)) {
      return null;
    }

    String normalized = rawValue.trim().replace('T', ' ').replace('Z', '');
    Integer decimalIndex = normalized.indexOf('.');
    if (decimalIndex > -1) {
      normalized = normalized.substring(0, decimalIndex);
    }

    try {
      return Datetime.valueOfGmt(normalized);
    } catch (Exception firstError) {
      return Datetime.valueOf(normalized);
    }
  }

  private static Date parseDate(String rawValue) {
    if (String.isBlank(rawValue)) {
      return null;
    }
    return Date.valueOf(rawValue);
  }
}
