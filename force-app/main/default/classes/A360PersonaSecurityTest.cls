@IsTest
private class A360PersonaSecurityTest {
  private static final String ASSESSOR_PERMISSION_SET = 'Animal360_Assessor';
  private static final String CARE_MANAGER_PERMISSION_SET = 'Animal360_Care_Manager';
  private static final String CLINICAL_PERMISSION_SET = 'Animal360_Clinical_User';
  private static final String READ_ONLY_PERMISSION_SET = 'Animal360_Read_Only';
  private static final String MAP_MANAGER_PERMISSION_SET = 'Animal360_Estate_Map_Manager';
  private static final String MAP_VIEWER_PERMISSION_SET = 'Animal360_Estate_Map_Viewer';

  @TestSetup
  static void setupPersonaData() {
    A360AssessmentTemplateService.seedTemplates(true);

    Account siteAccount = new Account(Name = 'Animal360 Persona Test Site');
    insert siteAccount;

    List<Housing_Unit__c> housingUnits = new List<Housing_Unit__c>{
      new Housing_Unit__c(
        Name = 'Persona Kennel A',
        Unit_Code__c = 'PERSONA-KEN-A',
        Housing_Type__c = 'Kennel',
        Capacity__c = 2,
        Current_Occupancy__c = 1,
        Is_Active__c = true,
        Site_Account__c = siteAccount.Id
      ),
      new Housing_Unit__c(
        Name = 'Persona Kennel B',
        Unit_Code__c = 'PERSONA-KEN-B',
        Housing_Type__c = 'Kennel',
        Capacity__c = 2,
        Current_Occupancy__c = 0,
        Is_Active__c = true,
        Site_Account__c = siteAccount.Id
      )
    };
    insert housingUnits;

    A360_Estate_Map__c estateMap = new A360_Estate_Map__c(
      Name = 'Persona Security Estate Map',
      Map_Code__c = 'PERSONA_SECURITY_MAP',
      Status__c = 'Published',
      Is_Default__c = true,
      Canvas_Width__c = 1200,
      Canvas_Height__c = 720,
      Background_Style__c = 'Whiteboard',
      Site_Account__c = siteAccount.Id,
      Published_On__c = System.now()
    );
    insert estateMap;

    insert new List<A360_Map_Area__c>{
      new A360_Map_Area__c(
        Name = 'Persona Area A',
        Estate_Map__c = estateMap.Id,
        Area_Code__c = 'PERSONA-A',
        Label__c = 'Persona Area A',
        Zone__c = 'Kennels',
        Shape__c = 'Rounded Rectangle',
        X_Pct__c = 10,
        Y_Pct__c = 15,
        Width_Pct__c = 20,
        Height_Pct__c = 20,
        Housing_Unit__c = housingUnits[0].Id,
        Display_Order__c = 10,
        Is_Active__c = true,
        Operational_Status__c = 'Ready'
      ),
      new A360_Map_Area__c(
        Name = 'Persona Area B',
        Estate_Map__c = estateMap.Id,
        Area_Code__c = 'PERSONA-B',
        Label__c = 'Persona Area B',
        Zone__c = 'Kennels',
        Shape__c = 'Rounded Rectangle',
        X_Pct__c = 40,
        Y_Pct__c = 15,
        Width_Pct__c = 20,
        Height_Pct__c = 20,
        Housing_Unit__c = housingUnits[1].Id,
        Display_Order__c = 20,
        Is_Active__c = true,
        Operational_Status__c = 'Ready'
      )
    };

    Animal__c animal = new Animal__c(
      Display_Name__c = 'Persona Buddy',
      Species__c = 'Dog',
      Estimated_Age_Months__c = 36
    );
    insert animal;

    Animal_Episode__c episode = new Animal_Episode__c(
      Animal__c = animal.Id,
      Episode_Type__c = 'Intake',
      Episode_Status__c = 'Open',
      Intake_DateTime__c = System.now().addDays(-1),
      Is_Current__c = true
    );
    insert episode;

    insert new Animal_Location_Stay__c(
      Animal_Episode__c = episode.Id,
      Housing_Unit__c = housingUnits[0].Id,
      Start_DateTime__c = System.now().addHours(-12),
      Is_Current__c = true,
      Move_Reason__c = 'Routine Move'
    );

    Welfare_Assessment__c assessment = new Welfare_Assessment__c(
      Animal__c = animal.Id,
      Animal_Episode__c = episode.Id,
      Assessor__c = UserInfo.getUserId(),
      Assessment_DateTime__c = System.now(),
      Assessment_Type__c = 'Baseline',
      Assessment_Context__c = 'Routine',
      Assessment_Status__c = 'Completed',
      Overall_Welfare_Concern__c = 'Moderate',
      Next_Review_Date__c = Date.today().addDays(7)
    );
    insert assessment;

    Care_Plan__c carePlan = new Care_Plan__c(
      Animal_Episode__c = episode.Id,
      Primary_Assessment__c = assessment.Id,
      Plan_Type__c = 'Behaviour',
      Status__c = 'Open',
      Start_Date__c = Date.today(),
      Target_Review_Date__c = Date.today().addDays(7),
      Primary_Goal__c = 'Persona regression care goal',
      Success_Criteria__c = 'Persona regression criteria met',
      Owner_User__c = UserInfo.getUserId()
    );
    insert carePlan;
  }

