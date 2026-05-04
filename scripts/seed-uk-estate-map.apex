List<Animal_Location_Stay__c> demoStays = [
  SELECT Id
  FROM Animal_Location_Stay__c
  WHERE Animal_Episode__r.Animal__r.Display_Name__c LIKE 'Demo - %'
];
if (!demoStays.isEmpty()) {
  delete demoStays;
}

List<Animal_Episode__c> demoEpisodes = [
  SELECT Id
  FROM Animal_Episode__c
  WHERE Animal__r.Display_Name__c LIKE 'Demo - %'
];
if (!demoEpisodes.isEmpty()) {
  delete demoEpisodes;
}

List<Animal__c> demoAnimals = [
  SELECT Id
  FROM Animal__c
  WHERE Display_Name__c LIKE 'Demo - %'
];
if (!demoAnimals.isEmpty()) {
  delete demoAnimals;
}

List<A360_Map_Connection__c> demoConnections = [
  SELECT Id
  FROM A360_Map_Connection__c
  WHERE Estate_Map__r.Map_Code__c = 'UK_DEMO_ESTATE'
];
if (!demoConnections.isEmpty()) {
  delete demoConnections;
}

List<A360_Map_Area__c> demoAreas = [
  SELECT Id
  FROM A360_Map_Area__c
  WHERE Estate_Map__r.Map_Code__c = 'UK_DEMO_ESTATE'
];
if (!demoAreas.isEmpty()) {
  delete demoAreas;
}

List<A360_Estate_Map__c> demoMaps = [
  SELECT Id
  FROM A360_Estate_Map__c
  WHERE Map_Code__c = 'UK_DEMO_ESTATE'
];
if (!demoMaps.isEmpty()) {
  delete demoMaps;
}

List<Housing_Unit__c> demoHousing = [
  SELECT Id
  FROM Housing_Unit__c
  WHERE Unit_Code__c LIKE 'UK-DEMO-%'
];
if (!demoHousing.isEmpty()) {
  delete demoHousing;
}

Account site = new Account(
  Name = 'Love 4 Animals - UK Demo Estate',
  A360_Partner_Type__c = 'Shelter'
);
insert site;

List<Housing_Unit__c> housingUnits = new List<Housing_Unit__c>{
  new Housing_Unit__c(Name = 'Intake Reception', Unit_Code__c = 'UK-DEMO-INTAKE', Housing_Type__c = 'Other', Capacity__c = 4, Current_Occupancy__c = 1, Is_Active__c = true, Site_Account__c = site.Id),
  new Housing_Unit__c(Name = 'Kennel Row A', Unit_Code__c = 'UK-DEMO-KENNEL-A', Housing_Type__c = 'Kennel', Capacity__c = 6, Current_Occupancy__c = 3, Is_Active__c = true, Site_Account__c = site.Id),
  new Housing_Unit__c(Name = 'Kennel Row B', Unit_Code__c = 'UK-DEMO-KENNEL-B', Housing_Type__c = 'Kennel', Capacity__c = 6, Current_Occupancy__c = 2, Is_Active__c = true, Site_Account__c = site.Id),
  new Housing_Unit__c(Name = 'Cattery Sun Room', Unit_Code__c = 'UK-DEMO-CAT-SUN', Housing_Type__c = 'Cattery', Capacity__c = 5, Current_Occupancy__c = 2, Is_Active__c = true, Site_Account__c = site.Id),
  new Housing_Unit__c(Name = 'Rabbit Barn', Unit_Code__c = 'UK-DEMO-RABBIT-BARN', Housing_Type__c = 'Other', Capacity__c = 8, Current_Occupancy__c = 2, Is_Active__c = true, Site_Account__c = site.Id),
  new Housing_Unit__c(Name = 'Isolation Suite', Unit_Code__c = 'UK-DEMO-ISOLATION', Housing_Type__c = 'Isolation', Capacity__c = 3, Current_Occupancy__c = 1, Is_Active__c = true, Site_Account__c = site.Id),
  new Housing_Unit__c(Name = 'Clinical Ward', Unit_Code__c = 'UK-DEMO-CLINIC', Housing_Type__c = 'Other', Capacity__c = 4, Current_Occupancy__c = 1, Is_Active__c = true, Site_Account__c = site.Id),
  new Housing_Unit__c(Name = 'Exercise Yard', Unit_Code__c = 'UK-DEMO-YARD', Housing_Type__c = 'Pasture', Capacity__c = 10, Current_Occupancy__c = 0, Is_Active__c = true, Site_Account__c = site.Id)
};
insert housingUnits;

