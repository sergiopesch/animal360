trigger A360AnimalLocationStayTrigger on Animal_Location_Stay__c(
  before insert,
  before update
) {
  A360AnimalLocationStayTriggerHandler handler = new A360AnimalLocationStayTriggerHandler();

  if (Trigger.isBefore) {
    if (Trigger.isInsert) {
      handler.beforeInsert(Trigger.new);
    }
    if (Trigger.isUpdate) {
      handler.beforeUpdate(Trigger.new, Trigger.oldMap);
    }
  }
}