  @IsTest
  static void assessorCanSaveAssessmentButCannotCreateCarePlan() {
    User assessor = createPersonaUser('assessor', ASSESSOR_PERMISSION_SET);

    System.runAs(assessor) {
      Animal_Episode__c episode = getPersonaEpisode();
      Assessment_Template__c templateRecord = [
        SELECT Id
        FROM Assessment_Template__c
        WHERE Metadata_Template_Key__c = 'COMPANION_ROUTINE_V1'
        LIMIT 1
      ];

      A360AssessmentPersistenceService.Request saveRequest = new A360AssessmentPersistenceService.Request();
      saveRequest.episodeId = episode.Id;
      saveRequest.templateId = templateRecord.Id;
      saveRequest.payloadJson = JSON.serialize(
        new Map<String, Object>{
          'assessmentDateTime' => '2026-06-16T10:00:00.000Z',
          'assessmentType' => 'Baseline',
          'assessmentContext' => 'Routine',
          'assessmentStatus' => 'Completed',
          'confidenceLevel' => 'High',
          'observations' => new List<Object>{
            new Map<String, Object>{
              'indicatorKey' => 'APPETITE',
              'indicatorLabel' => 'Appetite',
              'domainCode' => 'D1_Nutrition',
              'observationValueType' => 'Picklist',
              'observedPicklistValue' => 'Normal',
              'severityLevel' => 'Low',
              'evidenceSource' => 'Direct Observation',
              'confidenceLevel' => 'High',
              'requiresIntervention' => false
            }
          }
        }
      );

      Test.startTest();
      List<A360AssessmentPersistenceService.Result> saveResults = A360AssessmentPersistenceService.saveAssessments(
        new List<A360AssessmentPersistenceService.Request>{ saveRequest }
      );
      Test.stopTest();

      Assert.areEqual(
        1,
        saveResults.size(),
        'Assessor should save one assessment.'
      );
      Assert.areEqual(
        1,
        [
          SELECT COUNT()
          FROM Welfare_Observation__c
          WHERE Welfare_Assessment__c = :saveResults[0].assessmentId
        ],
        'Assessor assessment save should persist the observation.'
      );

      assertUserModeInsertDenied(
        new Care_Plan__c(
          Animal_Episode__c = episode.Id,
          Primary_Assessment__c = saveResults[0].assessmentId,
          Plan_Type__c = 'Behaviour',
          Status__c = 'Open',
          Start_Date__c = Date.today(),
          Target_Review_Date__c = Date.today().addDays(7),
          Primary_Goal__c = 'Assessor should not create this plan',
          Success_Criteria__c = 'Access denied by persona',
          Owner_User__c = assessor.Id
        ),
        'Assessor should not create care plans.'
      );
    }
  }

  @IsTest
  static void careManagerCanCreateCarePlanAndReadOnlyCannotWrite() {
    User careManager = createPersonaUser(
      'caremgr',
      CARE_MANAGER_PERMISSION_SET
    );
    User readOnly = createPersonaUser('readonly', READ_ONLY_PERMISSION_SET);

    System.runAs(careManager) {
      Welfare_Assessment__c assessment = getPersonaAssessment();

      A360CarePlanService.Request carePlanRequest = new A360CarePlanService.Request();
      carePlanRequest.assessmentId = assessment.Id;
      carePlanRequest.planType = 'Behaviour';
      carePlanRequest.targetReviewDate = String.valueOf(
        Date.today().addDays(5)
      );
      carePlanRequest.primaryGoal = 'Care manager persona goal';
      carePlanRequest.successCriteria = 'Care manager owns follow-up actions';
      carePlanRequest.actionJson = JSON.serialize(
        new List<Map<String, Object>>{
          new Map<String, Object>{
            'actionType' => 'Review Assessment',
            'description' => 'Care manager persona follow-up',
            'assignedToId' => careManager.Id,
            'dueDate' => String.valueOf(Date.today().addDays(3)),
            'status' => 'Planned'
          }
        }
      );

      Test.startTest();
      List<A360CarePlanService.Result> results = A360CarePlanService.createPlans(
        new List<A360CarePlanService.Request>{ carePlanRequest }
      );
      Test.stopTest();

      Assert.areEqual(
        1,
        results.size(),
        'Care manager should create one care plan.'
      );
      Assert.areEqual(
        1,
        results[0].actionCount,
        'Care manager should create one action.'
      );
      Assert.areEqual(
        1,
        [
          SELECT COUNT()
          FROM Care_Plan_Action__c
          WHERE Care_Plan__c = :results[0].carePlanId
        ],
        'Expected the explicit care plan action to persist.'
      );
    }

    System.runAs(readOnly) {
      Assert.areEqual(
        1,
        [
          SELECT COUNT()
          FROM Animal__c
          WHERE Display_Name__c = 'Persona Buddy'
          WITH USER_MODE
        ],
        'Read-only persona should read animal records.'
      );

      assertUserModeInsertDenied(
        new Welfare_Assessment__c(
          Animal__c = getPersonaAnimal().Id,
          Animal_Episode__c = getPersonaEpisode().Id,
          Assessor__c = readOnly.Id,
          Assessment_DateTime__c = System.now(),
          Assessment_Type__c = 'Baseline',
          Assessment_Context__c = 'Routine',
          Assessment_Status__c = 'Completed'
        ),
        'Read-only persona should not create welfare assessments.'
      );
    }
  }

