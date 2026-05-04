@IsTest
private class A360EstateMapServiceTest {
  @TestSetup
  static void setupData() {
    Account site = new Account(Name = 'Love 4 Animals - North London Demo');
    insert site;

    List<Housing_Unit__c> housingUnits = new List<Housing_Unit__c>{
      new Housing_Unit__c(
        Name = 'Kennel A1',
        Unit_Code__c = 'UK-DEMO-KEN-A1',
        Housing_Type__c = 'Kennel',
        Capacity__c = 2,
        Current_Occupancy__c = 1,
        Is_Active__c = true,
        Site_Account__c = site.Id
      ),
      new Housing_Unit__c(
        Name = 'Cattery Blue',
        Unit_Code__c = 'UK-DEMO-CAT-BLUE',
        Housing_Type__c = 'Cattery',
        Capacity__c = 3,
        Current_Occupancy__c = 1,
        Is_Active__c = true,
        Site_Account__c = site.Id
      )
    };
    insert housingUnits;

    A360_Estate_Map__c estateMap = new A360_Estate_Map__c(
      Name = 'North London Demo Estate',
      Map_Code__c = 'UK_DEMO_NORTH_LONDON',
      Status__c = 'Published',
      Is_Default__c = true,
      Canvas_Width__c = 1200,
      Canvas_Height__c = 720,
      Site_Account__c = site.Id,
      Published_On__c = System.now()
    );
    insert estateMap;

    insert new List<A360_Map_Area__c>{
      new A360_Map_Area__c(
        Name = 'Kennel A1',
        Estate_Map__c = estateMap.Id,
        Area_Code__c = 'KEN-A1',
        Label__c = 'Kennel A1',
        Zone__c = 'Kennels',
        Shape__c = 'Rounded Rectangle',
        X_Pct__c = 10,
        Y_Pct__c = 20,
        Width_Pct__c = 18,
        Height_Pct__c = 18,
        Fill_Color__c = '#d8e6fe',
        Housing_Unit__c = housingUnits[0].Id,
        Display_Order__c = 10,
        Is_Active__c = true
      ),
      new A360_Map_Area__c(
        Name = 'Cattery Blue',
        Estate_Map__c = estateMap.Id,
        Area_Code__c = 'CAT-BLUE',
        Label__c = 'Cattery Blue',
        Zone__c = 'Cattery',
        Shape__c = 'Rounded Rectangle',
        X_Pct__c = 44,
        Y_Pct__c = 22,
        Width_Pct__c = 20,
        Height_Pct__c = 16,
        Fill_Color__c = '#dcfae6',
        Housing_Unit__c = housingUnits[1].Id,
        Display_Order__c = 20,
        Is_Active__c = true
      )
    };

    Animal__c dog = new Animal__c(
      Display_Name__c = 'Biscuit',
      Species__c = 'Dog',
      Current_Welfare_Risk__c = 'Moderate',
      Estimated_Age_Months__c = 36
    );
    insert dog;

    Animal_Episode__c episode = new Animal_Episode__c(
      Animal__c = dog.Id,
      Episode_Type__c = 'Intake',
      Episode_Status__c = 'Open',
      Intake_DateTime__c = System.now().addDays(-2),
      Is_Current__c = true
    );
    insert episode;

    insert new Animal_Location_Stay__c(
      Animal_Episode__c = episode.Id,
      Housing_Unit__c = housingUnits[0].Id,
      Start_DateTime__c = System.now().addDays(-1),
      Is_Current__c = true,
      Move_Reason__c = 'Routine Move'
    );
  }

  @IsTest
  static void getMapContextReturnsPublishedMapAndAnimals() {
    Test.startTest();
    A360EstateMapService.MapContext context = A360EstateMapService.getMapContext(
      null
    );
    Test.stopTest();

    System.assertEquals('North London Demo Estate', context.mapName);
    System.assertEquals('Published', context.status);
    System.assertEquals(2, context.areas.size());
    System.assertEquals('Ready', context.areas[0].operationalStatus);
    System.assertEquals(1, context.animals.size());
    System.assertEquals('Biscuit', context.animals[0].animalName);
    System.assertEquals('Dog', context.animals[0].species);
    System.assert(!context.housingOptions.isEmpty());
  }

  @IsTest
  static void saveAreasUpdatesLayoutAndPublishKeepsDefault() {
    A360EstateMapService.bypassEditPermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_DEMO_NORTH_LONDON'
      LIMIT 1
    ];
    A360_Map_Area__c area = [
      SELECT Id, Area_Code__c
      FROM A360_Map_Area__c
      WHERE Area_Code__c = 'KEN-A1'
      LIMIT 1
    ];

    A360EstateMapService.AreaSaveRequest requestItem = new A360EstateMapService.AreaSaveRequest();
    requestItem.id = String.valueOf(area.Id);
    requestItem.areaCode = area.Area_Code__c;
    requestItem.label = 'Kennel A1 Resized';
    requestItem.zone = 'Kennels';
    requestItem.shape = 'Rounded Rectangle';
    requestItem.x = 12;
    requestItem.y = 24;
    requestItem.width = 22;
    requestItem.height = 19;
    requestItem.fillColor = '#d8e6fe';
    requestItem.displayOrder = 10;

