trigger A360AssessmentTemplateTrigger on Assessment_Template__c(
  before insert,
  before update
) {
  if (Trigger.isBefore) {
    A360AssessmentIntegrityService.prepareTemplates(Trigger.new);
  }
}