Map<String, Housing_Unit__c> housingByCode = new Map<String, Housing_Unit__c>();
for (Housing_Unit__c unit : housingUnits) {
  housingByCode.put(unit.Unit_Code__c, unit);
}

A360_Estate_Map__c estateMap = new A360_Estate_Map__c(
  Name = 'UK Demo Estate Whiteboard',
  Map_Code__c = 'UK_DEMO_ESTATE',
  Status__c = 'Published',
  Is_Default__c = true,
  Canvas_Width__c = 1200,
  Canvas_Height__c = 720,
  Background_Style__c = 'Whiteboard',
  Site_Account__c = site.Id,
  Published_On__c = System.now(),
  Notes__c = 'Demo map for UK-based Love 4 Animals estate operations.'
);
insert estateMap;

List<A360_Map_Area__c> areas = new List<A360_Map_Area__c>{
  new A360_Map_Area__c(Name = 'Intake Reception', Estate_Map__c = estateMap.Id, Area_Code__c = 'INTAKE', Label__c = 'Intake Reception', Zone__c = 'Front of House', Shape__c = 'Rounded Rectangle', X_Pct__c = 5, Y_Pct__c = 12, Width_Pct__c = 18, Height_Pct__c = 18, Fill_Color__c = '#fef7c3', Housing_Unit__c = housingByCode.get('UK-DEMO-INTAKE').Id, Display_Order__c = 10, Is_Active__c = true),
  new A360_Map_Area__c(Name = 'Kennel Row A', Estate_Map__c = estateMap.Id, Area_Code__c = 'KEN-A', Label__c = 'Kennel Row A', Zone__c = 'Dogs', Shape__c = 'Rounded Rectangle', X_Pct__c = 29, Y_Pct__c = 10, Width_Pct__c = 22, Height_Pct__c = 22, Fill_Color__c = '#d8e6fe', Housing_Unit__c = housingByCode.get('UK-DEMO-KENNEL-A').Id, Display_Order__c = 20, Is_Active__c = true),
  new A360_Map_Area__c(Name = 'Kennel Row B', Estate_Map__c = estateMap.Id, Area_Code__c = 'KEN-B', Label__c = 'Kennel Row B', Zone__c = 'Dogs', Shape__c = 'Rounded Rectangle', X_Pct__c = 29, Y_Pct__c = 40, Width_Pct__c = 22, Height_Pct__c = 22, Fill_Color__c = '#d1e9ff', Housing_Unit__c = housingByCode.get('UK-DEMO-KENNEL-B').Id, Display_Order__c = 30, Is_Active__c = true),
  new A360_Map_Area__c(Name = 'Cattery Sun Room', Estate_Map__c = estateMap.Id, Area_Code__c = 'CAT-SUN', Label__c = 'Cattery Sun Room', Zone__c = 'Cats', Shape__c = 'Rounded Rectangle', X_Pct__c = 58, Y_Pct__c = 10, Width_Pct__c = 18, Height_Pct__c = 20, Fill_Color__c = '#fce7f3', Housing_Unit__c = housingByCode.get('UK-DEMO-CAT-SUN').Id, Display_Order__c = 40, Is_Active__c = true),
  new A360_Map_Area__c(Name = 'Rabbit Barn', Estate_Map__c = estateMap.Id, Area_Code__c = 'RABBIT', Label__c = 'Rabbit Barn', Zone__c = 'Small Animals', Shape__c = 'Rounded Rectangle', X_Pct__c = 58, Y_Pct__c = 40, Width_Pct__c = 18, Height_Pct__c = 20, Fill_Color__c = '#dcfae6', Housing_Unit__c = housingByCode.get('UK-DEMO-RABBIT-BARN').Id, Display_Order__c = 50, Is_Active__c = true),
  new A360_Map_Area__c(Name = 'Isolation Suite', Estate_Map__c = estateMap.Id, Area_Code__c = 'ISO', Label__c = 'Isolation Suite', Zone__c = 'Protected Care', Shape__c = 'Rounded Rectangle', X_Pct__c = 81, Y_Pct__c = 12, Width_Pct__c = 14, Height_Pct__c = 18, Fill_Color__c = '#fee4e2', Housing_Unit__c = housingByCode.get('UK-DEMO-ISOLATION').Id, Display_Order__c = 60, Is_Active__c = true),
  new A360_Map_Area__c(Name = 'Clinical Ward', Estate_Map__c = estateMap.Id, Area_Code__c = 'CLINIC', Label__c = 'Clinical Ward', Zone__c = 'Clinical', Shape__c = 'Rounded Rectangle', X_Pct__c = 80, Y_Pct__c = 40, Width_Pct__c = 16, Height_Pct__c = 18, Fill_Color__c = '#e0eaff', Housing_Unit__c = housingByCode.get('UK-DEMO-CLINIC').Id, Display_Order__c = 70, Is_Active__c = true),
  new A360_Map_Area__c(Name = 'Exercise Yard', Estate_Map__c = estateMap.Id, Area_Code__c = 'YARD', Label__c = 'Exercise Yard', Zone__c = 'Outdoor', Shape__c = 'Ellipse', X_Pct__c = 8, Y_Pct__c = 56, Width_Pct__c = 17, Height_Pct__c = 24, Fill_Color__c = '#d1fadf', Housing_Unit__c = housingByCode.get('UK-DEMO-YARD').Id, Display_Order__c = 80, Is_Active__c = true)
};
insert areas;

