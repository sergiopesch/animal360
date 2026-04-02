trigger A360WelfareObservationTrigger on Welfare_Observation__c(
  before insert,
  before update
) {
  if (Trigger.isBefore) {
    A360AssessmentIntegrityService.prepareObservations(Trigger.new);
  }
}
