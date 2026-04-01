trigger A360AnimalIdentifierTrigger on Animal_Identifier__c(
  before insert,
  before update
) {
  A360AnimalIdentifierTriggerHandler handler = new A360AnimalIdentifierTriggerHandler();

  if (Trigger.isBefore) {
    if (Trigger.isInsert) {
      handler.beforeInsert(Trigger.new);
    }
    if (Trigger.isUpdate) {
      handler.beforeUpdate(Trigger.new, Trigger.oldMap);
    }
  }
}
