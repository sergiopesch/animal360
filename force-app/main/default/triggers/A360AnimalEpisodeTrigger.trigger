trigger A360AnimalEpisodeTrigger on Animal_Episode__c(
  before insert,
  before update
) {
  A360AnimalEpisodeTriggerHandler handler = new A360AnimalEpisodeTriggerHandler();

  if (Trigger.isBefore) {
    if (Trigger.isInsert) {
      handler.beforeInsert(Trigger.new);
    }
    if (Trigger.isUpdate) {
      handler.beforeUpdate(Trigger.new, Trigger.oldMap);
    }
  }
}
