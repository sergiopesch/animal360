trigger A360WelfareDomainSummaryTrigger on Welfare_Domain_Summary__c(
  before insert,
  before update
) {
  if (Trigger.isBefore) {
    A360AssessmentIntegrityService.prepareDomainSummaries(Trigger.new);
  }
}