    Test.startTest();
    A360EstateMapService.MapContext savedContext = A360EstateMapService.saveAreas(
      String.valueOf(estateMap.Id),
      new List<A360EstateMapService.AreaSaveRequest>{ requestItem }
    );
    A360EstateMapService.MapContext publishedContext = A360EstateMapService.publishMap(
      String.valueOf(estateMap.Id)
    );
    Test.stopTest();

    Boolean foundUpdatedArea = false;
    for (A360EstateMapService.MapAreaDto savedArea : savedContext.areas) {
      if (savedArea.label == 'Kennel A1 Resized') {
        foundUpdatedArea = true;
      }
    }
    System.assert(
      foundUpdatedArea,
      'Expected the resized area in the response.'
    );
    System.assertEquals('Published', publishedContext.status);
  }

  @IsTest
  static void saveAreasRejectsInvalidPercentages() {
    A360EstateMapService.bypassEditPermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_DEMO_NORTH_LONDON'
      LIMIT 1
    ];

    A360EstateMapService.AreaSaveRequest requestItem = new A360EstateMapService.AreaSaveRequest();
    requestItem.areaCode = 'BAD';
    requestItem.label = 'Invalid';
    requestItem.x = -1;
    requestItem.y = 10;
    requestItem.width = 10;
    requestItem.height = 10;

    Test.startTest();
    try {
      A360EstateMapService.saveAreas(
        String.valueOf(estateMap.Id),
        new List<A360EstateMapService.AreaSaveRequest>{ requestItem }
      );
      System.assert(false, 'Expected invalid percentage validation.');
    } catch (AuraHandledException expected) {
      System.assertNotEquals(null, expected);
    }
    Test.stopTest();
  }

  @IsTest
  static void moveAnimalClosesCurrentStayAndCreatesDestinationStay() {
    A360EstateMapService.bypassMovePermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_DEMO_NORTH_LONDON'
      LIMIT 1
    ];
    A360_Map_Area__c targetArea = [
      SELECT Id, Housing_Unit__c
      FROM A360_Map_Area__c
      WHERE Area_Code__c = 'CAT-BLUE'
      LIMIT 1
    ];
    Animal__c animal = [
      SELECT Id
      FROM Animal__c
      WHERE Display_Name__c = 'Biscuit'
      LIMIT 1
    ];

    Test.startTest();
    A360EstateMapService.MapContext movedContext = A360EstateMapService.moveAnimal(
      String.valueOf(estateMap.Id),
      String.valueOf(animal.Id),
      String.valueOf(targetArea.Id)
    );
    Test.stopTest();

    List<Animal_Location_Stay__c> currentStays = [
      SELECT Housing_Unit__c
      FROM Animal_Location_Stay__c
      WHERE Animal_Episode__r.Animal__c = :animal.Id AND Is_Current__c = TRUE
    ];
    System.assertEquals(
      1,
      currentStays.size(),
      'Expected one current stay after the move.'
    );
    System.assertEquals(
      targetArea.Housing_Unit__c,
      currentStays[0].Housing_Unit__c
    );

    Boolean tokenMoved = false;
    for (A360EstateMapService.AnimalTokenDto token : movedContext.animals) {
      if (token.animalName == 'Biscuit') {
        tokenMoved = token.areaId == String.valueOf(targetArea.Id);
      }
    }
    System.assert(
      tokenMoved,
      'Expected the board token to refresh onto the target area.'
    );
  }

  @IsTest
  static void updateAreaStatusMarksAreaForCleaning() {
    A360EstateMapService.bypassMovePermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_DEMO_NORTH_LONDON'
      LIMIT 1
    ];
    A360_Map_Area__c area = [
      SELECT Id
      FROM A360_Map_Area__c
      WHERE Area_Code__c = 'KEN-A1'
      LIMIT 1
    ];

    Test.startTest();
    A360EstateMapService.MapContext context = A360EstateMapService.updateAreaStatus(
      String.valueOf(estateMap.Id),
      String.valueOf(area.Id),
      'Cleaning'
    );
    Test.stopTest();

    Boolean foundCleaningArea = false;
    for (A360EstateMapService.MapAreaDto mapArea : context.areas) {
      if (mapArea.id == String.valueOf(area.Id)) {
        foundCleaningArea = mapArea.operationalStatus == 'Cleaning';
      }
    }
    System.assert(
      foundCleaningArea,
      'Expected area to be marked for cleaning.'
    );
  }

  @IsTest
  static void moveAnimalRejectsCleaningDestination() {
    A360EstateMapService.bypassMovePermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_DEMO_NORTH_LONDON'
      LIMIT 1
    ];
    A360_Map_Area__c targetArea = [
      SELECT Id
      FROM A360_Map_Area__c
      WHERE Area_Code__c = 'CAT-BLUE'
      LIMIT 1
    ];
    update new A360_Map_Area__c(
      Id = targetArea.Id,
      Operational_Status__c = 'Cleaning'
    );
    Animal__c animal = [
      SELECT Id
      FROM Animal__c
      WHERE Display_Name__c = 'Biscuit'
      LIMIT 1
    ];

    Test.startTest();
    try {
      A360EstateMapService.moveAnimal(
        String.valueOf(estateMap.Id),
        String.valueOf(animal.Id),
        String.valueOf(targetArea.Id)
      );
      System.assert(false, 'Expected cleaning destination rejection.');
    } catch (AuraHandledException expected) {
      System.assertNotEquals(null, expected);
    }
    Test.stopTest();
  }
}
