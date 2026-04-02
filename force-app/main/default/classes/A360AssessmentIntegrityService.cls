public with sharing class A360AssessmentIntegrityService {
  public static void prepareTemplates(List<Assessment_Template__c> records) {
    if (records == null) {
      return;
    }

    for (Assessment_Template__c recordItem : records) {
      if (
        recordItem.Status__c == 'Active' &&
        recordItem.Default_For_Species__c &&
        !String.isBlank(recordItem.Species__c) &&
        !String.isBlank(recordItem.Context__c)
      ) {
        recordItem.Default_Context_Key__c =
          recordItem.Species__c +
          '::' +
          recordItem.Context__c;
      } else {
        recordItem.Default_Context_Key__c = null;
      }
    }
  }

  public static void prepareDomainSummaries(
    List<Welfare_Domain_Summary__c> records
  ) {
    if (records == null) {
      return;
    }

    for (Welfare_Domain_Summary__c recordItem : records) {
      if (
        recordItem.Welfare_Assessment__c != null &&
        !String.isBlank(recordItem.Domain_Code__c)
      ) {
        recordItem.Assessment_Domain_Key__c =
          String.valueOf(recordItem.Welfare_Assessment__c) +
          '::' +
          recordItem.Domain_Code__c;
      } else {
        recordItem.Assessment_Domain_Key__c = null;
      }
    }
  }

  public static void prepareObservations(List<Welfare_Observation__c> records) {
    if (records == null) {
      return;
    }

    for (Welfare_Observation__c recordItem : records) {
      if (String.isBlank(recordItem.Observation_Value_Type__c)) {
        recordItem.Observation_Value_Type__c = detectObservationValueType(
          recordItem
        );
      }

      if (
        recordItem.Welfare_Assessment__c != null &&
        !String.isBlank(recordItem.Indicator_Key__c)
      ) {
        recordItem.Observation_Key__c =
          String.valueOf(recordItem.Welfare_Assessment__c) +
          '::' +
          recordItem.Indicator_Key__c;
      } else {
        recordItem.Observation_Key__c = null;
      }
    }
  }

  private static String detectObservationValueType(
    Welfare_Observation__c recordItem
  ) {
    if (recordItem == null) {
      return null;
    }
    if (!String.isBlank(recordItem.Observed_Picklist_Value__c)) {
      return 'Picklist';
    }
    if (recordItem.Observed_Numeric_Value__c != null) {
      return 'Number';
    }
    if (!String.isBlank(recordItem.Observed_Text__c)) {
      return 'Text';
    }
    if (recordItem.Observed_DateTime__c != null) {
      return 'DateTime';
    }
    if (recordItem.Observed_Boolean__c) {
      return 'Boolean';
    }
    return null;
  }
}
