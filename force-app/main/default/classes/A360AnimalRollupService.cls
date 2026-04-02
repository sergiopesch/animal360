public without sharing class A360AnimalRollupService {
  public class Request {
    @InvocableVariable
    public Id animalId;

    @InvocableVariable
    public Id episodeId;
  }

  @InvocableMethod(label='Roll Up Animal Current State')
  public static void rollup(List<Request> requests) {
    Set<Id> animalIds = new Set<Id>();
    Set<Id> episodeIds = new Set<Id>();

    for (Request requestItem : requests) {
      if (requestItem == null) {
        continue;
      }
      if (requestItem.animalId != null) {
        animalIds.add(requestItem.animalId);
      }
      if (requestItem.episodeId != null) {
        episodeIds.add(requestItem.episodeId);
      }
    }

    if (!episodeIds.isEmpty()) {
      for (Animal_Episode__c episodeRecord : [
        SELECT Id, Animal__c
        FROM Animal_Episode__c
        WHERE Id IN :episodeIds
      ]) {
        if (episodeRecord.Animal__c != null) {
          animalIds.add(episodeRecord.Animal__c);
        }
      }
    }

    rollupAnimals(animalIds);
  }

  public static void rollupAnimals(Set<Id> animalIds) {
    if (animalIds == null || animalIds.isEmpty()) {
      return;
    }

    Map<Id, Animal__c> animalsById = new Map<Id, Animal__c>(
      [
        SELECT
          Id,
          Is_Deceased__c,
          Current_Episode__c,
          Current_Housing_Unit__c,
          Current_Status__c,
          Current_Care_Status__c,
          Current_Welfare_Risk__c
        FROM Animal__c
        WHERE Id IN :animalIds
      ]
    );
    if (animalsById.isEmpty()) {
      return;
    }

    Map<Id, Animal_Episode__c> currentEpisodeByAnimal = new Map<Id, Animal_Episode__c>();
    Set<Id> currentEpisodeIds = new Set<Id>();
    for (Animal_Episode__c episodeRecord : [
      SELECT
        Id,
        Animal__c,
        Episode_Status__c,
        Intake_DateTime__c,
        Current_Location_Stay__c,
        Current_Welfare_Level__c
      FROM Animal_Episode__c
      WHERE Animal__c IN :animalsById.keySet() AND Is_Current__c = TRUE
      ORDER BY Intake_DateTime__c DESC
    ]) {
      if (!currentEpisodeByAnimal.containsKey(episodeRecord.Animal__c)) {
        currentEpisodeByAnimal.put(episodeRecord.Animal__c, episodeRecord);
        currentEpisodeIds.add(episodeRecord.Id);
      }
    }

    Map<Id, Animal_Location_Stay__c> currentStayByEpisode = new Map<Id, Animal_Location_Stay__c>();
    if (!currentEpisodeIds.isEmpty()) {
      for (Animal_Location_Stay__c stayRecord : [
        SELECT Id, Animal_Episode__c, Housing_Unit__c, Start_DateTime__c
        FROM Animal_Location_Stay__c
        WHERE Animal_Episode__c IN :currentEpisodeIds AND Is_Current__c = TRUE
        ORDER BY Start_DateTime__c DESC
      ]) {
        if (!currentStayByEpisode.containsKey(stayRecord.Animal_Episode__c)) {
          currentStayByEpisode.put(stayRecord.Animal_Episode__c, stayRecord);
        }
      }
    }

    List<Animal__c> animalsToUpdate = new List<Animal__c>();
    for (Animal__c animalRecord : animalsById.values()) {
      Animal_Episode__c currentEpisode = currentEpisodeByAnimal.get(
        animalRecord.Id
      );
      Animal_Location_Stay__c currentStay = currentEpisode == null
        ? null
        : currentStayByEpisode.get(currentEpisode.Id);

      Id derivedCurrentEpisodeId = currentEpisode == null
        ? null
        : currentEpisode.Id;
      Id derivedCurrentHousingUnitId = currentStay == null
        ? null
        : currentStay.Housing_Unit__c;
      String derivedCurrentStatus = deriveAnimalStatus(
        animalRecord.Is_Deceased__c,
        currentEpisode
      );
      String derivedCurrentCareStatus = currentEpisode == null
        ? null
        : currentEpisode.Episode_Status__c;
      String derivedCurrentWelfareRisk = currentEpisode == null
        ? null
        : currentEpisode.Current_Welfare_Level__c;

      if (
        animalRecord.Current_Episode__c != derivedCurrentEpisodeId ||
        animalRecord.Current_Housing_Unit__c != derivedCurrentHousingUnitId ||
        animalRecord.Current_Status__c != derivedCurrentStatus ||
        animalRecord.Current_Care_Status__c != derivedCurrentCareStatus ||
        animalRecord.Current_Welfare_Risk__c != derivedCurrentWelfareRisk
      ) {
        animalsToUpdate.add(
          new Animal__c(
            Id = animalRecord.Id,
            Current_Episode__c = derivedCurrentEpisodeId,
            Current_Housing_Unit__c = derivedCurrentHousingUnitId,
            Current_Status__c = derivedCurrentStatus,
            Current_Care_Status__c = derivedCurrentCareStatus,
            Current_Welfare_Risk__c = derivedCurrentWelfareRisk
          )
        );
      }
    }

    if (!animalsToUpdate.isEmpty()) {
      update animalsToUpdate;
    }

    List<Animal_Episode__c> episodesToUpdate = new List<Animal_Episode__c>();
    for (Animal_Episode__c episodeRecord : currentEpisodeByAnimal.values()) {
      Id derivedCurrentStayId = currentStayByEpisode.containsKey(
          episodeRecord.Id
        )
        ? currentStayByEpisode.get(episodeRecord.Id).Id
        : null;
      if (episodeRecord.Current_Location_Stay__c != derivedCurrentStayId) {
        episodesToUpdate.add(
          new Animal_Episode__c(
            Id = episodeRecord.Id,
            Current_Location_Stay__c = derivedCurrentStayId
          )
        );
      }
    }

    if (!episodesToUpdate.isEmpty()) {
      update episodesToUpdate;
    }
  }

  private static String deriveAnimalStatus(
    Boolean isDeceased,
    Animal_Episode__c currentEpisode
  ) {
    if (isDeceased) {
      return 'Deceased';
    }
    if (currentEpisode != null) {
      return 'In Care';
    }
    return 'Exited Care';
  }
}
