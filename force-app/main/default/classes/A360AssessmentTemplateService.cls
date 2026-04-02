public with sharing class A360AssessmentTemplateService {
  public class SeedRequest {
    @InvocableVariable
    public Boolean forceResync;
  }

  public class SeedResult {
    @InvocableVariable
    public Integer templateCount;

    @InvocableVariable
    public Integer domainCount;

    @InvocableVariable
    public Integer indicatorCount;
  }

  public class EntryOption {
    @AuraEnabled
    public String label;

    @AuraEnabled
    public String value;
  }

  public class TemplateIndicatorDefinition {
    @AuraEnabled
    public String indicatorKey;

    @AuraEnabled
    public String indicatorLabel;

    @AuraEnabled
    public String domainCode;

    @AuraEnabled
    public String valueType;

    @AuraEnabled
    public Boolean isRequired;

    @AuraEnabled
    public String defaultSeverityScale;

    @AuraEnabled
    public String helpText;

    @AuraEnabled
    public String visibleWhenRule;

    @AuraEnabled
    public List<EntryOption> options = new List<EntryOption>();
  }

  public class TemplateDomainDefinition {
    @AuraEnabled
    public String domainCode;

    @AuraEnabled
    public String domainLabel;

    @AuraEnabled
    public String guidanceText;

    @AuraEnabled
    public String defaultConfidence;

    @AuraEnabled
    public Boolean isRequired;

    @AuraEnabled
    public Integer displayOrder;

    @AuraEnabled
    public List<TemplateIndicatorDefinition> indicators = new List<TemplateIndicatorDefinition>();
  }

  public class TemplateDefinition {
    @AuraEnabled
    public String templateId;

    @AuraEnabled
    public String templateName;

    @AuraEnabled
    public String templateCode;

    @AuraEnabled
    public String metadataTemplateKey;

    @AuraEnabled
    public String version;

    @AuraEnabled
    public String species;

    @AuraEnabled
    public String context;

    @AuraEnabled
    public List<TemplateDomainDefinition> domains = new List<TemplateDomainDefinition>();
  }

  public class EntryContext {
    @AuraEnabled
    public String selectedEpisodeId;

    @AuraEnabled
    public String selectedTemplateId;

    @AuraEnabled
    public String selectedSpecies;

    @AuraEnabled
    public String assessmentContext;

    @AuraEnabled
    public List<EntryOption> episodeOptions = new List<EntryOption>();

    @AuraEnabled
    public List<EntryOption> templateOptions = new List<EntryOption>();

    @AuraEnabled
    public TemplateDefinition template;
  }

  @InvocableMethod(label='Seed Assessment Templates')
  public static List<SeedResult> seedAssessmentTemplates(
    List<SeedRequest> requests
  ) {
    Boolean forceResync =
      requests != null &&
      !requests.isEmpty() &&
      requests[0] != null &&
      requests[0].forceResync == true;

    return new List<SeedResult>{ seedTemplates(forceResync) };
  }

  public static SeedResult seedTemplates(Boolean forceResync) {
    List<Animal360_Assessment_Template_Default__mdt> templateDefaults = [
      SELECT
        Template_Key__c,
        Template_Code__c,
        Template_Label__c,
        Species__c,
        Assessment_Context__c,
        Version__c,
        Status__c,
        Default_For_Species__c,
        Description_Text__c
      FROM Animal360_Assessment_Template_Default__mdt
    ];

    SeedResult result = new SeedResult();
    if (templateDefaults.isEmpty()) {
      result.templateCount = 0;
      result.domainCount = 0;
      result.indicatorCount = 0;
      return result;
    }

    Set<String> templateKeys = new Set<String>();
    for (
      Animal360_Assessment_Template_Default__mdt templateDefault : templateDefaults
    ) {
      templateKeys.add(templateDefault.Template_Key__c);
    }

    List<Animal360_Domain_Definition__mdt> domainDefinitions = [
      SELECT
        Domain_Code__c,
        Domain_Label__c,
        Display_Order__c,
        Guidance_Text__c,
        Is_Active__c
      FROM Animal360_Domain_Definition__mdt
      WHERE Is_Active__c = TRUE
      ORDER BY Display_Order__c ASC
    ];

    Map<String, List<Animal360_Template_Indicator_Default__mdt>> indicatorDefaultsByTemplateKey = new Map<String, List<Animal360_Template_Indicator_Default__mdt>>();
    for (Animal360_Template_Indicator_Default__mdt indicatorDefault : [
      SELECT
        Template_Key__c,
        Indicator_Key__c,
        Domain_Code__c,
        Display_Order__c,
        Is_Required__c,
        Default_Severity_Scale__c,
        Help_Text__c,
        Visible_When_Rule__c
      FROM Animal360_Template_Indicator_Default__mdt
      WHERE Template_Key__c IN :templateKeys
      ORDER BY Display_Order__c ASC
    ]) {
      if (
        !indicatorDefaultsByTemplateKey.containsKey(
          indicatorDefault.Template_Key__c
        )
      ) {
        indicatorDefaultsByTemplateKey.put(
          indicatorDefault.Template_Key__c,
          new List<Animal360_Template_Indicator_Default__mdt>()
        );
      }
      indicatorDefaultsByTemplateKey.get(indicatorDefault.Template_Key__c)
        .add(indicatorDefault);
    }

    List<Assessment_Template__c> templatesToUpsert = new List<Assessment_Template__c>();
    for (
      Animal360_Assessment_Template_Default__mdt templateDefault : templateDefaults
    ) {
      templatesToUpsert.add(
        new Assessment_Template__c(
          Name = templateDefault.Template_Label__c,
          Template_Code__c = templateDefault.Template_Code__c,
          Species__c = templateDefault.Species__c,
          Context__c = templateDefault.Assessment_Context__c,
          Version__c = templateDefault.Version__c,
          Status__c = templateDefault.Status__c,
          Default_For_Species__c = templateDefault.Default_For_Species__c,
          Description__c = templateDefault.Description_Text__c,
          Metadata_Template_Key__c = templateDefault.Template_Key__c,
          Is_Managed_Seed__c = true,
          Seed_Last_Synced_On__c = System.now()
        )
      );
    }

    if (!templatesToUpsert.isEmpty()) {
      upsert templatesToUpsert Assessment_Template__c.Metadata_Template_Key__c;
    }

    Map<String, Assessment_Template__c> templatesByKey = new Map<String, Assessment_Template__c>();
    for (Assessment_Template__c templateRecord : [
      SELECT Id, Metadata_Template_Key__c
      FROM Assessment_Template__c
      WHERE Metadata_Template_Key__c IN :templateKeys
    ]) {
      templatesByKey.put(
        templateRecord.Metadata_Template_Key__c,
        templateRecord
      );
    }

    List<Template_Domain_Definition__c> templateDomainsToUpsert = new List<Template_Domain_Definition__c>();
    List<Template_Indicator_Assignment__c> templateIndicatorsToUpsert = new List<Template_Indicator_Assignment__c>();

    for (
      Animal360_Assessment_Template_Default__mdt templateDefault : templateDefaults
    ) {
      Assessment_Template__c templateRecord = templatesByKey.get(
        templateDefault.Template_Key__c
      );
      if (templateRecord == null) {
        continue;
      }

      for (
        Animal360_Domain_Definition__mdt domainDefinition : domainDefinitions
      ) {
        String rowKey =
          templateDefault.Template_Key__c +
          '::' +
          domainDefinition.Domain_Code__c;
        templateDomainsToUpsert.add(
          new Template_Domain_Definition__c(
            Assessment_Template__c = templateRecord.Id,
            Domain_Code__c = domainDefinition.Domain_Code__c,
            Display_Order__c = domainDefinition.Display_Order__c,
            Is_Required__c = true,
            Guidance_Text__c = domainDefinition.Guidance_Text__c,
            Metadata_Row_Key__c = rowKey
          )
        );
      }

      List<Animal360_Template_Indicator_Default__mdt> indicatorDefaults = indicatorDefaultsByTemplateKey.containsKey(
          templateDefault.Template_Key__c
        )
        ? indicatorDefaultsByTemplateKey.get(templateDefault.Template_Key__c)
        : new List<Animal360_Template_Indicator_Default__mdt>();
      for (
        Animal360_Template_Indicator_Default__mdt indicatorDefault : indicatorDefaults
      ) {
        String rowKey =
          templateDefault.Template_Key__c +
          '::' +
          indicatorDefault.Indicator_Key__c;
        templateIndicatorsToUpsert.add(
          new Template_Indicator_Assignment__c(
            Assessment_Template__c = templateRecord.Id,
            Indicator_Key__c = indicatorDefault.Indicator_Key__c,
            Domain_Code__c = indicatorDefault.Domain_Code__c,
            Display_Order__c = indicatorDefault.Display_Order__c,
            Is_Required__c = indicatorDefault.Is_Required__c,
            Default_Severity_Scale__c = indicatorDefault.Default_Severity_Scale__c,
            Help_Text__c = indicatorDefault.Help_Text__c,
            Visible_When_Rule__c = indicatorDefault.Visible_When_Rule__c,
            Metadata_Row_Key__c = rowKey
          )
        );
      }
    }

    if (!templateDomainsToUpsert.isEmpty()) {
      upsert templateDomainsToUpsert
        Template_Domain_Definition__c.Metadata_Row_Key__c;
    }
    if (!templateIndicatorsToUpsert.isEmpty()) {
      upsert templateIndicatorsToUpsert
        Template_Indicator_Assignment__c.Metadata_Row_Key__c;
    }

    result.templateCount = templatesToUpsert.size();
    result.domainCount = templateDomainsToUpsert.size();
    result.indicatorCount = templateIndicatorsToUpsert.size();
    return result;
  }

  @AuraEnabled(cacheable=true)
  public static EntryContext getAssessmentEntryContext(
    Id episodeId,
    Id templateId,
    String assessmentContext
  ) {
    EntryContext context = new EntryContext();
    context.assessmentContext = String.isBlank(assessmentContext)
      ? 'Routine'
      : assessmentContext;

    List<Animal_Episode__c> episodeRecords;
    if (episodeId != null) {
      episodeRecords = [
        SELECT
          Id,
          Name,
          Animal__c,
          Animal__r.Name,
          Animal__r.Display_Name__c,
          Animal__r.Species__c,
          Episode_Status__c
        FROM Animal_Episode__c
        WHERE Id = :episodeId
        LIMIT 1
      ];
    } else {
      episodeRecords = [
        SELECT
          Id,
          Name,
          Animal__c,
          Animal__r.Name,
          Animal__r.Display_Name__c,
          Animal__r.Species__c,
          Episode_Status__c
        FROM Animal_Episode__c
        WHERE Episode_Status__c = 'Open'
        ORDER BY Intake_DateTime__c DESC
        LIMIT 50
      ];
    }

    Animal_Episode__c selectedEpisode = null;
    for (Animal_Episode__c episodeRecord : episodeRecords) {
      context.episodeOptions.add(
        optionFor(episodeLabel(episodeRecord), String.valueOf(episodeRecord.Id))
      );
      if (
        selectedEpisode == null ||
        (episodeId != null &&
        episodeRecord.Id == episodeId)
      ) {
        selectedEpisode = episodeRecord;
      }
    }

    if (selectedEpisode != null) {
      context.selectedEpisodeId = String.valueOf(selectedEpisode.Id);
      context.selectedSpecies = selectedEpisode.Animal__r == null
        ? null
        : selectedEpisode.Animal__r.Species__c;
    }

    Id resolvedTemplateId = templateId;
    if (resolvedTemplateId == null && selectedEpisode != null) {
      resolvedTemplateId = resolveDefaultTemplateId(
        selectedEpisode.Id,
        context.assessmentContext
      );
    }

    List<Assessment_Template__c> activeTemplates = [
      SELECT Id, Name, Template_Code__c, Version__c, Species__c, Context__c
      FROM Assessment_Template__c
      WHERE Status__c = 'Active'
      ORDER BY
        Default_For_Species__c DESC,
        Species__c ASC,
        Context__c ASC,
        Version__c DESC
    ];

    for (Assessment_Template__c templateRecord : activeTemplates) {
      context.templateOptions.add(
        optionFor(
          templateOptionLabel(templateRecord),
          String.valueOf(templateRecord.Id)
        )
      );
      if (
        context.selectedTemplateId == null &&
        resolvedTemplateId != null &&
        templateRecord.Id == resolvedTemplateId
      ) {
        context.selectedTemplateId = String.valueOf(templateRecord.Id);
      }
    }

    if (context.selectedTemplateId == null && !activeTemplates.isEmpty()) {
      context.selectedTemplateId = String.valueOf(activeTemplates[0].Id);
    }

    if (!String.isBlank(context.selectedTemplateId)) {
      context.template = buildTemplateDefinition(
        Id.valueOf(context.selectedTemplateId)
      );
    }

    return context;
  }

  public static Id resolveDefaultTemplateId(
    Id episodeId,
    String assessmentContext
  ) {
    if (episodeId == null) {
      return null;
    }

    Animal_Episode__c episodeRecord = [
      SELECT Id, Animal__r.Species__c
      FROM Animal_Episode__c
      WHERE Id = :episodeId
      LIMIT 1
    ];
    String resolvedContext = String.isBlank(assessmentContext)
      ? 'Routine'
      : assessmentContext;
    String species = episodeRecord.Animal__r == null
      ? null
      : episodeRecord.Animal__r.Species__c;

    if (!String.isBlank(species)) {
      List<Animal360_Species_Template__mdt> mappings = [
        SELECT Template_Key__c
        FROM Animal360_Species_Template__mdt
        WHERE
          Species__c = :species
          AND Assessment_Context__c = :resolvedContext
          AND Is_Active__c = TRUE
        ORDER BY Priority__c ASC
      ];
      if (!mappings.isEmpty()) {
        List<Assessment_Template__c> mappedTemplates = [
          SELECT Id
          FROM Assessment_Template__c
          WHERE
            Metadata_Template_Key__c = :mappings[0].Template_Key__c
            AND Status__c = 'Active'
          LIMIT 1
        ];
        if (!mappedTemplates.isEmpty()) {
          return mappedTemplates[0].Id;
        }
      }
    }

    List<Assessment_Template__c> directTemplates = [
      SELECT Id
      FROM Assessment_Template__c
      WHERE
        Status__c = 'Active'
        AND Default_For_Species__c = TRUE
        AND Context__c = :resolvedContext
        AND Species__c = :species
      ORDER BY Version__c DESC
      LIMIT 1
    ];
    return directTemplates.isEmpty() ? null : directTemplates[0].Id;
  }

  public static TemplateDefinition buildTemplateDefinition(Id templateId) {
    if (templateId == null) {
      return null;
    }

    Assessment_Template__c templateRecord = [
      SELECT
        Id,
        Name,
        Template_Code__c,
        Metadata_Template_Key__c,
        Version__c,
        Species__c,
        Context__c
      FROM Assessment_Template__c
      WHERE Id = :templateId
      LIMIT 1
    ];

    Map<String, Animal360_Domain_Definition__mdt> domainCatalogByCode = new Map<String, Animal360_Domain_Definition__mdt>();
    for (Animal360_Domain_Definition__mdt domainDefinition : [
      SELECT Domain_Code__c, Domain_Label__c, Guidance_Text__c
      FROM Animal360_Domain_Definition__mdt
      WHERE Is_Active__c = TRUE
    ]) {
      domainCatalogByCode.put(
        domainDefinition.Domain_Code__c,
        domainDefinition
      );
    }

    TemplateDefinition definition = new TemplateDefinition();
    definition.templateId = String.valueOf(templateRecord.Id);
    definition.templateName = templateRecord.Name;
    definition.templateCode = templateRecord.Template_Code__c;
    definition.metadataTemplateKey = templateRecord.Metadata_Template_Key__c;
    definition.version = templateRecord.Version__c;
    definition.species = templateRecord.Species__c;
    definition.context = templateRecord.Context__c;

    Map<String, TemplateDomainDefinition> domainsByCode = new Map<String, TemplateDomainDefinition>();
    for (Template_Domain_Definition__c templateDomain : [
      SELECT
        Domain_Code__c,
        Display_Order__c,
        Is_Required__c,
        Guidance_Text__c,
        Default_Confidence__c
      FROM Template_Domain_Definition__c
      WHERE Assessment_Template__c = :templateId
      ORDER BY Display_Order__c ASC
    ]) {
      TemplateDomainDefinition domainDefinition = new TemplateDomainDefinition();
      domainDefinition.domainCode = templateDomain.Domain_Code__c;
      domainDefinition.displayOrder = templateDomain.Display_Order__c == null
        ? null
        : Integer.valueOf(templateDomain.Display_Order__c);
      domainDefinition.isRequired = templateDomain.Is_Required__c;
      domainDefinition.defaultConfidence = templateDomain.Default_Confidence__c;

      Animal360_Domain_Definition__mdt domainCatalog = domainCatalogByCode.get(
        templateDomain.Domain_Code__c
      );
      domainDefinition.domainLabel = domainCatalog == null
        ? templateDomain.Domain_Code__c
        : domainCatalog.Domain_Label__c;
      domainDefinition.guidanceText = String.isBlank(
          templateDomain.Guidance_Text__c
        )
        ? (domainCatalog == null ? null : domainCatalog.Guidance_Text__c)
        : templateDomain.Guidance_Text__c;

      definition.domains.add(domainDefinition);
      domainsByCode.put(domainDefinition.domainCode, domainDefinition);
    }

    Map<String, Animal360_Indicator_Definition__mdt> indicatorCatalogByKey = new Map<String, Animal360_Indicator_Definition__mdt>();
    Set<String> indicatorKeys = new Set<String>();
    List<Template_Indicator_Assignment__c> indicatorAssignments = [
      SELECT
        Indicator_Key__c,
        Domain_Code__c,
        Display_Order__c,
        Is_Required__c,
        Default_Severity_Scale__c,
        Help_Text__c,
        Visible_When_Rule__c
      FROM Template_Indicator_Assignment__c
      WHERE Assessment_Template__c = :templateId
      ORDER BY Display_Order__c ASC
    ];
    for (
      Template_Indicator_Assignment__c indicatorAssignment : indicatorAssignments
    ) {
      indicatorKeys.add(indicatorAssignment.Indicator_Key__c);
    }

    if (!indicatorKeys.isEmpty()) {
      for (Animal360_Indicator_Definition__mdt indicatorDefinition : [
        SELECT
          Indicator_Key__c,
          Indicator_Label__c,
          Domain_Code__c,
          Value_Type__c,
          Help_Text__c
        FROM Animal360_Indicator_Definition__mdt
        WHERE Indicator_Key__c IN :indicatorKeys
      ]) {
        indicatorCatalogByKey.put(
          indicatorDefinition.Indicator_Key__c,
          indicatorDefinition
        );
      }
    }

    Map<String, List<EntryOption>> optionsByIndicatorKey = new Map<String, List<EntryOption>>();
    if (!indicatorKeys.isEmpty()) {
      for (Animal360_Indicator_Value_Option__mdt optionRecord : [
        SELECT Indicator_Key__c, Option_Value__c, Option_Label__c
        FROM Animal360_Indicator_Value_Option__mdt
        WHERE Indicator_Key__c IN :indicatorKeys
        ORDER BY Display_Order__c ASC
      ]) {
        if (!optionsByIndicatorKey.containsKey(optionRecord.Indicator_Key__c)) {
          optionsByIndicatorKey.put(
            optionRecord.Indicator_Key__c,
            new List<EntryOption>()
          );
        }
        optionsByIndicatorKey.get(optionRecord.Indicator_Key__c)
          .add(
            optionFor(
              optionRecord.Option_Label__c,
              optionRecord.Option_Value__c
            )
          );
      }
    }

    for (
      Template_Indicator_Assignment__c indicatorAssignment : indicatorAssignments
    ) {
      Animal360_Indicator_Definition__mdt indicatorCatalog = indicatorCatalogByKey.get(
        indicatorAssignment.Indicator_Key__c
      );
      TemplateIndicatorDefinition indicatorDefinition = new TemplateIndicatorDefinition();
      indicatorDefinition.indicatorKey = indicatorAssignment.Indicator_Key__c;
      indicatorDefinition.domainCode = indicatorAssignment.Domain_Code__c;
      indicatorDefinition.isRequired = indicatorAssignment.Is_Required__c;
      indicatorDefinition.defaultSeverityScale = indicatorAssignment.Default_Severity_Scale__c;
      indicatorDefinition.helpText = String.isBlank(
          indicatorAssignment.Help_Text__c
        )
        ? (indicatorCatalog == null ? null : indicatorCatalog.Help_Text__c)
        : indicatorAssignment.Help_Text__c;
      indicatorDefinition.visibleWhenRule = indicatorAssignment.Visible_When_Rule__c;
      indicatorDefinition.indicatorLabel = indicatorCatalog == null
        ? indicatorAssignment.Indicator_Key__c
        : indicatorCatalog.Indicator_Label__c;
      indicatorDefinition.valueType = indicatorCatalog == null
        ? 'Text'
        : indicatorCatalog.Value_Type__c;
      indicatorDefinition.options = optionsByIndicatorKey.containsKey(
          indicatorAssignment.Indicator_Key__c
        )
        ? optionsByIndicatorKey.get(indicatorAssignment.Indicator_Key__c)
        : new List<EntryOption>();

      if (domainsByCode.containsKey(indicatorAssignment.Domain_Code__c)) {
        domainsByCode.get(indicatorAssignment.Domain_Code__c)
          .indicators.add(indicatorDefinition);
      }
    }

    return definition;
  }

  private static EntryOption optionFor(String label, String value) {
    EntryOption option = new EntryOption();
    option.label = label;
    option.value = value;
    return option;
  }

  private static String episodeLabel(Animal_Episode__c episodeRecord) {
    String animalName = episodeRecord.Animal__r == null
      ? 'Animal'
      : String.isBlank(episodeRecord.Animal__r.Display_Name__c)
          ? episodeRecord.Animal__r.Name
          : episodeRecord.Animal__r.Display_Name__c;
    return episodeRecord.Name + ' - ' + animalName;
  }

  private static String templateOptionLabel(
    Assessment_Template__c templateRecord
  ) {
    List<String> parts = new List<String>{ templateRecord.Name };
    if (!String.isBlank(templateRecord.Species__c)) {
      parts.add(templateRecord.Species__c);
    }
    if (!String.isBlank(templateRecord.Context__c)) {
      parts.add(templateRecord.Context__c);
    }
    if (!String.isBlank(templateRecord.Version__c)) {
      parts.add('v' + templateRecord.Version__c);
    }
    return String.join(parts, ' | ');
  }
}
