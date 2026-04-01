public with sharing class A360AnimalIdentifierTriggerHandler {
  private static Boolean isExecuting = false;

  public void beforeInsert(List<Animal_Identifier__c> newRecords) {
    execute(newRecords, null);
  }

  public void beforeUpdate(
    List<Animal_Identifier__c> newRecords,
    Map<Id, Animal_Identifier__c> oldMap
  ) {
    execute(newRecords, oldMap);
  }

  private void execute(
    List<Animal_Identifier__c> newRecords,
    Map<Id, Animal_Identifier__c> oldMap
  ) {
    if (isExecuting) {
      return;
    }

    isExecuting = true;
    try {
      A360AnimalIntegrityService.validateIdentifiers(newRecords, oldMap);
    } finally {
      isExecuting = false;
    }
  }
}