Map<String, A360_Map_Area__c> areaByCode = new Map<String, A360_Map_Area__c>();
for (A360_Map_Area__c area : areas) {
  areaByCode.put(area.Area_Code__c, area);
}

insert new List<A360_Map_Connection__c>{
  new A360_Map_Connection__c(Name = 'Intake to Kennels', Estate_Map__c = estateMap.Id, From_Area__c = areaByCode.get('INTAKE').Id, To_Area__c = areaByCode.get('KEN-A').Id, Connection_Type__c = 'Corridor', Stroke_Color__c = '#667085', Display_Order__c = 10, Is_Active__c = true),
  new A360_Map_Connection__c(Name = 'Kennel Rows', Estate_Map__c = estateMap.Id, From_Area__c = areaByCode.get('KEN-A').Id, To_Area__c = areaByCode.get('KEN-B').Id, Connection_Type__c = 'Gate', Stroke_Color__c = '#1b5f97', Display_Order__c = 20, Is_Active__c = true),
  new A360_Map_Connection__c(Name = 'Cattery to Isolation', Estate_Map__c = estateMap.Id, From_Area__c = areaByCode.get('CAT-SUN').Id, To_Area__c = areaByCode.get('ISO').Id, Connection_Type__c = 'Path', Stroke_Color__c = '#b42318', Display_Order__c = 30, Is_Active__c = true),
  new A360_Map_Connection__c(Name = 'Clinic to Isolation', Estate_Map__c = estateMap.Id, From_Area__c = areaByCode.get('CLINIC').Id, To_Area__c = areaByCode.get('ISO').Id, Connection_Type__c = 'Corridor', Stroke_Color__c = '#7f56d9', Display_Order__c = 40, Is_Active__c = true),
  new A360_Map_Connection__c(Name = 'Kennels to Yard', Estate_Map__c = estateMap.Id, From_Area__c = areaByCode.get('KEN-B').Id, To_Area__c = areaByCode.get('YARD').Id, Connection_Type__c = 'Gate', Stroke_Color__c = '#067647', Display_Order__c = 50, Is_Active__c = true)
};

