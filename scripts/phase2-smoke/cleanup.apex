String smokeNamePrefix = 'A360 Phase II Smoke Animal%';
Id runningUserId = UserInfo.getUserId();

List<Animal__c> smokeAnimals = [
  SELECT Id, Display_Name__c
  FROM Animal__c
  WHERE Display_Name__c LIKE :smokeNamePrefix AND CreatedById = :runningUserId
];
Set<Id> smokeAnimalIds = new Map<Id, Animal__c>(smokeAnimals).keySet();

List<Animal_Episode__c> smokeEpisodes = smokeAnimalIds.isEmpty()
  ? new List<Animal_Episode__c>()
  : [
      SELECT Id
      FROM Animal_Episode__c
      WHERE Animal__c IN :smokeAnimalIds
    ];
Set<Id> smokeEpisodeIds = new Map<Id, Animal_Episode__c>(smokeEpisodes).keySet();

List<Welfare_Assessment__c> smokeAssessments = smokeEpisodeIds.isEmpty()
  ? new List<Welfare_Assessment__c>()
  : [
      SELECT Id
      FROM Welfare_Assessment__c
      WHERE Animal_Episode__c IN :smokeEpisodeIds
    ];
Set<Id> smokeAssessmentIds = new Map<Id, Welfare_Assessment__c>(smokeAssessments)
  .keySet();

Map<Id, Care_Plan__c> smokeCarePlansById = new Map<Id, Care_Plan__c>();
if (!smokeEpisodeIds.isEmpty()) {
  smokeCarePlansById.putAll([
    SELECT Id
    FROM Care_Plan__c
    WHERE Animal_Episode__c IN :smokeEpisodeIds
  ]);
}
if (!smokeAssessmentIds.isEmpty()) {
  smokeCarePlansById.putAll([
    SELECT Id
    FROM Care_Plan__c
    WHERE Primary_Assessment__c IN :smokeAssessmentIds
  ]);
}
List<Care_Plan__c> smokeCarePlans = smokeCarePlansById.values();
Set<Id> smokeCarePlanIds = smokeCarePlansById.keySet();

List<Care_Plan_Action__c> smokeActions = smokeCarePlanIds.isEmpty()
  ? new List<Care_Plan_Action__c>()
  : [
      SELECT Id
      FROM Care_Plan_Action__c
      WHERE Care_Plan__c IN :smokeCarePlanIds
    ];
List<Welfare_Observation__c> smokeObservations = smokeAssessmentIds.isEmpty()
  ? new List<Welfare_Observation__c>()
  : [
      SELECT Id
      FROM Welfare_Observation__c
      WHERE Welfare_Assessment__c IN :smokeAssessmentIds
    ];
List<Welfare_Domain_Summary__c> smokeSummaries = smokeAssessmentIds.isEmpty()
  ? new List<Welfare_Domain_Summary__c>()
  : [
      SELECT Id
      FROM Welfare_Domain_Summary__c
      WHERE Welfare_Assessment__c IN :smokeAssessmentIds
    ];

Integer deletedActions = smokeActions.size();
Integer deletedCarePlans = smokeCarePlans.size();
Integer deletedObservations = smokeObservations.size();
Integer deletedSummaries = smokeSummaries.size();
Integer deletedAssessments = smokeAssessments.size();
Integer deletedEpisodes = smokeEpisodes.size();
Integer deletedAnimals = smokeAnimals.size();

if (!smokeActions.isEmpty()) {
  Database.delete(smokeActions, false);
}
if (!smokeCarePlans.isEmpty()) {
  Database.delete(smokeCarePlans, false);
}
if (!smokeObservations.isEmpty()) {
  Database.delete(smokeObservations, false);
}
if (!smokeSummaries.isEmpty()) {
  Database.delete(smokeSummaries, false);
}
if (!smokeAssessments.isEmpty()) {
  Database.delete(smokeAssessments, false);
}
if (!smokeEpisodes.isEmpty()) {
  Database.delete(smokeEpisodes, false);
}
if (!smokeAnimals.isEmpty()) {
  Database.delete(smokeAnimals, false);
}

Map<String, Object> cleanupSummary = new Map<String, Object>{
  'deletedAnimals' => deletedAnimals,
  'deletedEpisodes' => deletedEpisodes,
  'deletedAssessments' => deletedAssessments,
  'deletedDomainSummaries' => deletedSummaries,
  'deletedObservations' => deletedObservations,
  'deletedCarePlans' => deletedCarePlans,
  'deletedCarePlanActions' => deletedActions,
  'userId' => runningUserId
};
System.debug('A360_PHASE2_SMOKE_CLEANUP ' + JSON.serialize(cleanupSummary));
