@IsTest
private class A360EstateMapServiceTest {
  @TestSetup
  static void setupData() {
    Account site = new Account(Name = 'Love 4 Animals - North London Rescue');
    insert site;

    List<Housing_Unit__c> housingUnits = new List<Housing_Unit__c>{
      new Housing_Unit__c(
        Name = 'Kennel A1',
        Unit_Code__c = 'UK-RESCUE-KEN-A1',
        Housing_Type__c = 'Kennel',
        Capacity__c = 2,
        Current_Occupancy__c = 1,
        Is_Active__c = true,
        Site_Account__c = site.Id
      ),
      new Housing_Unit__c(
        Name = 'Cattery Blue',
        Unit_Code__c = 'UK-RESCUE-CAT-BLUE',
        Housing_Type__c = 'Cattery',
        Capacity__c = 3,
        Current_Occupancy__c = 1,
        Is_Active__c = true,
        Site_Account__c = site.Id
      )
    };
    insert housingUnits;

    A360_Estate_Map__c estateMap = new A360_Estate_Map__c(
      Name = 'North London Rescue Estate',
      Map_Code__c = 'UK_RESCUE_NORTH_LONDON',
      Status__c = 'Published',
      Is_Default__c = true,
      Canvas_Width__c = 1200,
      Canvas_Height__c = 720,
      Background_Style__c = 'Whiteboard',
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
      Primary_Image_URL__c = 'https://example.com/animal360/biscuit.jpg',
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

    Animal__c rabbit = new Animal__c(
      Display_Name__c = 'Scout',
      Species__c = 'Rabbit',
      Primary_Image_URL__c = 'https://example.com/animal360/scout.jpg',
      Current_Welfare_Risk__c = 'Low',
      Estimated_Age_Months__c = 14
    );
    insert rabbit;

    insert new Animal_Episode__c(
      Animal__c = rabbit.Id,
      Episode_Type__c = 'Intake',
      Episode_Status__c = 'Open',
      Intake_DateTime__c = System.now().addHours(-4),
      Is_Current__c = true
    );
  }

  @IsTest
  static void getMapContextReturnsPublishedMapAndAnimals() {
    Test.startTest();
    A360EstateMapService.MapContext context = A360EstateMapService.getMapContext(
      null
    );
    Test.stopTest();

    System.assertEquals('North London Rescue Estate', context.mapName);
    System.assertEquals('Published', context.status);
    System.assertEquals('Whiteboard', context.backgroundStyle);
    System.assertEquals(2, context.areas.size());
    System.assertEquals('Ready', context.areas[0].operationalStatus);
    System.assertEquals(1, context.animals.size());
    System.assertEquals('Biscuit', context.animals[0].animalName);
    System.assertEquals('Dog', context.animals[0].species);
    System.assertEquals(
      'https://example.com/animal360/biscuit.jpg',
      context.animals[0].primaryImageUrl
    );
    System.assert(!context.housingOptions.isEmpty());
  }

  @IsTest
  static void saveAreasUpdatesLayoutAndPublishKeepsDefault() {
    A360EstateMapService.bypassEditPermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
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
    System.assertEquals(1, savedContext.areas.size());
  }

  @IsTest
  static void saveMapSettingsUpdatesCanvas() {
    A360EstateMapService.bypassEditPermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
      LIMIT 1
    ];

    A360EstateMapService.MapSettingsRequest settings = new A360EstateMapService.MapSettingsRequest();
    settings.mapName = 'North London Rescue Board';
    settings.canvasWidth = 1600;
    settings.canvasHeight = 900;
    settings.backgroundStyle = 'Garden';

    Test.startTest();
    A360EstateMapService.MapContext context = A360EstateMapService.saveMapSettings(
      String.valueOf(estateMap.Id),
      settings
    );
    Test.stopTest();

    System.assertEquals('North London Rescue Board', context.mapName);
    System.assertEquals(1600, context.canvasWidth);
    System.assertEquals(900, context.canvasHeight);
    System.assertEquals('Garden', context.backgroundStyle);
  }