List<Animal__c> animals = new List<Animal__c>{
  new Animal__c(Display_Name__c = 'Demo - Biscuit', Species__c = 'Dog', Estimated_Age_Months__c = 36, Current_Welfare_Risk__c = 'Moderate'),
  new Animal__c(Display_Name__c = 'Demo - Maple', Species__c = 'Dog', Estimated_Age_Months__c = 18, Current_Welfare_Risk__c = 'Low'),
  new Animal__c(Display_Name__c = 'Demo - Scout', Species__c = 'Dog', Estimated_Age_Months__c = 50, Current_Welfare_Risk__c = 'High'),
  new Animal__c(Display_Name__c = 'Demo - Miso', Species__c = 'Cat', Estimated_Age_Months__c = 24, Current_Welfare_Risk__c = 'Low'),
  new Animal__c(Display_Name__c = 'Demo - Nala', Species__c = 'Cat', Estimated_Age_Months__c = 72, Current_Welfare_Risk__c = 'Moderate'),
  new Animal__c(Display_Name__c = 'Demo - Clover', Species__c = 'Rabbit', Estimated_Age_Months__c = 14, Current_Welfare_Risk__c = 'Low'),
  new Animal__c(Display_Name__c = 'Demo - Pip', Species__c = 'Rabbit', Estimated_Age_Months__c = 9, Current_Welfare_Risk__c = 'Low'),
  new Animal__c(Display_Name__c = 'Demo - Hazel', Species__c = 'Dog', Estimated_Age_Months__c = 96, Current_Welfare_Risk__c = 'Critical')
};
insert animals;

Map<String, String> unitByAnimal = new Map<String, String>{
  'Demo - Biscuit' => 'UK-DEMO-KENNEL-A',
  'Demo - Maple' => 'UK-DEMO-KENNEL-A',
  'Demo - Scout' => 'UK-DEMO-KENNEL-B',
  'Demo - Miso' => 'UK-DEMO-CAT-SUN',
  'Demo - Nala' => 'UK-DEMO-CAT-SUN',
  'Demo - Clover' => 'UK-DEMO-RABBIT-BARN',
  'Demo - Pip' => 'UK-DEMO-RABBIT-BARN',
  'Demo - Hazel' => 'UK-DEMO-CLINIC'
};

List<Animal_Episode__c> episodes = new List<Animal_Episode__c>();
for (Animal__c animal : animals) {
  episodes.add(new Animal_Episode__c(Animal__c = animal.Id, Episode_Type__c = 'Intake', Episode_Status__c = 'Open', Intake_DateTime__c = System.now().addDays(-7), Is_Current__c = true));
}
insert episodes;

List<Animal_Location_Stay__c> stays = new List<Animal_Location_Stay__c>();
for (Integer index = 0; index < episodes.size(); index++) {
  String unitCode = unitByAnimal.get(animals[index].Display_Name__c);
  stays.add(new Animal_Location_Stay__c(Animal_Episode__c = episodes[index].Id, Housing_Unit__c = housingByCode.get(unitCode).Id, Start_DateTime__c = System.now().addDays(-3), Is_Current__c = true, Move_Reason__c = 'Intake Placement'));
}
insert stays;

A360AnimalRollupService.rollupAnimals(new Map<Id, Animal__c>(animals).keySet());
System.debug('Seeded UK demo estate map ' + estateMap.Id + ' with ' + areas.size() + ' areas and ' + animals.size() + ' animals.');