  @IsTest
  static void clinicalUserCanCreateActionButCannotCreateAssessment() {
    User clinicalUser = createPersonaUser('clinical', CLINICAL_PERMISSION_SET);

    System.runAs(clinicalUser) {
      Care_Plan__c carePlan = getPersonaCarePlan();

      Test.startTest();
      Database.insert(
        new Care_Plan_Action__c(
          Care_Plan__c = carePlan.Id,
          Action_Type__c = 'Clinical Review',
          Description__c = 'Clinical persona action',
          Assigned_To__c = clinicalUser.Id,
          Due_Date__c = Date.today().addDays(2),
          Status__c = 'Planned'
        ),
        AccessLevel.USER_MODE
      );
      Test.stopTest();

      Assert.areEqual(
        1,
        [
          SELECT COUNT()
          FROM Care_Plan_Action__c
          WHERE
            Care_Plan__c = :carePlan.Id
            AND Action_Type__c = 'Clinical Review'
        ],
        'Clinical user should create care plan actions.'
      );

      assertUserModeInsertDenied(
        new Welfare_Assessment__c(
          Animal__c = getPersonaAnimal().Id,
          Animal_Episode__c = getPersonaEpisode().Id,
          Assessor__c = clinicalUser.Id,
          Assessment_DateTime__c = System.now(),
          Assessment_Type__c = 'Baseline',
          Assessment_Context__c = 'Clinical',
          Assessment_Status__c = 'Completed'
        ),
        'Clinical user should not create welfare assessments.'
      );
    }
  }

  @IsTest
  static void estateMapManagerCanOperateAndViewerCannotEdit() {
    User mapManager = createPersonaUser('mapmgr', MAP_MANAGER_PERMISSION_SET);
    User mapViewer = createPersonaUser('mapview', MAP_VIEWER_PERMISSION_SET);

    System.runAs(mapManager) {
      A360_Estate_Map__c estateMap = getPersonaEstateMap();
      A360_Map_Area__c targetArea = [
        SELECT Id
        FROM A360_Map_Area__c
        WHERE Area_Code__c = 'PERSONA-B'
        LIMIT 1
      ];
      Animal__c animal = getPersonaAnimal();

      Test.startTest();
      A360EstateMapService.MapContext context = A360EstateMapService.getMapContext(
        String.valueOf(estateMap.Id)
      );
      A360EstateMapService.MapContext movedContext = A360EstateMapService.moveAnimal(
        String.valueOf(estateMap.Id),
        String.valueOf(animal.Id),
        String.valueOf(targetArea.Id)
      );
      Test.stopTest();

      Assert.isTrue(
        context.canEdit,
        'Estate map manager should be able to edit maps.'
      );
      Assert.isTrue(
        context.canMove,
        'Estate map manager should be able to move animals.'
      );

      Boolean animalMoved = false;
      for (A360EstateMapService.AnimalTokenDto token : movedContext.animals) {
        if (token.animalId == String.valueOf(animal.Id)) {
          animalMoved = token.areaId == String.valueOf(targetArea.Id);
        }
      }
      Assert.isTrue(
        animalMoved,
        'Estate map manager should move the animal token.'
      );
    }

    System.runAs(mapViewer) {
      A360_Map_Area__c sourceArea = [
        SELECT Id
        FROM A360_Map_Area__c
        WHERE Area_Code__c = 'PERSONA-A'
        LIMIT 1
      ];

      Assert.areEqual(
        1,
        [
          SELECT COUNT()
          FROM A360_Estate_Map__c
          WHERE Map_Code__c = 'PERSONA_SECURITY_MAP'
          WITH USER_MODE
        ],
        'Estate map viewer should read estate maps.'
      );

      assertUserModeUpdateDenied(
        new A360_Map_Area__c(
          Id = sourceArea.Id,
          Operational_Status__c = 'Cleaning'
        ),
        'Estate map viewer should not update map areas.'
      );
    }
  }

