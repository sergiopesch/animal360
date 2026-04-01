public with sharing class A360AnimalLocationStayTriggerHandler {
  private static Boolean isExecuting = false;

  public void beforeInsert(List<Animal_Location_Stay__c> newRecords) {
    execute(newRecords, null);
  }

  public void beforeUpdate(
    List<Animal_Location_Stay__c> newRecords,
    Map<Id, Animal_Location_Stay__c> oldMap
  ) {
    execute(newRecords, oldMap);
  }

  private void execute(
    List<Animal_Location_Stay__c> newRecords,
    Map<Id, Animal_Location_Stay__c> oldMap
  ) {
    if (isExecuting) {
      return;
    }

    isExecuting = true;
    try {
      A360AnimalIntegrityService.validateLocationStays(newRecords, oldMap);
    } finally {
      isExecuting = false;
    }
  }
}