  @IsTest
  static void saveMapConfigurationUpdatesCanvasAndAreasTogether() {
    A360EstateMapService.bypassEditPermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
      LIMIT 1
    ];
    A360_Map_Area__c area = [
      SELECT Id, Area_Code__c
      FROM A360_Map_Area__c
      WHERE Area_Code__c = 'KEN-A1'
      LIMIT 1
    ];

    A360EstateMapService.MapSettingsRequest settings = new A360EstateMapService.MapSettingsRequest();
    settings.mapName = 'North London Rescue Live Board';
    settings.canvasWidth = 1500;
    settings.canvasHeight = 840;
    settings.backgroundStyle = 'Clinical';

    A360EstateMapService.AreaSaveRequest requestItem = new A360EstateMapService.AreaSaveRequest();
    requestItem.id = String.valueOf(area.Id);
    requestItem.areaCode = area.Area_Code__c;
    requestItem.label = 'Kennel A1 Live';
    requestItem.zone = 'Kennels';
    requestItem.shape = 'Rectangle';
    requestItem.operationalStatus = 'Ready';
    requestItem.x = 15;
    requestItem.y = 25;
    requestItem.width = 24;
    requestItem.height = 18;
    requestItem.rotation = 0;
    requestItem.fillColor = '#e3fcef';
    requestItem.displayOrder = 10;

    Test.startTest();
    A360EstateMapService.MapContext context = A360EstateMapService.saveMapConfiguration(
      String.valueOf(estateMap.Id),
      settings,
      new List<A360EstateMapService.AreaSaveRequest>{ requestItem }
    );
    Test.stopTest();

    System.assertEquals('North London Rescue Live Board', context.mapName);
    System.assertEquals('Clinical', context.backgroundStyle);
    System.assertEquals(1500, context.canvasWidth);
    Boolean foundArea = false;
    for (A360EstateMapService.MapAreaDto mapArea : context.areas) {
      if (mapArea.id == String.valueOf(area.Id)) {
        foundArea =
          mapArea.label == 'Kennel A1 Live' &&
          mapArea.shape == 'Rectangle';
      }
    }
    System.assert(foundArea, 'Expected combined save to update area layout.');
  }

  @IsTest
  static void saveAreasRejectsInvalidPercentages() {
    A360EstateMapService.bypassEditPermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
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
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
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
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
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
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
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

  @IsTest
  static void searchAnimalsForAreaReturnsOffBoardAnimals() {
    A360EstateMapService.bypassMovePermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
      LIMIT 1
    ];
    A360_Map_Area__c targetArea = [
      SELECT Id
      FROM A360_Map_Area__c
      WHERE Area_Code__c = 'CAT-BLUE'
      LIMIT 1
    ];

    Test.startTest();
    List<A360EstateMapService.AnimalSearchResultDto> results = A360EstateMapService.searchAnimalsForArea(
      String.valueOf(estateMap.Id),
      String.valueOf(targetArea.Id),
      'Scout'
    );
    Test.stopTest();

    Assert.areEqual(1, results.size(), 'Scout should be available to add.');
    Assert.areEqual('Scout', results[0].animalName, 'Expected Scout result.');
    Assert.isFalse(results[0].isOnBoard, 'Scout should not already be mapped.');
  }

  @IsTest
  static void moveAnimalCreatesStayWhenAnimalIsNotOnBoard() {
    A360EstateMapService.bypassMovePermission = true;
    A360_Estate_Map__c estateMap = [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'UK_RESCUE_NORTH_LONDON'
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
      WHERE Display_Name__c = 'Scout'
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
    Assert.areEqual(
      1,
      currentStays.size(),
      'Expected a new current stay for the off-board animal.'
    );
    Assert.areEqual(
      targetArea.Housing_Unit__c,
      currentStays[0].Housing_Unit__c,
      'Expected Scout to be assigned to the target housing unit.'
    );

    Boolean tokenAdded = false;
    for (A360EstateMapService.AnimalTokenDto token : movedContext.animals) {
      if (token.animalName == 'Scout') {
        tokenAdded = token.areaId == String.valueOf(targetArea.Id);
      }
    }
    Assert.isTrue(tokenAdded, 'Expected Scout to appear on the board.');
  }
}
