public with sharing class A360EstateMapService {
  private static final String MANAGE_MAP_PERMISSION = 'A360_Manage_Estate_Maps';

  @TestVisible
  private static Boolean bypassEditPermission = false;

  public class MapContext {
    @AuraEnabled
    public String mapId;

    @AuraEnabled
    public String mapName;

    @AuraEnabled
    public String mapCode;

    @AuraEnabled
    public String status;

    @AuraEnabled
    public Decimal canvasWidth;

    @AuraEnabled
    public Decimal canvasHeight;

    @AuraEnabled
    public Boolean canEdit;

    @AuraEnabled
    public List<MapAreaDto> areas = new List<MapAreaDto>();

    @AuraEnabled
    public List<MapConnectionDto> connections = new List<MapConnectionDto>();

    @AuraEnabled
    public List<AnimalTokenDto> animals = new List<AnimalTokenDto>();

    @AuraEnabled
    public List<HousingOptionDto> housingOptions = new List<HousingOptionDto>();
  }

  public class MapAreaDto {
    @AuraEnabled
    public String id;

    @AuraEnabled
    public String areaCode;

    @AuraEnabled
    public String label;

    @AuraEnabled
    public String zone;

    @AuraEnabled
    public String shape;

    @AuraEnabled
    public Decimal x;

    @AuraEnabled
    public Decimal y;

    @AuraEnabled
    public Decimal width;

    @AuraEnabled
    public Decimal height;

    @AuraEnabled
    public Decimal rotation;

    @AuraEnabled
    public String fillColor;

    @AuraEnabled
    public String housingUnitId;

    @AuraEnabled
    public String housingUnitName;

    @AuraEnabled
    public String housingType;

    @AuraEnabled
    public Decimal capacity;

    @AuraEnabled
    public Decimal currentOccupancy;

    @AuraEnabled
    public Integer displayOrder;
  }

  public class MapConnectionDto {
    @AuraEnabled
    public String id;

    @AuraEnabled
    public String fromAreaId;

    @AuraEnabled
    public String toAreaId;

    @AuraEnabled
    public String connectionType;

    @AuraEnabled
    public String strokeColor;
  }

  public class AnimalTokenDto {
    @AuraEnabled
    public String animalId;

    @AuraEnabled
    public String animalName;

    @AuraEnabled
    public String species;

    @AuraEnabled
    public String welfareRisk;

    @AuraEnabled
    public String careStatus;

    @AuraEnabled
    public String housingUnitId;

    @AuraEnabled
    public String areaId;

    @AuraEnabled
    public Integer slotIndex;
  }

  public class HousingOptionDto {
    @AuraEnabled
    public String id;

    @AuraEnabled
    public String label;

    @AuraEnabled
    public String housingType;

    @AuraEnabled
    public Decimal capacity;
  }

  public class AreaSaveRequest {
    @AuraEnabled
    public String id;

    @AuraEnabled
    public String areaCode;

    @AuraEnabled
    public String label;

    @AuraEnabled
    public String zone;

    @AuraEnabled
    public String shape;

    @AuraEnabled
    public Decimal x;

    @AuraEnabled
    public Decimal y;

    @AuraEnabled
    public Decimal width;

    @AuraEnabled
    public Decimal height;

    @AuraEnabled
    public Decimal rotation;

    @AuraEnabled
    public String fillColor;

    @AuraEnabled
    public String housingUnitId;

    @AuraEnabled
    public Integer displayOrder;
  }

  @AuraEnabled(cacheable=true)
  public static MapContext getMapContext(String mapId) {
    enforceReadable();

    A360_Estate_Map__c mapRecord = resolveMap(mapId);
    MapContext context = new MapContext();
    context.canEdit = FeatureManagement.checkPermission(MANAGE_MAP_PERMISSION);

    if (mapRecord == null) {
      return context;
    }

    context.mapId = String.valueOf(mapRecord.Id);
    context.mapName = mapRecord.Name;
    context.mapCode = mapRecord.Map_Code__c;
    context.status = mapRecord.Status__c;
    context.canvasWidth = mapRecord.Canvas_Width__c == null
      ? 1200
      : mapRecord.Canvas_Width__c;
    context.canvasHeight = mapRecord.Canvas_Height__c == null
      ? 720
      : mapRecord.Canvas_Height__c;

    Map<Id, String> areaIdByHousingUnitId = new Map<Id, String>();
    for (A360_Map_Area__c areaRecord : [
      SELECT
        Id,
        Area_Code__c,
        Label__c,
        Zone__c,
        Shape__c,
        X_Pct__c,
        Y_Pct__c,
        Width_Pct__c,
        Height_Pct__c,
        Rotation__c,
        Fill_Color__c,
        Housing_Unit__c,
        Housing_Unit__r.Name,
        Housing_Unit__r.Housing_Type__c,
        Housing_Unit__r.Capacity__c,
        Housing_Unit__r.Current_Occupancy__c,
        Display_Order__c
      FROM A360_Map_Area__c
      WHERE Estate_Map__c = :mapRecord.Id AND Is_Active__c = TRUE
      ORDER BY Display_Order__c ASC, Name ASC
      LIMIT 200
    ]) {
      MapAreaDto area = toAreaDto(areaRecord);
      context.areas.add(area);
      if (areaRecord.Housing_Unit__c != null) {
        areaIdByHousingUnitId.put(areaRecord.Housing_Unit__c, area.id);
      }
    }

    for (A360_Map_Connection__c connectionRecord : [
      SELECT Id, From_Area__c, To_Area__c, Connection_Type__c, Stroke_Color__c
      FROM A360_Map_Connection__c
      WHERE Estate_Map__c = :mapRecord.Id AND Is_Active__c = TRUE
      ORDER BY Display_Order__c ASC, Name ASC
      LIMIT 250
    ]) {
      context.connections.add(toConnectionDto(connectionRecord));
    }

    context.housingOptions = getHousingOptions();
    context.animals = getAnimalTokens(areaIdByHousingUnitId);
    return context;
  }

  @AuraEnabled
  public static MapContext saveAreas(
    String mapId,
    List<AreaSaveRequest> areas
  ) {
    enforceEdit();
    if (String.isBlank(mapId)) {
      throw new AuraHandledException('A map is required before saving areas.');
    }

    Id estateMapId = (Id) mapId;
    Map<Id, A360_Map_Area__c> existingAreas = new Map<Id, A360_Map_Area__c>();
    for (A360_Map_Area__c existingArea : [
      SELECT Id, Estate_Map__c
      FROM A360_Map_Area__c
      WHERE Estate_Map__c = :estateMapId
    ]) {
      existingAreas.put(existingArea.Id, existingArea);
    }

    List<A360_Map_Area__c> recordsToSave = new List<A360_Map_Area__c>();
    Integer index = 0;
    for (
      AreaSaveRequest requestItem : areas == null
        ? new List<AreaSaveRequest>()
        : areas
    ) {
      index++;
      validateArea(requestItem);

      A360_Map_Area__c areaRecord = new A360_Map_Area__c(
        Estate_Map__c = estateMapId,
        Area_Code__c = String.isBlank(requestItem.areaCode)
          ? 'AREA-' + index
          : requestItem.areaCode.left(60),
        Label__c = leftOrNull(requestItem.label, 80),
        Zone__c = leftOrNull(requestItem.zone, 80),
        Shape__c = String.isBlank(requestItem.shape)
          ? 'Rounded Rectangle'
          : requestItem.shape,
        X_Pct__c = requestItem.x,
        Y_Pct__c = requestItem.y,
        Width_Pct__c = requestItem.width,
        Height_Pct__c = requestItem.height,
        Rotation__c = requestItem.rotation == null ? 0 : requestItem.rotation,
        Fill_Color__c = normalizeColor(requestItem.fillColor),
        Housing_Unit__c = String.isBlank(requestItem.housingUnitId)
          ? null
          : (Id) requestItem.housingUnitId,
        Display_Order__c = requestItem.displayOrder == null
          ? index * 10
          : requestItem.displayOrder,
        Is_Active__c = true
      );

      if (!String.isBlank(requestItem.id)) {
        Id areaId = (Id) requestItem.id;
        if (!existingAreas.containsKey(areaId)) {
          throw new AuraHandledException(
            'The selected area does not belong to this map.'
          );
        }
        areaRecord.Id = areaId;
      }
      recordsToSave.add(areaRecord);
    }

    if (!recordsToSave.isEmpty()) {
      upsert recordsToSave;
    }

    return getMapContext(mapId);
  }

  @AuraEnabled
  public static MapContext publishMap(String mapId) {
    enforceEdit();
    if (String.isBlank(mapId)) {
      throw new AuraHandledException('A map is required before publishing.');
    }

    Id estateMapId = (Id) mapId;
    List<A360_Estate_Map__c> defaultsToClear = [
      SELECT Id, Is_Default__c
      FROM A360_Estate_Map__c
      WHERE Id != :estateMapId AND Is_Default__c = TRUE
    ];
    for (A360_Estate_Map__c defaultMap : defaultsToClear) {
      defaultMap.Is_Default__c = false;
    }

    A360_Estate_Map__c mapToPublish = new A360_Estate_Map__c(
      Id = estateMapId,
      Status__c = 'Published',
      Is_Default__c = true,
      Published_On__c = System.now()
    );

    if (!defaultsToClear.isEmpty()) {
      update defaultsToClear;
    }
    update mapToPublish;
    return getMapContext(mapId);
  }

  private static A360_Estate_Map__c resolveMap(String mapId) {
    if (!String.isBlank(mapId)) {
      List<A360_Estate_Map__c> requestedMaps = [
        SELECT
          Id,
          Name,
          Map_Code__c,
          Status__c,
          Canvas_Width__c,
          Canvas_Height__c
        FROM A360_Estate_Map__c
        WHERE Id = :((Id) mapId)
        LIMIT 1
      ];
      return requestedMaps.isEmpty() ? null : requestedMaps[0];
    }

    List<A360_Estate_Map__c> defaultMaps = [
      SELECT Id, Name, Map_Code__c, Status__c, Canvas_Width__c, Canvas_Height__c
      FROM A360_Estate_Map__c
      WHERE Status__c = 'Published' AND Is_Default__c = TRUE
      ORDER BY Published_On__c DESC NULLS LAST, LastModifiedDate DESC
      LIMIT 1
    ];
    if (!defaultMaps.isEmpty()) {
      return defaultMaps[0];
    }

    List<A360_Estate_Map__c> fallbackMaps = [
      SELECT Id, Name, Map_Code__c, Status__c, Canvas_Width__c, Canvas_Height__c
      FROM A360_Estate_Map__c
      WHERE Status__c IN ('Published', 'Draft')
      ORDER BY Status__c DESC, LastModifiedDate DESC
      LIMIT 1
    ];
    return fallbackMaps.isEmpty() ? null : fallbackMaps[0];
  }

  private static List<HousingOptionDto> getHousingOptions() {
    List<HousingOptionDto> options = new List<HousingOptionDto>();
    for (Housing_Unit__c housingUnit : [
      SELECT Id, Name, Housing_Type__c, Capacity__c
      FROM Housing_Unit__c
      WHERE Is_Active__c = TRUE
      ORDER BY Name ASC
      LIMIT 500
    ]) {
      HousingOptionDto optionItem = new HousingOptionDto();
      optionItem.id = String.valueOf(housingUnit.Id);
      optionItem.label = housingUnit.Name;
      optionItem.housingType = housingUnit.Housing_Type__c;
      optionItem.capacity = housingUnit.Capacity__c;
      options.add(optionItem);
    }
    return options;
  }

  private static List<AnimalTokenDto> getAnimalTokens(
    Map<Id, String> areaIdByHousingUnitId
  ) {
    List<AnimalTokenDto> tokens = new List<AnimalTokenDto>();
    if (areaIdByHousingUnitId.isEmpty()) {
      return tokens;
    }

    Integer slotIndex = 0;
    for (Animal_Location_Stay__c stayRecord : [
      SELECT
        Housing_Unit__c,
        Animal_Episode__r.Animal__c,
        Animal_Episode__r.Animal__r.Display_Name__c,
        Animal_Episode__r.Animal__r.Species__c,
        Animal_Episode__r.Animal__r.Current_Welfare_Risk__c,
        Animal_Episode__r.Animal__r.Current_Care_Status__c
      FROM Animal_Location_Stay__c
      WHERE
        Is_Current__c = TRUE
        AND Housing_Unit__c IN :areaIdByHousingUnitId.keySet()
        AND Animal_Episode__r.Is_Current__c = TRUE
      ORDER BY Animal_Episode__r.Animal__r.Display_Name__c ASC
      LIMIT 500
    ]) {
      AnimalTokenDto token = new AnimalTokenDto();
      token.animalId = String.valueOf(stayRecord.Animal_Episode__r.Animal__c);
      token.animalName = stayRecord.Animal_Episode__r.Animal__r.Display_Name__c;
      token.species = stayRecord.Animal_Episode__r.Animal__r.Species__c;
      token.welfareRisk = stayRecord.Animal_Episode__r.Animal__r.Current_Welfare_Risk__c;
      token.careStatus = stayRecord.Animal_Episode__r.Animal__r.Current_Care_Status__c;
      token.housingUnitId = String.valueOf(stayRecord.Housing_Unit__c);
      token.areaId = areaIdByHousingUnitId.get(stayRecord.Housing_Unit__c);
      token.slotIndex = slotIndex;
      tokens.add(token);
      slotIndex++;
    }
    return tokens;
  }

  private static MapAreaDto toAreaDto(A360_Map_Area__c areaRecord) {
    MapAreaDto area = new MapAreaDto();
    area.id = String.valueOf(areaRecord.Id);
    area.areaCode = areaRecord.Area_Code__c;
    area.label = String.isBlank(areaRecord.Label__c)
      ? areaRecord.Name
      : areaRecord.Label__c;
    area.zone = areaRecord.Zone__c;
    area.shape = areaRecord.Shape__c;
    area.x = areaRecord.X_Pct__c == null ? 0 : areaRecord.X_Pct__c;
    area.y = areaRecord.Y_Pct__c == null ? 0 : areaRecord.Y_Pct__c;
    area.width = areaRecord.Width_Pct__c == null ? 10 : areaRecord.Width_Pct__c;
    area.height = areaRecord.Height_Pct__c == null
      ? 10
      : areaRecord.Height_Pct__c;
    area.rotation = areaRecord.Rotation__c == null ? 0 : areaRecord.Rotation__c;
    area.fillColor = String.isBlank(areaRecord.Fill_Color__c)
      ? '#d8e6fe'
      : areaRecord.Fill_Color__c;
    area.housingUnitId = String.valueOf(areaRecord.Housing_Unit__c);
    area.housingUnitName = areaRecord.Housing_Unit__r?.Name;
    area.housingType = areaRecord.Housing_Unit__r?.Housing_Type__c;
    area.capacity = areaRecord.Housing_Unit__r?.Capacity__c;
    area.currentOccupancy = areaRecord.Housing_Unit__r?.Current_Occupancy__c;
    area.displayOrder = areaRecord.Display_Order__c == null
      ? 10
      : Integer.valueOf(areaRecord.Display_Order__c);
    return area;
  }

  private static MapConnectionDto toConnectionDto(
    A360_Map_Connection__c connectionRecord
  ) {
    MapConnectionDto connection = new MapConnectionDto();
    connection.id = String.valueOf(connectionRecord.Id);
    connection.fromAreaId = String.valueOf(connectionRecord.From_Area__c);
    connection.toAreaId = String.valueOf(connectionRecord.To_Area__c);
    connection.connectionType = connectionRecord.Connection_Type__c;
    connection.strokeColor = String.isBlank(connectionRecord.Stroke_Color__c)
      ? '#667085'
      : connectionRecord.Stroke_Color__c;
    return connection;
  }

  private static void enforceReadable() {
    if (
      !Schema.sObjectType.A360_Estate_Map__c.isAccessible() ||
      !Schema.sObjectType.A360_Map_Area__c.isAccessible() ||
      !Schema.sObjectType.A360_Map_Connection__c.isAccessible()
    ) {
      throw new AuraHandledException('You do not have access to estate maps.');
    }
  }

  private static void enforceEdit() {
    if (
      !bypassEditPermission &&
      !FeatureManagement.checkPermission(MANAGE_MAP_PERMISSION)
    ) {
      throw new AuraHandledException(
        'You do not have permission to edit estate maps.'
      );
    }
    if (
      !Schema.sObjectType.A360_Map_Area__c.isCreateable() ||
      !Schema.sObjectType.A360_Map_Area__c.isUpdateable()
    ) {
      throw new AuraHandledException('Your profile cannot save map areas.');
    }
  }

  private static void validateArea(AreaSaveRequest requestItem) {
    if (requestItem == null) {
      throw new AuraHandledException('Map area details are required.');
    }
    if (!isPercent(requestItem.x) || !isPercent(requestItem.y)) {
      throw new AuraHandledException(
        'Map area positions must be between 0 and 100.'
      );
    }
    if (
      requestItem.width == null ||
      requestItem.height == null ||
      requestItem.width <= 0 ||
      requestItem.height <= 0 ||
      requestItem.width > 100 ||
      requestItem.height > 100
    ) {
      throw new AuraHandledException(
        'Map area size must be greater than 0 and no more than 100.'
      );
    }
  }

  private static Boolean isPercent(Decimal value) {
    return value != null && value >= 0 && value <= 100;
  }

  private static String normalizeColor(String value) {
    if (String.isBlank(value)) {
      return '#d8e6fe';
    }
    String candidate = value.trim();
    return candidate.startsWith('#')
      ? candidate.left(7)
      : '#' + candidate.left(6);
  }

  private static String leftOrNull(String value, Integer maxLength) {
    return String.isBlank(value) ? null : value.left(maxLength);
  }
}