  private static User createPersonaUser(
    String aliasSeed,
    String permissionSetName
  ) {
    String uniqueSeed =
      String.valueOf(System.now().getTime()) +
      '.' +
      aliasSeed +
      '.' +
      Math.abs(Crypto.getRandomInteger());
    User personaUser = new User(
      FirstName = 'Animal360',
      LastName = aliasSeed,
      Email = uniqueSeed + '@animal360.example',
      Username = uniqueSeed + '@animal360.example',
      Alias = aliasSeed.left(8),
      TimeZoneSidKey = 'America/Los_Angeles',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US',
      ProfileId = getStandardProfileId()
    );
    insert personaUser;

    PermissionSet permissionSet = [
      SELECT Id
      FROM PermissionSet
      WHERE Name = :permissionSetName
      LIMIT 1
    ];
    insert new PermissionSetAssignment(
      AssigneeId = personaUser.Id,
      PermissionSetId = permissionSet.Id
    );
    return personaUser;
  }

  private static Id getStandardProfileId() {
    List<Profile> minimumAccessProfiles = [
      SELECT Id
      FROM Profile
      WHERE Name = 'Minimum Access - Salesforce'
      LIMIT 1
    ];
    if (!minimumAccessProfiles.isEmpty()) {
      return minimumAccessProfiles[0].Id;
    }

    List<Profile> standardProfiles = [
      SELECT Id
      FROM Profile
      WHERE Name = 'Standard User'
      LIMIT 1
    ];
    if (!standardProfiles.isEmpty()) {
      return standardProfiles[0].Id;
    }

    return [
      SELECT Id
      FROM Profile
      WHERE UserType = 'Standard' AND PermissionsModifyAllData = FALSE
      LIMIT 1
    ]
    .Id;
  }

  private static Animal__c getPersonaAnimal() {
    return [
      SELECT Id
      FROM Animal__c
      WHERE Display_Name__c = 'Persona Buddy'
      LIMIT 1
    ];
  }

  private static Animal_Episode__c getPersonaEpisode() {
    return [
      SELECT Id, Animal__c
      FROM Animal_Episode__c
      WHERE Animal__r.Display_Name__c = 'Persona Buddy'
      LIMIT 1
    ];
  }

  private static Welfare_Assessment__c getPersonaAssessment() {
    return [
      SELECT Id, Animal__c, Animal_Episode__c
      FROM Welfare_Assessment__c
      WHERE Overall_Welfare_Concern__c = 'Moderate'
      LIMIT 1
    ];
  }

  private static Care_Plan__c getPersonaCarePlan() {
    return [
      SELECT Id
      FROM Care_Plan__c
      LIMIT 1
    ];
  }

  private static A360_Estate_Map__c getPersonaEstateMap() {
    return [
      SELECT Id
      FROM A360_Estate_Map__c
      WHERE Map_Code__c = 'PERSONA_SECURITY_MAP'
      LIMIT 1
    ];
  }

  private static void assertUserModeInsertDenied(
    SObject record,
    String failureMessage
  ) {
    try {
      Database.insert(record, AccessLevel.USER_MODE);
      Assert.fail(failureMessage);
    } catch (DmlException expected) {
      assertAccessDenied(expected, failureMessage);
    } catch (TypeException expected) {
      assertAccessDenied(expected, failureMessage);
    }
  }

  private static void assertUserModeUpdateDenied(
    SObject record,
    String failureMessage
  ) {
    try {
      Database.update(record, AccessLevel.USER_MODE);
      Assert.fail(failureMessage);
    } catch (DmlException expected) {
      assertAccessDenied(expected, failureMessage);
    } catch (TypeException expected) {
      assertAccessDenied(expected, failureMessage);
    }
  }

  private static void assertAccessDenied(
    DmlException expected,
    String failureMessage
  ) {
    assertAccessDenied(expected.getMessage(), failureMessage);
  }

  private static void assertAccessDenied(
    TypeException expected,
    String failureMessage
  ) {
    assertAccessDenied(expected.getMessage(), failureMessage);
  }

  private static void assertAccessDenied(
    String message,
    String failureMessage
  ) {
    Assert.isTrue(
      message.contains('insufficient access') ||
        message.contains('entity') ||
        message.contains('permission') ||
        message.contains('not have access') ||
        message.contains('not allowed'),
      failureMessage + ' Actual message: ' + message
    );
  }
}
