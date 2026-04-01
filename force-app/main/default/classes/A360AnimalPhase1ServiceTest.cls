@isTest
private class A360AnimalPhase1ServiceTest {
  @TestSetup
  static void setupData() {
    insert new List<Housing_Unit__c>{
      new Housing_Unit__c(
        Name = 'Kennel 1',
        Unit_Code__c = 'KEN-1',
        Housing_Type__c = 'Kennel',
        Capacity__c = 1,
        Current_Occupancy__c = 0,
        Is_Active__c = true
      ),
      new Housing_Unit__c(
        Name = 'Kennel 2',
        Unit_Code__c = 'KEN-2',
        Housing_Type__c = 'Kennel',
        Capacity__c = 1,
        Current_Occupancy__c = 0,
        Is_Active__c = true
      )
    };
  }

  private static Animal__c buildAnimal(String suffix) {
    return new Animal__c(
      Display_Name__c = 'Animal ' + suffix,
      Species__c = 'Dog',
      Estimated_Age_Months__c = 12
    );
  }

  private static Animal_Episode__c buildEpisode(
    Id animalId,
    Datetime intakeDateTime,
    Boolean isCurrent
  ) {
    return new Animal_Episode__c(
      Animal__c = animalId,
      Episode_Type__c = 'Intake',
      Episode_Status__c = 'Open',
      Intake_DateTime__c = intakeDateTime,
      Is_Current__c = isCurrent
    );
  }

  private static Animal_Location_Stay__c buildStay(
    Id episodeId,
    Id housingUnitId,
    Datetime startDateTime,
    Datetime endDateTime,
    Boolean isCurrent
  ) {
    return new Animal_Location_Stay__c(
      Animal_Episode__c = episodeId,
      Housing_Unit__c = housingUnitId,
      Start_DateTime__c = startDateTime,
      End_DateTime__c = endDateTime,
      Is_Current__c = isCurrent,
      Move_Reason__c = 'Routine Move'
    );
  }

  private static Map<String, Id> housingIdsByCode() {
    Map<String, Id> idsByCode = new Map<String, Id>();
    for (Housing_Unit__c housingUnit : [
      SELECT Id, Unit_Code__c
      FROM Housing_Unit__c
    ]) {
      idsByCode.put(housingUnit.Unit_Code__c, housingUnit.Id);
    }
    return idsByCode;
  }

  @isTest
  static void testPrimaryIdentifierConstraint() {
    Animal__c animal = buildAnimal('Identifier');
    insert animal;

    insert new Animal_Identifier__c(
      Animal__c = animal.Id,
      Identifier_Type__c = 'Microchip',
      Identifier_Value__c = 'MC-1000',
      Is_Primary__c = true
    );

    Test.startTest();
    try {
      insert new Animal_Identifier__c(
        Animal__c = animal.Id,
        Identifier_Type__c = 'Shelter ID',
        Identifier_Value__c = 'SH-2000',
        Is_Primary__c = true
      );
      System.assert(false, 'Expected a primary identifier conflict.');
    } catch (DmlException error) {
      System.assert(
        error.getMessage().contains('Only one primary identifier'),
        'The trigger should block a second primary identifier.'
      );
    }
    Test.stopTest();
  }

  @isTest
  static void testCurrentEpisodeConstraintAndRollup() {
    Animal__c animal = buildAnimal('Episode');
    insert animal;

    Animal_Episode__c currentEpisode = buildEpisode(
      animal.Id,
      Datetime.newInstance(2026, 1, 1, 9, 0, 0),
      true
    );
    insert currentEpisode;

    A360AnimalRollupService.rollupAnimals(new Set<Id>{ animal.Id });

    Animal__c refreshedAnimal = [
      SELECT Current_Episode__c, Current_Status__c, Current_Care_Status__c
      FROM Animal__c
      WHERE Id = :animal.Id
    ];
    System.assertEquals(currentEpisode.Id, refreshedAnimal.Current_Episode__c);
    System.assertEquals('In Care', refreshedAnimal.Current_Status__c);
    System.assertEquals('Open', refreshedAnimal.Current_Care_Status__c);

    try {
      insert buildEpisode(
        animal.Id,
        Datetime.newInstance(2026, 1, 2, 9, 0, 0),
        true
      );
      System.assert(false, 'Expected a current episode conflict.');
    } catch (DmlException error) {
      System.assert(
        error.getMessage().contains('Only one current episode'),
        'The trigger should block a second current episode.'
      );
    }
  }

