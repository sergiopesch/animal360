public with sharing class A360AnimalIntegrityService {
  private static final String PRIMARY_IDENTIFIER_ERROR = 'Only one primary identifier is allowed per animal.';
  private static final String CURRENT_EPISODE_ERROR = 'Only one current episode is allowed per animal.';
  private static final String CURRENT_STAY_ERROR = 'Only one current location stay is allowed per episode.';
  private static final String OVERLAPPING_STAY_ERROR = 'Location stays cannot overlap within the same episode.';

  public static void validateIdentifiers(
    List<Animal_Identifier__c> newRecords,
    Map<Id, Animal_Identifier__c> oldMap
  ) {
    Map<Id, List<Animal_Identifier__c>> incomingPrimaryByAnimal = new Map<Id, List<Animal_Identifier__c>>();
    Set<Id> animalIds = new Set<Id>();
    Set<Id> excludedIds = new Set<Id>();

    for (Animal_Identifier__c recordItem : newRecords) {
      if (recordItem.Id != null) {
        excludedIds.add(recordItem.Id);
      }
      if (recordItem.Animal__c == null || !recordItem.Is_Primary__c) {
        continue;
      }

      animalIds.add(recordItem.Animal__c);
      if (!incomingPrimaryByAnimal.containsKey(recordItem.Animal__c)) {
        incomingPrimaryByAnimal.put(
          recordItem.Animal__c,
          new List<Animal_Identifier__c>()
        );
      }
      incomingPrimaryByAnimal.get(recordItem.Animal__c).add(recordItem);
    }

    if (animalIds.isEmpty()) {
      return;
    }

    Map<Id, List<Animal_Identifier__c>> existingPrimaryByAnimal = new Map<Id, List<Animal_Identifier__c>>();
    for (Animal_Identifier__c existingRecord : [
      SELECT Id, Animal__c
      FROM Animal_Identifier__c
      WHERE Animal__c IN :animalIds AND Is_Primary__c = TRUE
    ]) {
      if (excludedIds.contains(existingRecord.Id)) {
        continue;
      }
      if (!existingPrimaryByAnimal.containsKey(existingRecord.Animal__c)) {
        existingPrimaryByAnimal.put(
          existingRecord.Animal__c,
          new List<Animal_Identifier__c>()
        );
      }
      existingPrimaryByAnimal.get(existingRecord.Animal__c).add(existingRecord);
    }

    for (Id animalId : incomingPrimaryByAnimal.keySet()) {
      List<Animal_Identifier__c> incomingPrimaryRecords = incomingPrimaryByAnimal.get(
        animalId
      );
      Boolean hasConflict =
        incomingPrimaryRecords.size() > 1 ||
        existingPrimaryByAnimal.containsKey(animalId);
      if (!hasConflict) {
        continue;
      }

      for (Animal_Identifier__c recordItem : incomingPrimaryRecords) {
        recordItem.addError(PRIMARY_IDENTIFIER_ERROR);
      }
    }
  }

  public static void validateEpisodes(
    List<Animal_Episode__c> newRecords,
    Map<Id, Animal_Episode__c> oldMap
  ) {
    Map<Id, List<Animal_Episode__c>> incomingCurrentByAnimal = new Map<Id, List<Animal_Episode__c>>();
    Set<Id> animalIds = new Set<Id>();
    Set<Id> excludedIds = new Set<Id>();

    for (Animal_Episode__c recordItem : newRecords) {
      if (recordItem.Id != null) {
        excludedIds.add(recordItem.Id);
      }
      if (recordItem.Animal__c == null || !recordItem.Is_Current__c) {
        continue;
      }

      animalIds.add(recordItem.Animal__c);
      if (!incomingCurrentByAnimal.containsKey(recordItem.Animal__c)) {
        incomingCurrentByAnimal.put(
          recordItem.Animal__c,
          new List<Animal_Episode__c>()
        );
      }
      incomingCurrentByAnimal.get(recordItem.Animal__c).add(recordItem);
    }

    if (animalIds.isEmpty()) {
      return;
    }

    Set<Id> animalsWithExistingCurrent = new Set<Id>();
    for (Animal_Episode__c existingRecord : [
      SELECT Id, Animal__c
      FROM Animal_Episode__c
      WHERE Animal__c IN :animalIds AND Is_Current__c = TRUE
    ]) {
      if (excludedIds.contains(existingRecord.Id)) {
        continue;
      }
      animalsWithExistingCurrent.add(existingRecord.Animal__c);
    }

    for (Id animalId : incomingCurrentByAnimal.keySet()) {
      List<Animal_Episode__c> incomingCurrentRecords = incomingCurrentByAnimal.get(
        animalId
      );
      Boolean hasConflict =
        incomingCurrentRecords.size() > 1 ||
        animalsWithExistingCurrent.contains(animalId);
      if (!hasConflict) {
        continue;
      }

      for (Animal_Episode__c recordItem : incomingCurrentRecords) {
        recordItem.addError(CURRENT_EPISODE_ERROR);
      }
    }
  }

  public static void validateLocationStays(
    List<Animal_Location_Stay__c> newRecords,
    Map<Id, Animal_Location_Stay__c> oldMap
  ) {
    Map<Id, List<Animal_Location_Stay__c>> incomingByEpisode = new Map<Id, List<Animal_Location_Stay__c>>();
    Set<Id> episodeIds = new Set<Id>();
    Set<Id> excludedIds = new Set<Id>();

    for (Animal_Location_Stay__c recordItem : newRecords) {
      if (recordItem.Id != null) {
        excludedIds.add(recordItem.Id);
      }
      if (recordItem.Animal_Episode__c == null) {
        continue;
      }

      episodeIds.add(recordItem.Animal_Episode__c);
      if (!incomingByEpisode.containsKey(recordItem.Animal_Episode__c)) {
        incomingByEpisode.put(
          recordItem.Animal_Episode__c,
          new List<Animal_Location_Stay__c>()
        );
      }
      incomingByEpisode.get(recordItem.Animal_Episode__c).add(recordItem);
    }

    if (episodeIds.isEmpty()) {
      return;
    }

    Map<Id, List<Animal_Location_Stay__c>> existingByEpisode = new Map<Id, List<Animal_Location_Stay__c>>();
    for (Animal_Location_Stay__c existingRecord : [
      SELECT
        Id,
        Animal_Episode__c,
        Start_DateTime__c,
        End_DateTime__c,
        Is_Current__c
      FROM Animal_Location_Stay__c
      WHERE Animal_Episode__c IN :episodeIds
    ]) {
      if (excludedIds.contains(existingRecord.Id)) {
        continue;
      }
      if (!existingByEpisode.containsKey(existingRecord.Animal_Episode__c)) {
        existingByEpisode.put(
          existingRecord.Animal_Episode__c,
          new List<Animal_Location_Stay__c>()
        );
      }
      existingByEpisode.get(existingRecord.Animal_Episode__c)
        .add(existingRecord);
    }

    for (Id episodeId : incomingByEpisode.keySet()) {
      List<Animal_Location_Stay__c> incomingRecords = incomingByEpisode.get(
        episodeId
      );
      List<Animal_Location_Stay__c> existingRecords = existingByEpisode.containsKey(
          episodeId
        )
        ? existingByEpisode.get(episodeId)
        : new List<Animal_Location_Stay__c>();

      Integer incomingCurrentCount = 0;
      for (Animal_Location_Stay__c recordItem : incomingRecords) {
        if (recordItem.Is_Current__c) {
          incomingCurrentCount++;
        }
      }

      Boolean existingCurrentFound = false;
      for (Animal_Location_Stay__c existingRecord : existingRecords) {
        if (existingRecord.Is_Current__c) {
          existingCurrentFound = true;
          break;
        }
      }

      if (
        incomingCurrentCount > 1 ||
        (incomingCurrentCount > 0 && existingCurrentFound)
      ) {
        for (Animal_Location_Stay__c recordItem : incomingRecords) {
          if (recordItem.Is_Current__c) {
            recordItem.addError(CURRENT_STAY_ERROR);
          }
        }
      }

      for (Animal_Location_Stay__c recordItem : incomingRecords) {
        if (recordItem.Start_DateTime__c == null) {
          continue;
        }

        for (Animal_Location_Stay__c existingRecord : existingRecords) {
          if (existingRecord.Start_DateTime__c == null) {
            continue;
          }
          if (
            overlaps(
              recordItem.Start_DateTime__c,
              recordItem.End_DateTime__c,
              existingRecord.Start_DateTime__c,
              existingRecord.End_DateTime__c
            )
          ) {
            recordItem.addError(OVERLAPPING_STAY_ERROR);
            break;
          }
        }
      }

      for (Integer i = 0; i < incomingRecords.size(); i++) {
        Animal_Location_Stay__c leftRecord = incomingRecords[i];
        if (leftRecord.Start_DateTime__c == null) {
          continue;
        }

        for (Integer j = i + 1; j < incomingRecords.size(); j++) {
          Animal_Location_Stay__c rightRecord = incomingRecords[j];
          if (rightRecord.Start_DateTime__c == null) {
            continue;
          }

          if (
            overlaps(
              leftRecord.Start_DateTime__c,
              leftRecord.End_DateTime__c,
              rightRecord.Start_DateTime__c,
              rightRecord.End_DateTime__c
            )
          ) {
            leftRecord.addError(OVERLAPPING_STAY_ERROR);
            rightRecord.addError(OVERLAPPING_STAY_ERROR);
          }
        }
      }
    }
  }

  private static Boolean overlaps(
    Datetime startA,
    Datetime endA,
    Datetime startB,
    Datetime endB
  ) {
    Datetime normalizedEndA = endA == null
      ? Datetime.newInstance(9999, 12, 31, 23, 59, 59)
      : endA;
    Datetime normalizedEndB = endB == null
      ? Datetime.newInstance(9999, 12, 31, 23, 59, 59)
      : endB;
    return startA < normalizedEndB && startB < normalizedEndA;
  }
}
