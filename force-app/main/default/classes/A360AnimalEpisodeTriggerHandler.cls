public with sharing class A360AnimalEpisodeTriggerHandler {
  private static Boolean isExecuting = false;

  public void beforeInsert(List<Animal_Episode__c> newRecords) {
    execute(newRecords, null);
  }

  public void beforeUpdate(
    List<Animal_Episode__c> newRecords,
    Map<Id, Animal_Episode__c> oldMap
  ) {
    execute(newRecords, oldMap);
  }

  private void execute(
    List<Animal_Episode__c> newRecords,
    Map<Id, Animal_Episode__c> oldMap
  ) {
    if (isExecuting) {
      return;
    }

    isExecuting = true;
    try {
      A360AnimalIntegrityService.validateEpisodes(newRecords, oldMap);
    } finally {
      isExecuting = false;
    }
  }
}