  @isTest
  static void testLocationStayOverlapAndRollup() {
    Map<String, Id> housingByCode = housingIdsByCode();

    Animal__c animal = buildAnimal('Stay');
    insert animal;

    Animal_Episode__c episode = buildEpisode(
      animal.Id,
      Datetime.newInstance(2026, 2, 1, 8, 0, 0),
      true
    );
    insert episode;

    Datetime firstStart = Datetime.newInstance(2026, 2, 1, 8, 0, 0);
    Animal_Location_Stay__c firstStay = buildStay(
      episode.Id,
      housingByCode.get('KEN-1'),
      firstStart,
      null,
      true
    );
    insert firstStay;

    A360AnimalRollupService.rollupAnimals(new Set<Id>{ animal.Id });

    Animal__c refreshedAnimal = [
      SELECT Current_Housing_Unit__c
      FROM Animal__c
      WHERE Id = :animal.Id
    ];
    Animal_Episode__c refreshedEpisode = [
      SELECT Current_Location_Stay__c
      FROM Animal_Episode__c
      WHERE Id = :episode.Id
    ];
    System.assertEquals(
      housingByCode.get('KEN-1'),
      refreshedAnimal.Current_Housing_Unit__c
    );
    System.assertEquals(
      firstStay.Id,
      refreshedEpisode.Current_Location_Stay__c
    );

    try {
      insert buildStay(
        episode.Id,
        housingByCode.get('KEN-2'),
        firstStart.addHours(2),
        firstStart.addHours(3),
        false
      );
      System.assert(false, 'Expected an overlapping stay conflict.');
    } catch (DmlException error) {
      System.assert(
        error.getMessage().contains('Location stays cannot overlap'),
        'The trigger should block overlapping location stays.'
      );
    }

    firstStay.End_DateTime__c = firstStart.addHours(4);
    firstStay.Is_Current__c = false;
    update firstStay;

    Animal_Location_Stay__c secondStay = buildStay(
      episode.Id,
      housingByCode.get('KEN-2'),
      firstStart.addHours(4),
      null,
      true
    );
    insert secondStay;

    Test.startTest();
    A360AnimalRollupService.rollupAnimals(new Set<Id>{ animal.Id });
    Test.stopTest();

    refreshedAnimal = [
      SELECT Current_Housing_Unit__c
      FROM Animal__c
      WHERE Id = :animal.Id
    ];
    refreshedEpisode = [
      SELECT Current_Location_Stay__c
      FROM Animal_Episode__c
      WHERE Id = :episode.Id
    ];
    System.assertEquals(
      housingByCode.get('KEN-2'),
      refreshedAnimal.Current_Housing_Unit__c
    );
    System.assertEquals(
      secondStay.Id,
      refreshedEpisode.Current_Location_Stay__c
    );
  }

  @isTest
  static void testBulkRollupAcrossAnimals() {
    Map<String, Id> housingByCode = housingIdsByCode();
    Datetime baseDateTime = Datetime.newInstance(2026, 3, 1, 10, 0, 0);

    List<Animal__c> animals = new List<Animal__c>();
    for (Integer indexValue = 0; indexValue < 25; indexValue++) {
      animals.add(buildAnimal('Bulk ' + indexValue));
    }
    insert animals;

    List<Animal_Episode__c> episodes = new List<Animal_Episode__c>();
    for (Integer indexValue = 0; indexValue < animals.size(); indexValue++) {
      episodes.add(
        buildEpisode(
          animals[indexValue].Id,
          baseDateTime.addDays(indexValue),
          true
        )
      );
    }
    insert episodes;

    List<Animal_Location_Stay__c> stays = new List<Animal_Location_Stay__c>();
    for (Integer indexValue = 0; indexValue < episodes.size(); indexValue++) {
      Id housingId = Math.mod(indexValue, 2) == 0
        ? housingByCode.get('KEN-1')
        : housingByCode.get('KEN-2');
      stays.add(
        buildStay(
          episodes[indexValue].Id,
          housingId,
          baseDateTime.addDays(indexValue),
          null,
          true
        )
      );
    }
    insert stays;

    Set<Id> animalIds = new Map<Id, Animal__c>(animals).keySet();

    Test.startTest();
    A360AnimalRollupService.rollupAnimals(animalIds);
    Test.stopTest();

    Integer currentAnimalCount = [
      SELECT COUNT()
      FROM Animal__c
      WHERE
        Id IN :animalIds
        AND Current_Status__c = 'In Care'
        AND Current_Episode__c != NULL
        AND Current_Housing_Unit__c != NULL
    ];
    System.assertEquals(animals.size(), currentAnimalCount);
  }
}
