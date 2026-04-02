import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_VERSION = '66.0';
const XMLNS = 'http://soap.sforce.com/2006/04/metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function bool(value) {
  return value ? 'true' : 'false';
}

function xml(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body.trim()}\n`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeText(relativePath, contents) {
  const fullPath = path.join(rootDir, relativePath);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, contents, 'utf8');
}

async function writeXml(relativePath, body) {
  await writeText(relativePath, xml(body));
}

function picklistValue(fullName, label = fullName, isDefault = false) {
  return { fullName, label, default: isDefault };
}

function textField(apiName, label, length, options = {}) {
  return { kind: 'Text', apiName, label, length, ...options };
}

function longTextField(apiName, label, length, visibleLines, options = {}) {
  return { kind: 'LongTextArea', apiName, label, length, visibleLines, ...options };
}

function numberField(apiName, label, precision, scale, options = {}) {
  return { kind: 'Number', apiName, label, precision, scale, ...options };
}

function percentField(apiName, label, precision, scale, options = {}) {
  return { kind: 'Percent', apiName, label, precision, scale, ...options };
}

function dateField(apiName, label, options = {}) {
  return { kind: 'Date', apiName, label, ...options };
}

function dateTimeField(apiName, label, options = {}) {
  return { kind: 'DateTime', apiName, label, ...options };
}

function checkboxField(apiName, label, defaultValue = false, options = {}) {
  return { kind: 'Checkbox', apiName, label, defaultValue, ...options };
}

function picklistGlobalField(apiName, label, valueSetName, options = {}) {
  return { kind: 'PicklistGlobal', apiName, label, valueSetName, ...options };
}

function picklistLocalField(apiName, label, values, options = {}) {
  return { kind: 'PicklistLocal', apiName, label, values, ...options };
}

function lookupField(apiName, label, referenceTo, relationshipLabel, relationshipName, options = {}) {
  return {
    kind: 'Lookup',
    apiName,
    label,
    referenceTo,
    relationshipLabel,
    relationshipName,
    ...options,
  };
}

function masterDetailField(apiName, label, referenceTo, relationshipLabel, relationshipName, options = {}) {
  return {
    kind: 'MasterDetail',
    apiName,
    label,
    referenceTo,
    relationshipLabel,
    relationshipName,
    ...options,
  };
}

function cmdtField(baseField) {
  return {
    fieldManageability: 'DeveloperControlled',
    ...baseField,
  };
}

function buildValueSetDefinition(values) {
  const valuesXml = values
    .map(
      (item) => `            <value>
                <fullName>${escapeXml(item.fullName)}</fullName>
                <default>${bool(item.default)}</default>
                <label>${escapeXml(item.label)}</label>
            </value>`,
    )
    .join('\n');

  return `        <valueSet>
            <restricted>true</restricted>
            <valueSetDefinition>
                <sorted>false</sorted>
${valuesXml}
            </valueSetDefinition>
        </valueSet>`;
}

function buildGlobalValueSetXml(valueSet) {
  const valuesXml = valueSet.values
    .map(
      (item) => `    <customValue>
        <fullName>${escapeXml(item.fullName)}</fullName>
        <default>${bool(item.default)}</default>
        <label>${escapeXml(item.label)}</label>
    </customValue>`,
    )
    .join('\n');

  return `<GlobalValueSet xmlns="${XMLNS}">
${valuesXml}
    <masterLabel>${escapeXml(valueSet.label)}</masterLabel>
    <sorted>false</sorted>
</GlobalValueSet>`;
}

function buildFieldXml(field) {
  const lines = [`<CustomField xmlns="${XMLNS}">`, `    <fullName>${escapeXml(field.apiName)}</fullName>`];

  if (field.description) {
    lines.push(`    <description>${escapeXml(field.description)}</description>`);
  }
  if (field.helpText) {
    lines.push(`    <inlineHelpText>${escapeXml(field.helpText)}</inlineHelpText>`);
  }
  if (field.fieldManageability) {
    lines.push(`    <fieldManageability>${escapeXml(field.fieldManageability)}</fieldManageability>`);
  }
  if (field.externalId !== undefined) {
    lines.push(`    <externalId>${bool(field.externalId)}</externalId>`);
  }
  lines.push(`    <label>${escapeXml(field.label)}</label>`);

  switch (field.kind) {
    case 'Text':
      lines.push(`    <length>${field.length}</length>`);
      break;
    case 'LongTextArea':
      lines.push(`    <length>${field.length}</length>`);
      lines.push(`    <visibleLines>${field.visibleLines}</visibleLines>`);
      break;
    case 'Number':
    case 'Percent':
      lines.push(`    <precision>${field.precision}</precision>`);
      lines.push(`    <scale>${field.scale}</scale>`);
      break;
    case 'Checkbox':
      lines.push(`    <defaultValue>${bool(field.defaultValue)}</defaultValue>`);
      break;
    case 'Lookup':
      lines.push(`    <referenceTo>${field.referenceTo}</referenceTo>`);
      lines.push(`    <relationshipLabel>${escapeXml(field.relationshipLabel)}</relationshipLabel>`);
      lines.push(`    <relationshipName>${escapeXml(field.relationshipName)}</relationshipName>`);
      break;
    case 'MasterDetail':
      lines.push(`    <referenceTo>${field.referenceTo}</referenceTo>`);
      lines.push(`    <relationshipLabel>${escapeXml(field.relationshipLabel)}</relationshipLabel>`);
      lines.push(`    <relationshipName>${escapeXml(field.relationshipName)}</relationshipName>`);
      lines.push(
        `    <writeRequiresMasterRead>${bool(field.writeRequiresMasterRead ?? false)}</writeRequiresMasterRead>`,
      );
      break;
    default:
      break;
  }

  if (field.required !== undefined) {
    lines.push(`    <required>${bool(field.required)}</required>`);
  }
  if (field.unique !== undefined) {
    lines.push(`    <unique>${bool(field.unique)}</unique>`);
  }
  if (field.caseSensitive !== undefined) {
    lines.push(`    <caseSensitive>${bool(field.caseSensitive)}</caseSensitive>`);
  }

  if (field.kind === 'PicklistGlobal') {
    lines.push('    <type>Picklist</type>');
    lines.push('    <valueSet>');
    lines.push('        <restricted>true</restricted>');
    lines.push(`        <valueSetName>${escapeXml(field.valueSetName)}</valueSetName>`);
    lines.push('    </valueSet>');
  } else if (field.kind === 'PicklistLocal') {
    lines.push('    <type>Picklist</type>');
    lines.push(buildValueSetDefinition(field.values));
  } else {
    lines.push(`    <type>${field.kind}</type>`);
  }

  lines.push('</CustomField>');
  return lines.join('\n');
}

function buildValidationRuleXml(rule) {
  return `<ValidationRule xmlns="${XMLNS}">
    <active>true</active>
    <description>${escapeXml(rule.description)}</description>
    <errorConditionFormula>${escapeXml(rule.errorConditionFormula)}</errorConditionFormula>
    <errorMessage>${escapeXml(rule.errorMessage)}</errorMessage>
    <fullName>${escapeXml(rule.apiName)}</fullName>
</ValidationRule>`;
}

function buildObjectXml(objectDef) {
  const nameFieldLines = [
    '    <nameField>',
    `        <label>${escapeXml(objectDef.nameField.label)}</label>`,
  ];

  if (objectDef.nameField.type === 'AutoNumber') {
    nameFieldLines.push(`        <displayFormat>${escapeXml(objectDef.nameField.displayFormat)}</displayFormat>`);
  }

  nameFieldLines.push(`        <type>${objectDef.nameField.type}</type>`);
  nameFieldLines.push('    </nameField>');

  return `<CustomObject xmlns="${XMLNS}">
    <deploymentStatus>Deployed</deploymentStatus>
    <description>${escapeXml(objectDef.description)}</description>
    <enableActivities>${bool(objectDef.enableActivities)}</enableActivities>
    <enableReports>${bool(objectDef.enableReports)}</enableReports>
    <label>${escapeXml(objectDef.label)}</label>
${nameFieldLines.join('\n')}
    <pluralLabel>${escapeXml(objectDef.pluralLabel)}</pluralLabel>
    <sharingModel>${escapeXml(objectDef.sharingModel)}</sharingModel>
    <visibility>${escapeXml(objectDef.visibility)}</visibility>
</CustomObject>`;
}

function buildCmdtObjectXml(typeDef) {
  const descriptionXml = typeDef.description
    ? `    <description>${escapeXml(typeDef.description)}</description>\n`
    : '';

  return `<CustomObject xmlns="${XMLNS}">
${descriptionXml}    <label>${escapeXml(typeDef.label)}</label>
    <pluralLabel>${escapeXml(typeDef.pluralLabel)}</pluralLabel>
    <visibility>${escapeXml(typeDef.visibility ?? 'Public')}</visibility>
</CustomObject>`;
}

function buildCustomMetadataRecordXml(recordDef) {
  const descriptionXml = recordDef.description
    ? `    <description>${escapeXml(recordDef.description)}</description>\n`
    : '';

  const valuesXml = recordDef.values
    .map((item) => {
      return `    <values>
        <field>${escapeXml(item.field)}</field>
        <value xsi:type="xsd:${escapeXml(item.type)}">${escapeXml(item.value)}</value>
    </values>`;
    })
    .join('\n');

  return `<CustomMetadata xmlns="${XMLNS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
${descriptionXml}    <label>${escapeXml(recordDef.label)}</label>
    <protected>${bool(recordDef.protected ?? false)}</protected>
${valuesXml}
</CustomMetadata>`;
}

function buildLayoutXml(objectDef) {
  const sectionsXml = objectDef.layoutSections
    .map((section) => {
      const columnsXml = section.columns
        .map((columnFields) => {
          const itemsXml = columnFields
            .map((fieldApiName) => {
              const behavior =
                fieldApiName === 'Name' && objectDef.nameField.type === 'AutoNumber'
                  ? 'Readonly'
                  : fieldApiName === 'Name' && objectDef.nameField.type === 'Text'
                    ? 'Required'
                    : null;
              return `            <layoutItems>
${behavior ? `                <behavior>${behavior}</behavior>\n` : ''}                <field>${escapeXml(fieldApiName)}</field>
            </layoutItems>`;
            })
            .join('\n');
          return `        <layoutColumns>
${itemsXml}
        </layoutColumns>`;
        })
        .join('\n');

      return `    <layoutSections>
        <customLabel>true</customLabel>
        <label>${escapeXml(section.label)}</label>
${columnsXml}
        <style>TwoColumnsTopToBottom</style>
    </layoutSections>`;
    })
    .join('\n');

  return `<Layout xmlns="${XMLNS}">
${sectionsXml}
</Layout>`;
}

function buildCustomTabXml(tab) {
  return `<CustomTab xmlns="${XMLNS}">
    <customObject>true</customObject>
    <description>${escapeXml(tab.description)}</description>
    <motif>${escapeXml(tab.motif)}</motif>
</CustomTab>`;
}

function buildCustomPermissionXml(customPermission) {
  return `<CustomPermission xmlns="${XMLNS}">
    <description>${escapeXml(customPermission.description)}</description>
    <label>${escapeXml(customPermission.label)}</label>
</CustomPermission>`;
}

function buildCustomAppXml(app) {
  const tabsXml = app.tabs.map((item) => `    <tabs>${escapeXml(item)}</tabs>`).join('\n');
  return `<CustomApplication xmlns="${XMLNS}">
    <defaultLandingTab>${escapeXml(app.defaultLandingTab)}</defaultLandingTab>
    <description>${escapeXml(app.description)}</description>
    <formFactors>Large</formFactors>
    <isNavAutoTempTabsDisabled>false</isNavAutoTempTabsDisabled>
    <isNavPersonalizationDisabled>false</isNavPersonalizationDisabled>
    <label>${escapeXml(app.label)}</label>
    <navType>Standard</navType>
${tabsXml}
    <uiType>Lightning</uiType>
</CustomApplication>`;
}

function buildManifestXml() {
  const metadataTypes = [
    'ApexClass',
    'ApexTrigger',
    'CustomApplication',
    'CustomMetadata',
    'CustomObject',
    'CustomPermission',
    'CustomTab',
    'Dashboard',
    'DashboardFolder',
    'Flow',
    'GlobalValueSet',
    'Layout',
    'LightningComponentBundle',
    'PermissionSet',
    'Report',
    'ReportFolder',
    'ReportType',
  ];

  const typeBlocks = metadataTypes
    .map(
      (metadataType) => `    <types>
        <members>*</members>
        <name>${metadataType}</name>
    </types>`,
    )
    .join('\n');

  return `<Package xmlns="${XMLNS}">
${typeBlocks}
    <version>${API_VERSION}</version>
</Package>`;
}

const globalValueSets = [
  {
    apiName: 'A360_Negative_Grade',
    label: 'Negative Grade',
    values: ['A', 'B', 'C', 'D', 'E'].map((grade) => picklistValue(grade)),
  },
  {
    apiName: 'A360_Positive_Grade',
    label: 'Positive Grade',
    values: ['A', 'B', 'C', 'D', 'E'].map((grade) => picklistValue(grade)),
  },
  {
    apiName: 'A360_Confidence_Level',
    label: 'Confidence Level',
    values: ['Low', 'Moderate', 'High'].map((item) => picklistValue(item)),
  },
  {
    apiName: 'A360_Domain_Code',
    label: 'Domain Code',
    values: [
      picklistValue('D1_Nutrition', 'D1 Nutrition'),
      picklistValue('D2_Environment', 'D2 Environment'),
      picklistValue('D3_Health', 'D3 Health'),
      picklistValue('D4_Behaviour', 'D4 Behaviour'),
      picklistValue('D5_Mental_State', 'D5 Mental State'),
    ],
  },
  {
    apiName: 'A360_Clinical_Priority',
    label: 'Clinical Priority',
    values: ['Routine', 'Soon', 'Urgent', 'Emergency'].map((item) => picklistValue(item)),
  },
  {
    apiName: 'A360_Interaction_Quality',
    label: 'Interaction Quality',
    values: ['Negative', 'Neutral', 'Positive', 'Enriching'].map((item) => picklistValue(item)),
  },
  {
    apiName: 'A360_Animal_Response',
    label: 'Animal Response',
    values: ['Relaxed', 'Neutral', 'Fearful', 'Avoidant', 'Aggressive', 'Seeking'].map((item) =>
      picklistValue(item),
    ),
  },
];

const assessmentContextValues = [
  picklistValue('Intake'),
  picklistValue('Routine', 'Routine', true),
  picklistValue('Housing'),
  picklistValue('Clinical'),
  picklistValue('Outcome'),
];

const templateStatusValues = [picklistValue('Draft'), picklistValue('Active', 'Active', true), picklistValue('Retired')];
const assessmentStatusValues = [picklistValue('Draft'), picklistValue('Completed', 'Completed', true), picklistValue('Voided')];
const assessmentTypeValues = [
  picklistValue('Baseline', 'Baseline', true),
  picklistValue('Reassessment'),
  picklistValue('Spot Check'),
  picklistValue('Triggered Review'),
];
const severityLevelValues = ['Low', 'Moderate', 'High', 'Critical'].map((item) => picklistValue(item));
const enhancementLevelValues = ['Low', 'Moderate', 'High'].map((item) => picklistValue(item));
const durationValues = ['Acute', 'Short Term', 'Ongoing', 'Unknown'].map((item) => picklistValue(item));
const frequencyValues = ['Once', 'Occasional', 'Repeated', 'Continuous', 'Unknown'].map((item) => picklistValue(item));
const evidenceSourceValues = [
  'Direct Observation',
  'Clinical Examination',
  'Carer Report',
  'Historical Record',
  'Other',
].map((item) => picklistValue(item));
const valueTypeValues = ['Boolean', 'Picklist', 'Number', 'Text', 'DateTime'].map((item) => picklistValue(item));
const carePlanTypeValues = ['Escalation', 'Behaviour', 'Medical', 'Husbandry', 'Enrichment'].map((item) =>
  picklistValue(item),
);
const carePlanStatusValues = [
  picklistValue('Draft'),
  picklistValue('Open', 'Open', true),
  picklistValue('In Progress'),
  picklistValue('Completed'),
  picklistValue('Cancelled'),
];
const carePlanActionTypeValues = [
  'Review Assessment',
  'Housing Change',
  'Clinical Review',
  'Medication',
  'Enrichment',
  'Behaviour Plan',
].map((item) => picklistValue(item));
const carePlanActionStatusValues = [
  picklistValue('Planned', 'Planned', true),
  picklistValue('In Progress'),
  picklistValue('Completed'),
  picklistValue('Cancelled'),
];
const clinicalEventTypeValues = ['Examination', 'Treatment', 'Medication', 'Surgery', 'Review', 'Other'].map((item) =>
  picklistValue(item),
);
const interactionTypeValues = [
  'Handling',
  'Training',
  'Feeding',
  'Enrichment',
  'Clinical Handling',
  'Visitor Interaction',
  'Other',
].map((item) => picklistValue(item));
const humanRoleValues = ['Assessor', 'Care Staff', 'Veterinarian', 'Volunteer', 'Foster Carer', 'Other'].map((item) =>
  picklistValue(item),
);
const defaultSeverityScaleValues = ['Negative', 'Positive', 'Both', 'None'].map((item) => picklistValue(item));

const cmdtTypes = [
  {
    apiName: 'Animal360_Domain_Definition__mdt',
    label: 'Animal360 Domain Definition',
    pluralLabel: 'Animal360 Domain Definitions',
    description: 'Packaged Five Domains catalogue used to seed runtime templates and reporting semantics.',
    fields: [
      cmdtField(textField('Domain_Code__c', 'Domain Code', 40, { description: 'Stable domain code used across templates.' })),
      cmdtField(textField('Domain_Label__c', 'Domain Label', 80, { description: 'User-facing domain label.' })),
      cmdtField(numberField('Display_Order__c', 'Display Order', 3, 0, { description: 'Runtime order for presenting domains.' })),
      cmdtField(
        checkboxField('Is_Mental_State_Domain__c', 'Is Mental State Domain', false, {
          description: 'Marks the domain used for Domain 5 mental-state summary handling.',
        }),
      ),
      cmdtField(
        longTextField('Guidance_Text__c', 'Guidance Text', 32768, 4, {
          description: 'Packaged guidance shown when the domain is presented at runtime.',
        }),
      ),
      cmdtField(checkboxField('Is_Active__c', 'Is Active', true, { description: 'Enables the domain for seeding and runtime selection.' })),
    ],
  },
  {
    apiName: 'Animal360_Species_Template__mdt',
    label: 'Animal360 Species Template',
    pluralLabel: 'Animal360 Species Templates',
    description: 'Maps species and assessment context to a packaged template key.',
    fields: [
      cmdtField(textField('Species__c', 'Species', 80, { description: 'Species label used for runtime template resolution.' })),
      cmdtField(textField('Assessment_Context__c', 'Assessment Context', 80, { description: 'Assessment context used for template resolution.' })),
      cmdtField(textField('Template_Key__c', 'Template Key', 100, { description: 'Stable template key that resolves to a packaged template definition.' })),
      cmdtField(numberField('Priority__c', 'Priority', 3, 0, { description: 'Higher-priority mappings win when multiple records match.' })),
      cmdtField(checkboxField('Is_Default__c', 'Is Default', true, { description: 'Marks the packaged default mapping for the species and context.' })),
      cmdtField(checkboxField('Is_Active__c', 'Is Active', true, { description: 'Enables the species mapping for runtime resolution.' })),
    ],
  },
  {
    apiName: 'Animal360_Indicator_Definition__mdt',
    label: 'Animal360 Indicator Definition',
    pluralLabel: 'Animal360 Indicator Definitions',
    description: 'Packaged indicator catalogue used for runtime assessment rendering and persistence.',
    fields: [
      cmdtField(textField('Indicator_Key__c', 'Indicator Key', 100, { description: 'Stable indicator key used in template assignments and observations.' })),
      cmdtField(textField('Indicator_Label__c', 'Indicator Label', 120, { description: 'User-facing label for the indicator.' })),
      cmdtField(textField('Domain_Code__c', 'Domain Code', 40, { description: 'Domain code associated with the indicator definition.' })),
      cmdtField(
        picklistLocalField('Value_Type__c', 'Value Type', valueTypeValues, {
          description: 'Primary runtime value type for the indicator.',
        }),
      ),
      cmdtField(
        longTextField('Help_Text__c', 'Help Text', 32768, 4, {
          description: 'Runtime help text shown during assessment entry.',
        }),
      ),
      cmdtField(checkboxField('Is_Active__c', 'Is Active', true, { description: 'Enables the indicator for packaged template seeding.' })),
    ],
  },
  {
    apiName: 'Animal360_Indicator_Value_Option__mdt',
    label: 'Animal360 Indicator Value Option',
    pluralLabel: 'Animal360 Indicator Value Options',
    description: 'Packaged picklist options used by picklist-style indicators.',
    fields: [
      cmdtField(textField('Indicator_Key__c', 'Indicator Key', 100, { description: 'Indicator key that owns the option.' })),
      cmdtField(textField('Option_Value__c', 'Option Value', 100, { description: 'Stored option value.' })),
      cmdtField(textField('Option_Label__c', 'Option Label', 120, { description: 'Displayed option label.' })),
      cmdtField(numberField('Display_Order__c', 'Display Order', 3, 0, { description: 'Runtime ordering for the option.' })),
      cmdtField(textField('Default_Severity_Level__c', 'Default Severity Level', 40, { description: 'Optional default severity hint associated with the option.' })),
      cmdtField(textField('Default_Enhancement_Level__c', 'Default Enhancement Level', 40, { description: 'Optional default enhancement hint associated with the option.' })),
    ],
  },
  {
    apiName: 'Animal360_Assessment_Template_Default__mdt',
    label: 'Animal360 Assessment Template Default',
    pluralLabel: 'Animal360 Assessment Template Defaults',
    description: 'Packaged runtime template defaults that seed editable template records.',
    fields: [
      cmdtField(textField('Template_Key__c', 'Template Key', 100, { description: 'Stable packaged template key used by the seed service.' })),
      cmdtField(textField('Template_Code__c', 'Template Code', 100, { description: 'Runtime template code exposed to admins and reports.' })),
      cmdtField(textField('Template_Label__c', 'Template Label', 120, { description: 'User-facing label for the seeded runtime template.' })),
      cmdtField(textField('Species__c', 'Species', 80, { description: 'Species targeted by the template.' })),
      cmdtField(textField('Assessment_Context__c', 'Assessment Context', 80, { description: 'Assessment context targeted by the template.' })),
      cmdtField(textField('Version__c', 'Version', 20, { description: 'Runtime version identifier for the packaged template.' })),
      cmdtField(textField('Status__c', 'Status', 40, { description: 'Packaged runtime status, such as Active or Retired.' })),
      cmdtField(checkboxField('Default_For_Species__c', 'Default For Species', true, { description: 'Marks the packaged template as the default runtime template for its species and context.' })),
      cmdtField(
        longTextField('Description_Text__c', 'Description Text', 32768, 4, {
          description: 'Packaged description for the runtime template.',
        }),
      ),
    ],
  },
  {
    apiName: 'Animal360_Template_Indicator_Default__mdt',
    label: 'Animal360 Template Indicator Default',
    pluralLabel: 'Animal360 Template Indicator Defaults',
    description: 'Packaged indicator assignments that seed editable runtime template rows.',
    fields: [
      cmdtField(textField('Template_Key__c', 'Template Key', 100, { description: 'Packaged template key that owns the assignment.' })),
      cmdtField(textField('Indicator_Key__c', 'Indicator Key', 100, { description: 'Indicator key assigned to the template.' })),
      cmdtField(textField('Domain_Code__c', 'Domain Code', 40, { description: 'Domain code used to group the indicator at runtime.' })),
      cmdtField(numberField('Display_Order__c', 'Display Order', 4, 0, { description: 'Runtime ordering for the indicator within the template.' })),
      cmdtField(checkboxField('Is_Required__c', 'Is Required', true, { description: 'Marks the indicator as required for completeness calculations.' })),
      cmdtField(textField('Default_Severity_Scale__c', 'Default Severity Scale', 40, { description: 'Default severity scale handling for the assignment.' })),
      cmdtField(
        longTextField('Help_Text__c', 'Help Text', 32768, 4, {
          description: 'Packaged help text shown for the template assignment.',
        }),
      ),
      cmdtField(
        longTextField('Visible_When_Rule__c', 'Visible When Rule', 32768, 4, {
          description: 'Optional runtime visibility rule interpreted by the assessment-entry UI.',
        }),
      ),
    ],
  },
  {
    apiName: 'Animal360_Risk_Rule__mdt',
    label: 'Animal360 Risk Rule',
    pluralLabel: 'Animal360 Risk Rules',
    description: 'Packaged metadata-driven rules used to evaluate welfare risk from observations.',
    fields: [
      cmdtField(numberField('Rule_Order__c', 'Rule Order', 4, 0, { description: 'Evaluation order for the rule.' })),
      cmdtField(textField('Indicator_Key__c', 'Indicator Key', 100, { description: 'Optional indicator key that must match for the rule to fire.' })),
      cmdtField(textField('Observed_Picklist_Value__c', 'Observed Picklist Value', 100, { description: 'Optional observed picklist value that must match.' })),
      cmdtField(textField('Severity_Level__c', 'Severity Level', 40, { description: 'Optional severity level that must match.' })),
      cmdtField(checkboxField('Requires_Intervention__c', 'Requires Intervention', false, { description: 'Requires the observation intervention flag when selected.' })),
      cmdtField(textField('Result_Welfare_Risk__c', 'Result Welfare Risk', 40, { description: 'Welfare risk level assigned when the rule matches.' })),
      cmdtField(checkboxField('Auto_Create_Care_Plan__c', 'Auto Create Care Plan', false, { description: 'Requests care-plan auto creation when the rule matches and automation is enabled.' })),
      cmdtField(checkboxField('Is_Active__c', 'Is Active', true, { description: 'Enables the risk rule for runtime evaluation.' })),
    ],
  },
  {
    apiName: 'Animal360_Automation_Setting__mdt',
    label: 'Animal360 Automation Setting',
    pluralLabel: 'Animal360 Automation Settings',
    description: 'Packaged automation settings used by assessment, care-plan, and reminder services.',
    fields: [
      cmdtField(textField('Setting_Key__c', 'Setting Key', 80, { description: 'Stable setting key used by runtime services.' })),
      cmdtField(checkboxField('Auto_Create_Care_Plan__c', 'Auto Create Care Plan', true, { description: 'Enables care-plan auto creation for matching high-risk assessments.' })),
      cmdtField(checkboxField('Create_Reminder_Tasks__c', 'Create Reminder Tasks', true, { description: 'Enables scheduled reminder task generation.' })),
      cmdtField(numberField('Default_Review_Days__c', 'Default Review Days', 3, 0, { description: 'Fallback review interval used when no status transition rule applies.' })),
      cmdtField(numberField('Reminder_Lead_Days__c', 'Reminder Lead Days', 3, 0, { description: 'How many days in advance reminder tasks should be created.' })),
      cmdtField(textField('Default_Care_Plan_Type__c', 'Default Care Plan Type', 80, { description: 'Default care-plan type used for automated escalation plans.' })),
      cmdtField(textField('Default_Action_Type__c', 'Default Action Type', 80, { description: 'Default action type used for generated care-plan actions.' })),
    ],
  },
  {
    apiName: 'Animal360_Status_Transition_Rule__mdt',
    label: 'Animal360 Status Transition Rule',
    pluralLabel: 'Animal360 Status Transition Rules',
    description: 'Maps target welfare risk levels to episode current-state updates and review timing.',
    fields: [
      cmdtField(textField('Target_Welfare_Risk__c', 'Target Welfare Risk', 40, { description: 'Target welfare risk level produced by assessment evaluation.' })),
      cmdtField(textField('Clinical_Priority__c', 'Clinical Priority', 40, { description: 'Clinical priority set on the episode for the target risk level.' })),
      cmdtField(numberField('Review_Days__c', 'Review Days', 3, 0, { description: 'Days until next review for the target risk level.' })),
      cmdtField(textField('Action_Label__c', 'Action Label', 120, { description: 'Short action guidance label used in escalation messaging.' })),
      cmdtField(checkboxField('Is_Active__c', 'Is Active', true, { description: 'Enables the transition rule for runtime use.' })),
    ],
  },
];

const customMetadataRecords = [
  {
    typeApiName: 'Animal360_Domain_Definition__mdt',
    recordName: 'D1_Nutrition',
    label: 'D1 Nutrition',
    description: 'Five Domains definition for nutrition.',
    values: [
      { field: 'Domain_Code__c', type: 'string', value: 'D1_Nutrition' },
      { field: 'Domain_Label__c', type: 'string', value: 'D1 Nutrition' },
      { field: 'Display_Order__c', type: 'double', value: '1' },
      { field: 'Is_Mental_State_Domain__c', type: 'boolean', value: 'false' },
      { field: 'Guidance_Text__c', type: 'string', value: 'Capture access to food and water, appetite, and any nutrition concerns.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Domain_Definition__mdt',
    recordName: 'D2_Environment',
    label: 'D2 Environment',
    description: 'Five Domains definition for environment.',
    values: [
      { field: 'Domain_Code__c', type: 'string', value: 'D2_Environment' },
      { field: 'Domain_Label__c', type: 'string', value: 'D2 Environment' },
      { field: 'Display_Order__c', type: 'double', value: '2' },
      { field: 'Is_Mental_State_Domain__c', type: 'boolean', value: 'false' },
      { field: 'Guidance_Text__c', type: 'string', value: 'Capture shelter, comfort, cleanliness, temperature, and environmental fit.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Domain_Definition__mdt',
    recordName: 'D3_Health',
    label: 'D3 Health',
    description: 'Five Domains definition for health.',
    values: [
      { field: 'Domain_Code__c', type: 'string', value: 'D3_Health' },
      { field: 'Domain_Label__c', type: 'string', value: 'D3 Health' },
      { field: 'Display_Order__c', type: 'double', value: '3' },
      { field: 'Is_Mental_State_Domain__c', type: 'boolean', value: 'false' },
      { field: 'Guidance_Text__c', type: 'string', value: 'Capture illness, injury, pain, and urgent clinical concerns.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Domain_Definition__mdt',
    recordName: 'D4_Behaviour',
    label: 'D4 Behaviour',
    description: 'Five Domains definition for behaviour.',
    values: [
      { field: 'Domain_Code__c', type: 'string', value: 'D4_Behaviour' },
      { field: 'Domain_Label__c', type: 'string', value: 'D4 Behaviour' },
      { field: 'Display_Order__c', type: 'double', value: '4' },
      { field: 'Is_Mental_State_Domain__c', type: 'boolean', value: 'false' },
      { field: 'Guidance_Text__c', type: 'string', value: 'Capture fear, stress, coping, social behaviour, and engagement signals.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Domain_Definition__mdt',
    recordName: 'D5_Mental_State',
    label: 'D5 Mental State',
    description: 'Five Domains definition for mental state.',
    values: [
      { field: 'Domain_Code__c', type: 'string', value: 'D5_Mental_State' },
      { field: 'Domain_Label__c', type: 'string', value: 'D5 Mental State' },
      { field: 'Display_Order__c', type: 'double', value: '5' },
      { field: 'Is_Mental_State_Domain__c', type: 'boolean', value: 'true' },
      { field: 'Guidance_Text__c', type: 'string', value: 'Summarise inferred mental state from the combined evidence across the other domains.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Indicator_Definition__mdt',
    recordName: 'APPETITE',
    label: 'Appetite',
    description: 'Packaged indicator for appetite status.',
    values: [
      { field: 'Indicator_Key__c', type: 'string', value: 'APPETITE' },
      { field: 'Indicator_Label__c', type: 'string', value: 'Appetite' },
      { field: 'Domain_Code__c', type: 'string', value: 'D1_Nutrition' },
      { field: 'Value_Type__c', type: 'string', value: 'Picklist' },
      { field: 'Help_Text__c', type: 'string', value: 'Record whether the animal is eating normally, reduced, or not eating.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Indicator_Definition__mdt',
    recordName: 'HYDRATION_ACCESS',
    label: 'Hydration Access',
    description: 'Packaged indicator for hydration access.',
    values: [
      { field: 'Indicator_Key__c', type: 'string', value: 'HYDRATION_ACCESS' },
      { field: 'Indicator_Label__c', type: 'string', value: 'Hydration Access' },
      { field: 'Domain_Code__c', type: 'string', value: 'D1_Nutrition' },
      { field: 'Value_Type__c', type: 'string', value: 'Boolean' },
      { field: 'Help_Text__c', type: 'string', value: 'Indicate whether the animal had appropriate access to water at the time of assessment.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Indicator_Definition__mdt',
    recordName: 'RESTING_COMFORT',
    label: 'Resting Comfort',
    description: 'Packaged indicator for environmental comfort.',
    values: [
      { field: 'Indicator_Key__c', type: 'string', value: 'RESTING_COMFORT' },
      { field: 'Indicator_Label__c', type: 'string', value: 'Resting Comfort' },
      { field: 'Domain_Code__c', type: 'string', value: 'D2_Environment' },
      { field: 'Value_Type__c', type: 'string', value: 'Picklist' },
      { field: 'Help_Text__c', type: 'string', value: 'Capture whether the current housing environment supports comfortable rest and shelter.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Indicator_Definition__mdt',
    recordName: 'CLINICAL_SIGNS',
    label: 'Clinical Signs',
    description: 'Packaged indicator for clinical signs.',
    values: [
      { field: 'Indicator_Key__c', type: 'string', value: 'CLINICAL_SIGNS' },
      { field: 'Indicator_Label__c', type: 'string', value: 'Clinical Signs' },
      { field: 'Domain_Code__c', type: 'string', value: 'D3_Health' },
      { field: 'Value_Type__c', type: 'string', value: 'Picklist' },
      { field: 'Help_Text__c', type: 'string', value: 'Record the highest level of observable illness, injury, or pain concern.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Indicator_Definition__mdt',
    recordName: 'FEAR_STRESS',
    label: 'Fear Or Stress',
    description: 'Packaged indicator for fear or stress response.',
    values: [
      { field: 'Indicator_Key__c', type: 'string', value: 'FEAR_STRESS' },
      { field: 'Indicator_Label__c', type: 'string', value: 'Fear Or Stress' },
      { field: 'Domain_Code__c', type: 'string', value: 'D4_Behaviour' },
      { field: 'Value_Type__c', type: 'string', value: 'Picklist' },
      { field: 'Help_Text__c', type: 'string', value: 'Capture the strongest observed fear or stress signal during the assessment.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  {
    typeApiName: 'Animal360_Indicator_Definition__mdt',
    recordName: 'SOCIAL_ENGAGEMENT',
    label: 'Social Engagement',
    description: 'Packaged indicator for social engagement.',
    values: [
      { field: 'Indicator_Key__c', type: 'string', value: 'SOCIAL_ENGAGEMENT' },
      { field: 'Indicator_Label__c', type: 'string', value: 'Social Engagement' },
      { field: 'Domain_Code__c', type: 'string', value: 'D4_Behaviour' },
      { field: 'Value_Type__c', type: 'string', value: 'Picklist' },
      { field: 'Help_Text__c', type: 'string', value: 'Capture the animal response to routine social interaction or contact.' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  },
  ...[
    ['APPETITE', 'Normal', 'Normal', '1', '', ''],
    ['APPETITE', 'Reduced', 'Reduced', '2', 'Moderate', ''],
    ['APPETITE', 'Absent', 'Absent', '3', 'High', ''],
    ['RESTING_COMFORT', 'Comfortable', 'Comfortable', '1', '', 'High'],
    ['RESTING_COMFORT', 'Exposed', 'Exposed', '2', 'Moderate', ''],
    ['RESTING_COMFORT', 'Dirty', 'Dirty', '3', 'Moderate', ''],
    ['RESTING_COMFORT', 'Unsafe', 'Unsafe', '4', 'High', ''],
    ['CLINICAL_SIGNS', 'None', 'None', '1', '', ''],
    ['CLINICAL_SIGNS', 'Mild', 'Mild', '2', 'Low', ''],
    ['CLINICAL_SIGNS', 'Moderate', 'Moderate', '3', 'Moderate', ''],
    ['CLINICAL_SIGNS', 'Severe', 'Severe', '4', 'High', ''],
    ['CLINICAL_SIGNS', 'Critical', 'Critical', '5', 'Critical', ''],
    ['FEAR_STRESS', 'Relaxed', 'Relaxed', '1', '', 'High'],
    ['FEAR_STRESS', 'Alert', 'Alert', '2', 'Low', ''],
    ['FEAR_STRESS', 'Tense', 'Tense', '3', 'Moderate', ''],
    ['FEAR_STRESS', 'Fearful', 'Fearful', '4', 'High', ''],
    ['FEAR_STRESS', 'Panicked', 'Panicked', '5', 'Critical', ''],
    ['SOCIAL_ENGAGEMENT', 'Seeks_Contact', 'Seeks Contact', '1', '', 'High'],
    ['SOCIAL_ENGAGEMENT', 'Neutral', 'Neutral', '2', '', ''],
    ['SOCIAL_ENGAGEMENT', 'Withdrawn', 'Withdrawn', '3', 'Moderate', ''],
    ['SOCIAL_ENGAGEMENT', 'Aggressive', 'Aggressive', '4', 'High', ''],
  ].map(([indicatorKey, optionValue, optionLabel, displayOrder, defaultSeverity, defaultEnhancement]) => ({
    typeApiName: 'Animal360_Indicator_Value_Option__mdt',
    recordName: `${indicatorKey}_${optionValue}`,
    label: `${indicatorKey} ${optionLabel}`,
    description: `Packaged value option ${optionLabel} for ${indicatorKey}.`,
    values: [
      { field: 'Indicator_Key__c', type: 'string', value: indicatorKey },
      { field: 'Option_Value__c', type: 'string', value: optionValue },
      { field: 'Option_Label__c', type: 'string', value: optionLabel },
      { field: 'Display_Order__c', type: 'double', value: displayOrder },
      { field: 'Default_Severity_Level__c', type: 'string', value: defaultSeverity },
      { field: 'Default_Enhancement_Level__c', type: 'string', value: defaultEnhancement },
    ],
  })),
  {
    typeApiName: 'Animal360_Assessment_Template_Default__mdt',
    recordName: 'COMPANION_ROUTINE_V1',
    label: 'Companion Routine V1',
    description: 'Packaged default assessment template for companion-animal routine welfare checks.',
    values: [
      { field: 'Template_Key__c', type: 'string', value: 'COMPANION_ROUTINE_V1' },
      { field: 'Template_Code__c', type: 'string', value: 'COMPANION_ROUTINE_V1' },
      { field: 'Template_Label__c', type: 'string', value: 'Companion Routine V1' },
      { field: 'Species__c', type: 'string', value: 'Dog' },
      { field: 'Assessment_Context__c', type: 'string', value: 'Routine' },
      { field: 'Version__c', type: 'string', value: '1.0' },
      { field: 'Status__c', type: 'string', value: 'Active' },
      { field: 'Default_For_Species__c', type: 'boolean', value: 'true' },
      { field: 'Description_Text__c', type: 'string', value: 'Baseline packaged welfare template for routine companion-animal assessments.' },
    ],
  },
  ...['Dog', 'Cat', 'Rabbit'].map((species, indexValue) => ({
    typeApiName: 'Animal360_Species_Template__mdt',
    recordName: `${species}_Routine_Default`,
    label: `${species} Routine Default`,
    description: `Default routine template resolution for ${species.toLowerCase()} assessments.`,
    values: [
      { field: 'Species__c', type: 'string', value: species },
      { field: 'Assessment_Context__c', type: 'string', value: 'Routine' },
      { field: 'Template_Key__c', type: 'string', value: 'COMPANION_ROUTINE_V1' },
      { field: 'Priority__c', type: 'double', value: String(indexValue + 1) },
      { field: 'Is_Default__c', type: 'boolean', value: 'true' },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  })),
  ...[
    ['APPETITE', 'D1_Nutrition', '10', 'true', 'Negative', 'Capture whether the animal is eating as expected.', ''],
    ['HYDRATION_ACCESS', 'D1_Nutrition', '20', 'true', 'Negative', 'Confirm access to water or note if intervention is required.', ''],
    ['RESTING_COMFORT', 'D2_Environment', '30', 'true', 'Negative', 'Assess rest, shelter, bedding, and immediate environmental fit.', ''],
    ['CLINICAL_SIGNS', 'D3_Health', '40', 'true', 'Negative', 'Record the most serious visible health finding.', ''],
    ['FEAR_STRESS', 'D4_Behaviour', '50', 'true', 'Negative', 'Capture the strongest fear or stress signal observed.', ''],
    ['SOCIAL_ENGAGEMENT', 'D4_Behaviour', '60', 'false', 'Both', 'Capture how the animal responded to routine interaction.', ''],
  ].map(([indicatorKey, domainCode, displayOrder, isRequired, scale, helpText, visibleWhen]) => ({
    typeApiName: 'Animal360_Template_Indicator_Default__mdt',
    recordName: `COMPANION_ROUTINE_V1_${indicatorKey}`,
    label: `${indicatorKey} Companion Routine`,
    description: `Packaged template assignment for ${indicatorKey} in the companion routine template.`,
    values: [
      { field: 'Template_Key__c', type: 'string', value: 'COMPANION_ROUTINE_V1' },
      { field: 'Indicator_Key__c', type: 'string', value: indicatorKey },
      { field: 'Domain_Code__c', type: 'string', value: domainCode },
      { field: 'Display_Order__c', type: 'double', value: displayOrder },
      { field: 'Is_Required__c', type: 'boolean', value: isRequired },
      { field: 'Default_Severity_Scale__c', type: 'string', value: scale },
      { field: 'Help_Text__c', type: 'string', value: helpText },
      { field: 'Visible_When_Rule__c', type: 'string', value: visibleWhen },
    ],
  })),
  ...[
    ['1', 'CLINICAL_SIGNS', 'Critical', '', 'false', 'Critical', 'true'],
    ['2', 'CLINICAL_SIGNS', 'Severe', '', 'false', 'High', 'true'],
    ['3', 'FEAR_STRESS', 'Panicked', '', 'false', 'High', 'true'],
    ['4', 'APPETITE', 'Absent', '', 'false', 'High', 'true'],
    ['5', '', '', 'High', 'false', 'High', 'true'],
    ['6', '', '', '', 'true', 'High', 'true'],
  ].map(([ruleOrder, indicatorKey, picklistValue, severityLevel, interventionRequired, resultRisk, autoPlan]) => ({
    typeApiName: 'Animal360_Risk_Rule__mdt',
    recordName: `Risk_Rule_${ruleOrder}`,
    label: `Risk Rule ${ruleOrder}`,
    description: `Packaged risk rule ${ruleOrder} for Phase II welfare evaluation.`,
    values: [
      { field: 'Rule_Order__c', type: 'double', value: ruleOrder },
      { field: 'Indicator_Key__c', type: 'string', value: indicatorKey },
      { field: 'Observed_Picklist_Value__c', type: 'string', value: picklistValue },
      { field: 'Severity_Level__c', type: 'string', value: severityLevel },
      { field: 'Requires_Intervention__c', type: 'boolean', value: interventionRequired },
      { field: 'Result_Welfare_Risk__c', type: 'string', value: resultRisk },
      { field: 'Auto_Create_Care_Plan__c', type: 'boolean', value: autoPlan },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  })),
  {
    typeApiName: 'Animal360_Automation_Setting__mdt',
    recordName: 'DEFAULT',
    label: 'Default Automation',
    description: 'Default packaged automation settings for Phase II.',
    values: [
      { field: 'Setting_Key__c', type: 'string', value: 'DEFAULT' },
      { field: 'Auto_Create_Care_Plan__c', type: 'boolean', value: 'true' },
      { field: 'Create_Reminder_Tasks__c', type: 'boolean', value: 'true' },
      { field: 'Default_Review_Days__c', type: 'double', value: '14' },
      { field: 'Reminder_Lead_Days__c', type: 'double', value: '1' },
      { field: 'Default_Care_Plan_Type__c', type: 'string', value: 'Escalation' },
      { field: 'Default_Action_Type__c', type: 'string', value: 'Review Assessment' },
    ],
  },
  ...[
    ['Low', 'Routine', '30', 'Continue routine monitoring'],
    ['Moderate', 'Soon', '14', 'Schedule follow-up review'],
    ['High', 'Urgent', '3', 'Escalate to care manager'],
    ['Critical', 'Emergency', '1', 'Immediate escalation required'],
  ].map(([risk, clinicalPriority, reviewDays, actionLabel]) => ({
    typeApiName: 'Animal360_Status_Transition_Rule__mdt',
    recordName: `${risk}_Transition`,
    label: `${risk} Transition`,
    description: `Packaged status transition handling for ${risk.toLowerCase()} welfare risk.`,
    values: [
      { field: 'Target_Welfare_Risk__c', type: 'string', value: risk },
      { field: 'Clinical_Priority__c', type: 'string', value: clinicalPriority },
      { field: 'Review_Days__c', type: 'double', value: reviewDays },
      { field: 'Action_Label__c', type: 'string', value: actionLabel },
      { field: 'Is_Active__c', type: 'boolean', value: 'true' },
    ],
  })),
];

const episodeExtensionFields = [
  picklistGlobalField('Current_Welfare_Level__c', 'Current Welfare Level', 'A360_Welfare_Risk', {
    description: 'System-maintained current welfare level for the active episode.',
    helpText: 'This field is maintained by assessment automation and should remain read-only for operational users.',
  }),
  picklistGlobalField('Current_Clinical_Priority__c', 'Current Clinical Priority', 'A360_Clinical_Priority', {
    description: 'System-maintained current clinical priority for the active episode.',
    helpText: 'This field is maintained by assessment automation and should remain read-only for operational users.',
  }),
  dateField('Next_Review_Date__c', 'Next Review Date', {
    description: 'System-maintained next welfare or clinical review date for the active episode.',
    helpText: 'This field is maintained by assessment automation and should remain read-only for operational users.',
  }),
];

const customObjects = [
  {
    apiName: 'Assessment_Template__c',
    label: 'Assessment Template',
    pluralLabel: 'Assessment Templates',
    description: 'Editable runtime assessment template used to drive Phase II welfare capture.',
    enableActivities: false,
    enableReports: true,
    sharingModel: 'ReadWrite',
    visibility: 'Public',
    nameField: { label: 'Template Name', type: 'Text' },
    fields: [
      textField('Template_Code__c', 'Template Code', 100, {
        description: 'Unique runtime template code used in admin maintenance and reports.',
        unique: true,
        caseSensitive: false,
      }),
      picklistGlobalField('Species__c', 'Species', 'A360_Species', {
        description: 'Species targeted by the template.',
        helpText: 'Use the species that should resolve to this template at runtime.',
      }),
      picklistLocalField('Context__c', 'Context', assessmentContextValues, {
        description: 'Assessment context targeted by the template.',
        helpText: 'Use the operational context in which the template should be applied.',
      }),
      textField('Version__c', 'Version', 20, {
        description: 'Version identifier preserved on completed assessments for historical traceability.',
      }),
      picklistLocalField('Status__c', 'Status', templateStatusValues, {
        description: 'Runtime lifecycle state for the template.',
        helpText: 'Only active templates are available for assessment entry.',
      }),
      checkboxField('Default_For_Species__c', 'Default For Species', false, {
        description: 'Marks the runtime template as the default for its species and context.',
      }),
      longTextField('Description__c', 'Description', 32768, 4, {
        description: 'Administrative description of the template purpose and intended use.',
      }),
      textField('Metadata_Template_Key__c', 'Metadata Template Key', 100, {
        description: 'Stable packaged template key used for idempotent seed and upgrade sync.',
        unique: true,
        caseSensitive: false,
        externalId: true,
      }),
      checkboxField('Is_Managed_Seed__c', 'Is Managed Seed', false, {
        description: 'Distinguishes package-managed seed templates from subscriber-authored runtime templates.',
      }),
      dateTimeField('Seed_Last_Synced_On__c', 'Seed Last Synced On', {
        description: 'Timestamp of the last successful seed or upgrade sync from packaged defaults.',
      }),
      textField('Default_Context_Key__c', 'Default Context Key', 150, {
        description: 'System-maintained uniqueness key that prevents more than one active default template per species and context.',
        unique: true,
        caseSensitive: false,
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Template Details',
        columns: [
          ['Name', 'Template_Code__c', 'Species__c', 'Context__c', 'Status__c'],
          ['Version__c', 'Default_For_Species__c', 'Metadata_Template_Key__c', 'Is_Managed_Seed__c', 'Seed_Last_Synced_On__c'],
        ],
      },
      {
        label: 'Description',
        columns: [['Description__c'], ['Default_Context_Key__c']],
      },
    ],
  },
  {
    apiName: 'Template_Domain_Definition__c',
    label: 'Template Domain Definition',
    pluralLabel: 'Template Domain Definitions',
    description: 'Editable runtime domain row belonging to an assessment template.',
    enableActivities: false,
    enableReports: true,
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    nameField: { label: 'Template Domain Definition Number', type: 'AutoNumber', displayFormat: 'TD-{00000}' },
    fields: [
      masterDetailField('Assessment_Template__c', 'Assessment Template', 'Assessment_Template__c', 'Domain Definitions', 'Domain_Definitions', {
        description: 'Runtime template that owns the domain definition row.',
      }),
      picklistGlobalField('Domain_Code__c', 'Domain Code', 'A360_Domain_Code', {
        description: 'Domain represented by the template row.',
      }),
      numberField('Display_Order__c', 'Display Order', 4, 0, {
        description: 'Runtime ordering for the domain within the template.',
      }),
      checkboxField('Is_Required__c', 'Is Required', true, {
        description: 'Marks the domain as required for completeness calculations.',
      }),
      longTextField('Guidance_Text__c', 'Guidance Text', 32768, 4, {
        description: 'Runtime guidance shown to assessors for the domain.',
      }),
      picklistGlobalField('Default_Confidence__c', 'Default Confidence', 'A360_Confidence_Level', {
        description: 'Default confidence level suggested for the domain summary.',
      }),
      textField('Metadata_Row_Key__c', 'Metadata Row Key', 150, {
        description: 'System-maintained packaged row key used for idempotent seed synchronization.',
        unique: true,
        caseSensitive: false,
        externalId: true,
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Domain Definition',
        columns: [
          ['Name', 'Assessment_Template__c', 'Domain_Code__c', 'Display_Order__c', 'Is_Required__c'],
          ['Default_Confidence__c', 'Metadata_Row_Key__c'],
        ],
      },
      {
        label: 'Guidance',
        columns: [['Guidance_Text__c'], []],
      },
    ],
  },
  {
    apiName: 'Template_Indicator_Assignment__c',
    label: 'Template Indicator Assignment',
    pluralLabel: 'Template Indicator Assignments',
    description: 'Editable runtime indicator assignment belonging to an assessment template.',
    enableActivities: false,
    enableReports: true,
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    nameField: { label: 'Template Indicator Assignment Number', type: 'AutoNumber', displayFormat: 'TI-{00000}' },
    fields: [
      masterDetailField('Assessment_Template__c', 'Assessment Template', 'Assessment_Template__c', 'Indicator Assignments', 'Indicator_Assignments', {
        description: 'Runtime template that owns the indicator assignment row.',
      }),
      textField('Indicator_Key__c', 'Indicator Key', 100, {
        description: 'Stable indicator key assigned to the template.',
      }),
      picklistGlobalField('Domain_Code__c', 'Domain Code', 'A360_Domain_Code', {
        description: 'Domain grouping for the indicator assignment.',
      }),
      numberField('Display_Order__c', 'Display Order', 4, 0, {
        description: 'Runtime ordering for the indicator within the template.',
      }),
      checkboxField('Is_Required__c', 'Is Required', true, {
        description: 'Marks the indicator as required for assessment completeness.',
      }),
      picklistLocalField('Default_Severity_Scale__c', 'Default Severity Scale', defaultSeverityScaleValues, {
        description: 'Default severity-scale handling for the assignment.',
      }),
      longTextField('Help_Text__c', 'Help Text', 32768, 4, {
        description: 'Runtime help text shown for the indicator assignment.',
      }),
      longTextField('Visible_When_Rule__c', 'Visible When Rule', 32768, 4, {
        description: 'Optional visibility rule interpreted by the assessment-entry component.',
      }),
      textField('Metadata_Row_Key__c', 'Metadata Row Key', 150, {
        description: 'System-maintained packaged row key used for idempotent seed synchronization.',
        unique: true,
        caseSensitive: false,
        externalId: true,
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Indicator Assignment',
        columns: [
          ['Name', 'Assessment_Template__c', 'Indicator_Key__c', 'Domain_Code__c', 'Display_Order__c'],
          ['Is_Required__c', 'Default_Severity_Scale__c', 'Metadata_Row_Key__c'],
        ],
      },
      {
        label: 'Guidance And Visibility',
        columns: [['Help_Text__c'], ['Visible_When_Rule__c']],
      },
    ],
  },
  {
    apiName: 'Welfare_Assessment__c',
    label: 'Welfare Assessment',
    pluralLabel: 'Welfare Assessments',
    description: 'Historical welfare assessment event linked to an animal episode.',
    enableActivities: true,
    enableReports: true,
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    nameField: { label: 'Welfare Assessment Number', type: 'AutoNumber', displayFormat: 'WA-{00000}' },
    fields: [
      masterDetailField('Animal_Episode__c', 'Animal Episode', 'Animal_Episode__c', 'Welfare Assessments', 'Welfare_Assessments', {
        description: 'Episode that owns the historical welfare assessment.',
      }),
      lookupField('Animal__c', 'Animal', 'Animal__c', 'Welfare Assessments', 'Welfare_Assessments', {
        description: 'Animal linked redundantly for direct reporting and quick access.',
      }),
      lookupField('Assessment_Template__c', 'Assessment Template', 'Assessment_Template__c', 'Welfare Assessments', 'Welfare_Assessments', {
        description: 'Runtime template used to capture the assessment.',
      }),
      lookupField('Assessor__c', 'Assessor', 'User', 'Welfare Assessments', 'Welfare_Assessments', {
        description: 'User who completed or owns the assessment event.',
      }),
      lookupField('Related_Case__c', 'Related Case', 'Case', 'Welfare Assessments', 'Welfare_Assessments', {
        description: 'Optional case linked to the welfare assessment.',
      }),
      dateTimeField('Assessment_DateTime__c', 'Assessment Date Time', {
        description: 'When the assessment was completed or recorded.',
        helpText: 'This value is required when the assessment is completed.',
      }),
      picklistLocalField('Assessment_Type__c', 'Assessment Type', assessmentTypeValues, {
        description: 'Type of assessment event.',
      }),
      picklistLocalField('Assessment_Context__c', 'Assessment Context', assessmentContextValues, {
        description: 'Operational context in which the assessment occurred.',
      }),
      picklistLocalField('Assessment_Status__c', 'Assessment Status', assessmentStatusValues, {
        description: 'Lifecycle state of the assessment record.',
      }),
      percentField('Completeness__c', 'Completeness', 3, 0, {
        description: 'System-calculated completeness percentage for required domains and indicators.',
      }),
      picklistGlobalField('Overall_Negative_Grade__c', 'Overall Negative Grade', 'A360_Negative_Grade', {
        description: 'Overall negative-grade summary for the assessment.',
      }),
      picklistGlobalField('Overall_Positive_Grade__c', 'Overall Positive Grade', 'A360_Positive_Grade', {
        description: 'Overall positive-grade summary for the assessment.',
      }),
      picklistGlobalField('Overall_Welfare_Concern__c', 'Overall Welfare Concern', 'A360_Welfare_Risk', {
        description: 'Overall welfare concern assigned by metadata-driven risk evaluation.',
      }),
      longTextField('Domain_5_Mental_State_Summary__c', 'Domain 5 Mental State Summary', 32768, 5, {
        description: 'Narrative mental-state inference made from the combined evidence.',
      }),
      picklistGlobalField('Confidence_Level__c', 'Confidence Level', 'A360_Confidence_Level', {
        description: 'Overall confidence in the completed assessment.',
      }),
      checkboxField('Immediate_Action_Required__c', 'Immediate Action Required', false, {
        description: 'Flags assessments that require immediate escalation or intervention.',
      }),
      dateField('Next_Review_Date__c', 'Next Review Date', {
        description: 'Planned next welfare review date.',
      }),
      textField('Template_Code_Snapshot__c', 'Template Code Snapshot', 100, {
        description: 'Runtime template code captured when the assessment was completed.',
      }),
      textField('Template_Version_Snapshot__c', 'Template Version Snapshot', 20, {
        description: 'Runtime template version captured when the assessment was completed.',
      }),
      textField('Template_Key_Snapshot__c', 'Template Key Snapshot', 100, {
        description: 'Packaged template key captured when the assessment was completed.',
      }),
      dateTimeField('Risk_Evaluated_On__c', 'Risk Evaluated On', {
        description: 'Timestamp of the latest risk-evaluation pass for the assessment.',
      }),
    ],
    validations: [
      {
        apiName: 'A360_Completed_Assessment_Req',
        description: 'Completed assessments must store both assessor and assessment date/time.',
        errorConditionFormula:
          'AND(ISPICKVAL(Assessment_Status__c, "Completed"), OR(ISBLANK(Assessor__c), ISBLANK(Assessment_DateTime__c)))',
        errorMessage: 'Completed assessments require both an assessor and an assessment date/time.',
      },
      {
        apiName: 'A360_Immediate_Action_Requires_Concern',
        description: 'Immediate action cannot be checked unless an overall welfare concern is set.',
        errorConditionFormula: 'AND(Immediate_Action_Required__c, ISPICKVAL(Overall_Welfare_Concern__c, ""))',
        errorMessage: 'Set the overall welfare concern before marking immediate action required.',
      },
    ],
    layoutSections: [
      {
        label: 'Assessment Context',
        columns: [
          ['Name', 'Animal_Episode__c', 'Animal__c', 'Assessment_Template__c', 'Assessor__c'],
          ['Assessment_DateTime__c', 'Assessment_Type__c', 'Assessment_Context__c', 'Assessment_Status__c', 'Related_Case__c'],
        ],
      },
      {
        label: 'Assessment Outcome',
        columns: [
          ['Completeness__c', 'Overall_Negative_Grade__c', 'Overall_Positive_Grade__c', 'Overall_Welfare_Concern__c'],
          ['Confidence_Level__c', 'Immediate_Action_Required__c', 'Next_Review_Date__c', 'Risk_Evaluated_On__c'],
        ],
      },
      {
        label: 'Historical Traceability',
        columns: [
          ['Template_Code_Snapshot__c', 'Template_Version_Snapshot__c'],
          ['Template_Key_Snapshot__c'],
        ],
      },
      {
        label: 'Mental State',
        columns: [['Domain_5_Mental_State_Summary__c'], []],
      },
    ],
  },
  {
    apiName: 'Welfare_Domain_Summary__c',
    label: 'Welfare Domain Summary',
    pluralLabel: 'Welfare Domain Summaries',
    description: 'Historical per-domain summary captured as part of a welfare assessment.',
    enableActivities: false,
    enableReports: true,
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    nameField: { label: 'Welfare Domain Summary Number', type: 'AutoNumber', displayFormat: 'WDS-{00000}' },
    fields: [
      masterDetailField('Welfare_Assessment__c', 'Welfare Assessment', 'Welfare_Assessment__c', 'Domain Summaries', 'Domain_Summaries', {
        description: 'Assessment that owns the domain summary.',
      }),
      picklistGlobalField('Domain_Code__c', 'Domain Code', 'A360_Domain_Code', {
        description: 'Domain represented by the summary row.',
      }),
      picklistGlobalField('Negative_Grade__c', 'Negative Grade', 'A360_Negative_Grade', {
        description: 'Negative grade for the domain.',
      }),
      picklistGlobalField('Positive_Grade__c', 'Positive Grade', 'A360_Positive_Grade', {
        description: 'Positive grade for the domain.',
      }),
      longTextField('Key_Findings__c', 'Key Findings', 32768, 4, {
        description: 'Summary of the main findings for the domain.',
      }),
      longTextField('Inferred_Affects__c', 'Inferred Affects', 32768, 4, {
        description: 'Narrative inferred affects for the domain.',
      }),
      checkboxField('Action_Required__c', 'Action Required', false, {
        description: 'Flags that the domain summary identified required action.',
      }),
      longTextField('Action_Summary__c', 'Action Summary', 32768, 4, {
        description: 'Summary of the action required for the domain.',
      }),
      picklistGlobalField('Confidence_Level__c', 'Confidence Level', 'A360_Confidence_Level', {
        description: 'Confidence level for the domain summary.',
      }),
      textField('Assessment_Domain_Key__c', 'Assessment Domain Key', 160, {
        description: 'System-maintained unique key that ensures one domain summary per domain per assessment.',
        unique: true,
        caseSensitive: false,
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Domain Summary',
        columns: [
          ['Name', 'Welfare_Assessment__c', 'Domain_Code__c', 'Negative_Grade__c', 'Positive_Grade__c'],
          ['Action_Required__c', 'Confidence_Level__c', 'Assessment_Domain_Key__c'],
        ],
      },
      {
        label: 'Findings',
        columns: [['Key_Findings__c'], ['Inferred_Affects__c']],
      },
      {
        label: 'Action',
        columns: [['Action_Summary__c'], []],
      },
    ],
  },
  {
    apiName: 'Welfare_Observation__c',
    label: 'Welfare Observation',
    pluralLabel: 'Welfare Observations',
    description: 'Historical evidence line captured as part of a welfare assessment.',
    enableActivities: false,
    enableReports: true,
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    nameField: { label: 'Welfare Observation Number', type: 'AutoNumber', displayFormat: 'OBS-{00000}' },
    fields: [
      masterDetailField('Welfare_Assessment__c', 'Welfare Assessment', 'Welfare_Assessment__c', 'Observations', 'Observations', {
        description: 'Assessment that owns the evidence line.',
      }),
      textField('Indicator_Key__c', 'Indicator Key', 100, {
        description: 'Stable indicator key used to interpret the observation historically.',
      }),
      textField('Indicator_Label__c', 'Indicator Label', 120, {
        description: 'Indicator label captured at the time of observation for direct reporting.',
      }),
      picklistGlobalField('Domain_Code__c', 'Domain Code', 'A360_Domain_Code', {
        description: 'Domain grouping for the observation.',
      }),
      picklistLocalField('Observation_Value_Type__c', 'Observation Value Type', valueTypeValues, {
        description: 'Explicit value type used by the observation so false booleans remain reportable and valid.',
      }),
      checkboxField('Observed_Boolean__c', 'Observed Boolean', false, {
        description: 'Boolean observation value when the indicator is boolean-based.',
      }),
      textField('Observed_Picklist_Value__c', 'Observed Picklist Value', 100, {
        description: 'Observed picklist value when the indicator is picklist-based.',
      }),
      numberField('Observed_Numeric_Value__c', 'Observed Numeric Value', 10, 2, {
        description: 'Observed numeric value when the indicator is number-based.',
      }),
      longTextField('Observed_Text__c', 'Observed Text', 32768, 4, {
        description: 'Observed narrative value when the indicator is text-based.',
      }),
      dateTimeField('Observed_DateTime__c', 'Observed Date Time', {
        description: 'Observed date/time value when the indicator is datetime-based.',
      }),
      picklistLocalField('Severity_Level__c', 'Severity Level', severityLevelValues, {
        description: 'Severity level assigned to the observation when negative evidence is present.',
      }),
      picklistLocalField('Enhancement_Level__c', 'Enhancement Level', enhancementLevelValues, {
        description: 'Enhancement level assigned when positive welfare evidence is present.',
      }),
      picklistLocalField('Duration__c', 'Duration', durationValues, {
        description: 'Observed duration of the evidence line where known.',
      }),
      picklistLocalField('Frequency__c', 'Frequency', frequencyValues, {
        description: 'Observed frequency of the evidence line where known.',
      }),
      picklistLocalField('Evidence_Source__c', 'Evidence Source', evidenceSourceValues, {
        description: 'Source of the evidence captured in the observation.',
      }),
      picklistGlobalField('Confidence_Level__c', 'Confidence Level', 'A360_Confidence_Level', {
        description: 'Confidence level for the captured evidence line.',
      }),
      checkboxField('Requires_Intervention__c', 'Requires Intervention', false, {
        description: 'Flags that the observation requires intervention or immediate follow-up.',
      }),
      longTextField('Intervention_Notes__c', 'Intervention Notes', 32768, 4, {
        description: 'Narrative intervention notes linked to the observation.',
      }),
      textField('Observation_Key__c', 'Observation Key', 180, {
        description: 'System-maintained unique key that ensures one observation per indicator per assessment.',
        unique: true,
        caseSensitive: false,
      }),
    ],
    validations: [
      {
        apiName: 'A360_Observation_Value_Required',
        description: 'An observation must capture at least one observed value or declare the value type explicitly for boolean capture.',
        errorConditionFormula:
          'AND(ISPICKVAL(Observation_Value_Type__c, ""), NOT(Observed_Boolean__c), ISBLANK(Observed_Picklist_Value__c), ISBLANK(TEXT(Observed_Numeric_Value__c)), ISBLANK(Observed_Text__c), ISBLANK(TEXT(Observed_DateTime__c)))',
        errorMessage: 'Provide an observed value or set the observation value type before saving the observation.',
      },
    ],
    layoutSections: [
      {
        label: 'Observation',
        columns: [
          ['Name', 'Welfare_Assessment__c', 'Domain_Code__c', 'Indicator_Key__c', 'Indicator_Label__c'],
          ['Observation_Value_Type__c', 'Evidence_Source__c', 'Confidence_Level__c', 'Observation_Key__c'],
        ],
      },
      {
        label: 'Observed Values',
        columns: [
          ['Observed_Boolean__c', 'Observed_Picklist_Value__c', 'Observed_Numeric_Value__c'],
          ['Observed_DateTime__c', 'Observed_Text__c'],
        ],
      },
      {
        label: 'Evaluation',
        columns: [
          ['Severity_Level__c', 'Enhancement_Level__c', 'Duration__c', 'Frequency__c'],
          ['Requires_Intervention__c', 'Intervention_Notes__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Care_Plan__c',
    label: 'Care Plan',
    pluralLabel: 'Care Plans',
    description: 'Action layer record that responds to welfare assessments within an episode.',
    enableActivities: true,
    enableReports: true,
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    nameField: { label: 'Care Plan Number', type: 'AutoNumber', displayFormat: 'CP-{00000}' },
    fields: [
      masterDetailField('Animal_Episode__c', 'Animal Episode', 'Animal_Episode__c', 'Care Plans', 'Care_Plans', {
        description: 'Episode that owns the care plan.',
      }),
      lookupField('Primary_Assessment__c', 'Primary Assessment', 'Welfare_Assessment__c', 'Care Plans', 'Care_Plans', {
        description: 'Assessment that triggered or primarily supports the care plan.',
      }),
      picklistLocalField('Plan_Type__c', 'Plan Type', carePlanTypeValues, {
        description: 'Type of intervention plan being created.',
      }),
      picklistLocalField('Status__c', 'Status', carePlanStatusValues, {
        description: 'Lifecycle state of the care plan.',
      }),
      dateField('Start_Date__c', 'Start Date', {
        description: 'Start date for the plan.',
      }),
      dateField('Target_Review_Date__c', 'Target Review Date', {
        description: 'Review date by which the plan should be reassessed.',
      }),
      longTextField('Primary_Goal__c', 'Primary Goal', 32768, 4, {
        description: 'Primary goal for the plan.',
      }),
      longTextField('Success_Criteria__c', 'Success Criteria', 32768, 4, {
        description: 'Criteria that define plan success.',
      }),
      lookupField('Owner_User__c', 'Owner User', 'User', 'Care Plans', 'Care_Plans', {
        description: 'User accountable for progressing the care plan.',
      }),
      checkboxField('Auto_Created__c', 'Auto Created', false, {
        description: 'Indicates whether the plan was created by automation.',
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Plan Details',
        columns: [
          ['Name', 'Animal_Episode__c', 'Primary_Assessment__c', 'Plan_Type__c', 'Status__c'],
          ['Start_Date__c', 'Target_Review_Date__c', 'Owner_User__c', 'Auto_Created__c'],
        ],
      },
      {
        label: 'Plan Outcome',
        columns: [['Primary_Goal__c'], ['Success_Criteria__c']],
      },
    ],
  },
  {
    apiName: 'Care_Plan_Action__c',
    label: 'Care Plan Action',
    pluralLabel: 'Care Plan Actions',
    description: 'Action item belonging to a care plan.',
    enableActivities: true,
    enableReports: true,
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    nameField: { label: 'Care Plan Action Number', type: 'AutoNumber', displayFormat: 'CPA-{00000}' },
    fields: [
      masterDetailField('Care_Plan__c', 'Care Plan', 'Care_Plan__c', 'Care Plan Actions', 'Care_Plan_Actions', {
        description: 'Care plan that owns the action item.',
      }),
      picklistLocalField('Action_Type__c', 'Action Type', carePlanActionTypeValues, {
        description: 'Type of action required under the care plan.',
      }),
      longTextField('Description__c', 'Description', 32768, 4, {
        description: 'Description of the action to complete.',
      }),
      lookupField('Assigned_To__c', 'Assigned To', 'User', 'Care Plan Actions', 'Care_Plan_Actions', {
        description: 'User assigned to complete the action.',
      }),
      dateField('Due_Date__c', 'Due Date', {
        description: 'Date by which the action should be completed.',
      }),
      picklistLocalField('Status__c', 'Status', carePlanActionStatusValues, {
        description: 'Lifecycle state of the action item.',
      }),
      longTextField('Completion_Notes__c', 'Completion Notes', 32768, 4, {
        description: 'Completion notes captured when the action is closed.',
      }),
      dateTimeField('Completed_On__c', 'Completed On', {
        description: 'Timestamp when the action was marked completed.',
      }),
    ],
    validations: [
      {
        apiName: 'A360_Completed_Action_Requires_Notes',
        description: 'Completed actions require completion notes.',
        errorConditionFormula: 'AND(ISPICKVAL(Status__c, "Completed"), ISBLANK(Completion_Notes__c))',
        errorMessage: 'Enter completion notes before marking the action completed.',
      },
    ],
    layoutSections: [
      {
        label: 'Action Details',
        columns: [
          ['Name', 'Care_Plan__c', 'Action_Type__c', 'Assigned_To__c', 'Due_Date__c'],
          ['Status__c', 'Completed_On__c'],
        ],
      },
      {
        label: 'Narrative',
        columns: [['Description__c'], ['Completion_Notes__c']],
      },
    ],
  },
  {
    apiName: 'Clinical_Event__c',
    label: 'Clinical Event',
    pluralLabel: 'Clinical Events',
    description: 'Lightweight clinical event linked to an animal and episode.',
    enableActivities: true,
    enableReports: true,
    sharingModel: 'ReadWrite',
    visibility: 'Public',
    nameField: { label: 'Clinical Event Number', type: 'AutoNumber', displayFormat: 'CE-{00000}' },
    fields: [
      lookupField('Animal_Episode__c', 'Animal Episode', 'Animal_Episode__c', 'Clinical Events', 'Clinical_Events', {
        description: 'Episode linked to the clinical event.',
      }),
      lookupField('Animal__c', 'Animal', 'Animal__c', 'Clinical Events', 'Clinical_Events', {
        description: 'Animal linked redundantly for direct reporting.',
      }),
      lookupField('Related_Case__c', 'Related Case', 'Case', 'Clinical Events', 'Clinical_Events', {
        description: 'Optional case linked to the clinical event.',
      }),
      lookupField('Clinician_Contact__c', 'Clinician Contact', 'Contact', 'Clinical Events', 'Clinical_Events', {
        description: 'External or internal clinician contact linked to the event.',
      }),
      lookupField('Recorded_By__c', 'Recorded By', 'User', 'Clinical Events', 'Clinical_Events', {
        description: 'User who recorded the event.',
      }),
      picklistLocalField('Clinical_Event_Type__c', 'Clinical Event Type', clinicalEventTypeValues, {
        description: 'Type of clinical event recorded.',
      }),
      dateTimeField('Clinical_DateTime__c', 'Clinical Date Time', {
        description: 'Date and time of the clinical event.',
      }),
      textField('Problem_Code__c', 'Problem Code', 50, {
        description: 'Short problem or issue code used for reporting or integration.',
      }),
      longTextField('Problem_Summary__c', 'Problem Summary', 32768, 4, {
        description: 'Narrative summary of the clinical issue or treatment.',
      }),
      checkboxField('Pain_Observed__c', 'Pain Observed', false, {
        description: 'Flags whether pain was observed in the event.',
      }),
      picklistLocalField('Pain_Severity__c', 'Pain Severity', severityLevelValues, {
        description: 'Severity of pain observed during the event.',
      }),
      numberField('Temperature__c', 'Temperature', 4, 1, {
        description: 'Temperature captured during the event.',
      }),
      numberField('Pulse__c', 'Pulse', 4, 0, {
        description: 'Pulse captured during the event.',
      }),
      numberField('Respiration__c', 'Respiration', 4, 0, {
        description: 'Respiration captured during the event.',
      }),
      numberField('Weight__c', 'Weight', 6, 2, {
        description: 'Weight captured during the event.',
      }),
      numberField('Body_Condition_Score__c', 'Body Condition Score', 3, 1, {
        description: 'Body condition score captured during the event.',
      }),
      longTextField('Treatment_Given__c', 'Treatment Given', 32768, 4, {
        description: 'Treatment or intervention delivered during the event.',
      }),
      dateField('Next_Review_Date__c', 'Next Review Date', {
        description: 'Planned next clinical review date.',
      }),
      picklistGlobalField('Clinical_Priority__c', 'Clinical Priority', 'A360_Clinical_Priority', {
        description: 'Clinical priority assigned to the event.',
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Clinical Context',
        columns: [
          ['Name', 'Animal_Episode__c', 'Animal__c', 'Clinical_Event_Type__c', 'Clinical_DateTime__c'],
          ['Clinical_Priority__c', 'Related_Case__c', 'Clinician_Contact__c', 'Recorded_By__c', 'Next_Review_Date__c'],
        ],
      },
      {
        label: 'Clinical Findings',
        columns: [
          ['Problem_Code__c', 'Pain_Observed__c', 'Pain_Severity__c', 'Temperature__c', 'Pulse__c'],
          ['Respiration__c', 'Weight__c', 'Body_Condition_Score__c'],
        ],
      },
      {
        label: 'Clinical Narrative',
        columns: [['Problem_Summary__c'], ['Treatment_Given__c']],
      },
    ],
  },
  {
    apiName: 'Human_Animal_Interaction__c',
    label: 'Human Animal Interaction',
    pluralLabel: 'Human Animal Interactions',
    description: 'Historical human-animal interaction record linked to an animal and episode.',
    enableActivities: false,
    enableReports: true,
    sharingModel: 'ReadWrite',
    visibility: 'Public',
    nameField: { label: 'Human Animal Interaction Number', type: 'AutoNumber', displayFormat: 'HAI-{00000}' },
    fields: [
      lookupField('Animal_Episode__c', 'Animal Episode', 'Animal_Episode__c', 'Human Animal Interactions', 'Human_Animal_Interactions', {
        description: 'Episode linked to the interaction.',
      }),
      lookupField('Animal__c', 'Animal', 'Animal__c', 'Human Animal Interactions', 'Human_Animal_Interactions', {
        description: 'Animal linked redundantly for direct reporting.',
      }),
      lookupField('Interaction_Contact__c', 'Interaction Contact', 'Contact', 'Human Animal Interactions', 'Human_Animal_Interactions', {
        description: 'Optional external or internal contact who participated in the interaction.',
      }),
      lookupField('Recorded_By__c', 'Recorded By', 'User', 'Human Animal Interactions', 'Human_Animal_Interactions', {
        description: 'User who recorded the interaction.',
      }),
      dateTimeField('Interaction_DateTime__c', 'Interaction Date Time', {
        description: 'Date and time of the interaction.',
      }),
      picklistLocalField('Interaction_Type__c', 'Interaction Type', interactionTypeValues, {
        description: 'Type of interaction recorded.',
      }),
      picklistLocalField('Human_Role__c', 'Human Role', humanRoleValues, {
        description: 'Role of the human participant.',
      }),
      picklistGlobalField('Interaction_Quality__c', 'Interaction Quality', 'A360_Interaction_Quality', {
        description: 'Quality of the interaction from the handler perspective.',
      }),
      picklistGlobalField('Animal_Response__c', 'Animal Response', 'A360_Animal_Response', {
        description: 'Observed animal response during the interaction.',
      }),
      checkboxField('Reward_Used__c', 'Reward Used', false, {
        description: 'Indicates whether a reward was used in the interaction.',
      }),
      checkboxField('Restraint_Used__c', 'Restraint Used', false, {
        description: 'Indicates whether restraint was used in the interaction.',
      }),
      checkboxField('Aversive_Stimulus_Observed__c', 'Aversive Stimulus Observed', false, {
        description: 'Indicates whether an aversive stimulus was observed during the interaction.',
      }),
      longTextField('Notes__c', 'Notes', 32768, 4, {
        description: 'Narrative notes captured for the interaction.',
      }),
      checkboxField('Follow_Up_Required__c', 'Follow Up Required', false, {
        description: 'Flags whether the interaction requires follow-up.',
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Interaction Context',
        columns: [
          ['Name', 'Animal_Episode__c', 'Animal__c', 'Interaction_DateTime__c', 'Interaction_Type__c'],
          ['Human_Role__c', 'Interaction_Contact__c', 'Recorded_By__c', 'Follow_Up_Required__c'],
        ],
      },
      {
        label: 'Interaction Outcome',
        columns: [
          ['Interaction_Quality__c', 'Animal_Response__c', 'Reward_Used__c'],
          ['Restraint_Used__c', 'Aversive_Stimulus_Observed__c'],
        ],
      },
      {
        label: 'Notes',
        columns: [['Notes__c'], []],
      },
    ],
  },
];

const customTabs = [
  {
    apiName: 'Assessment_Template__c',
    motif: 'Custom17: Sprocket',
    description: 'Assessment Template navigation tab for Animal 360 Phase II template administration.',
  },
  {
    apiName: 'Welfare_Assessment__c',
    motif: 'Custom23: Pencil',
    description: 'Welfare Assessment navigation tab for Animal 360 Phase II evidence capture.',
  },
  {
    apiName: 'Care_Plan__c',
    motif: 'Custom18: Form',
    description: 'Care Plan navigation tab for Animal 360 Phase II interventions.',
  },
  {
    apiName: 'Clinical_Event__c',
    motif: 'Custom61: Ambulance',
    description: 'Clinical Event navigation tab for Animal 360 Phase II clinical records.',
  },
  {
    apiName: 'Human_Animal_Interaction__c',
    motif: 'Custom39: Telescope',
    description: 'Human Animal Interaction navigation tab for Animal 360 Phase II interaction records.',
  },
];

const customPermissions = [
  {
    apiName: 'A360_Manage_Assessment_Templates',
    label: 'Manage Assessment Templates',
    description: 'Allows a user to maintain Animal 360 assessment template runtime records and seed configuration.',
  },
  {
    apiName: 'A360_Welfare_Escalation_Override',
    label: 'Welfare Escalation Override',
    description: 'Allows a user to override default escalation or care-plan automation in Animal 360.',
  },
];

const customApp = {
  apiName: 'Animal_360',
  label: 'Animal 360',
  description: 'Animal 360 application updated for Phase II welfare evidence, care planning, and clinical operations.',
  defaultLandingTab: 'Animal__c',
  tabs: [
    'Animal__c',
    'Animal_Episode__c',
    'Housing_Unit__c',
    'Welfare_Assessment__c',
    'Care_Plan__c',
    'Clinical_Event__c',
    'Human_Animal_Interaction__c',
    'Assessment_Template__c',
    'Intake_Event__c',
    'Outcome_Event__c',
    'standard-Case',
    'standard-Report',
    'standard-Dashboard',
  ],
};

const episodeLayout = {
  apiName: 'Animal_Episode__c',
  label: 'Animal Episode',
  nameField: { label: 'Episode Number', type: 'AutoNumber', displayFormat: 'EP-{00000}' },
  layoutSections: [
    {
      label: 'Episode Details',
      columns: [
        ['Name', 'Animal__c', 'Episode_Type__c', 'Episode_Status__c', 'Is_Current__c'],
        ['Intake_DateTime__c', 'End_DateTime__c', 'Intake_Source__c', 'Outcome_Type__c'],
      ],
    },
    {
      label: 'Phase II Current State',
      columns: [
        ['Current_Location_Stay__c', 'Current_Welfare_Level__c', 'Current_Clinical_Priority__c'],
        ['Next_Review_Date__c', 'Outcome_Account__c', 'Outcome_Contact__c'],
      ],
    },
    {
      label: 'Episode Narrative',
      columns: [['Notes__c'], []],
    },
  ],
};

async function writeGlobalValueSets() {
  for (const valueSet of globalValueSets) {
    await writeXml(`force-app/main/default/globalValueSets/${valueSet.apiName}.globalValueSet-meta.xml`, buildGlobalValueSetXml(valueSet));
  }
}

async function writeCustomMetadataTypes() {
  for (const typeDef of cmdtTypes) {
    await writeXml(`force-app/main/default/objects/${typeDef.apiName}/${typeDef.apiName}.object-meta.xml`, buildCmdtObjectXml(typeDef));
    for (const field of typeDef.fields) {
      await writeXml(
        `force-app/main/default/objects/${typeDef.apiName}/fields/${field.apiName}.field-meta.xml`,
        buildFieldXml(field),
      );
    }
  }
}

async function writeCustomMetadataRecords() {
  for (const recordDef of customMetadataRecords) {
    const typePrefix = recordDef.typeApiName.replace(/__mdt$/, '');
    await writeXml(
      `force-app/main/default/customMetadata/${typePrefix}.${recordDef.recordName}.md-meta.xml`,
      buildCustomMetadataRecordXml(recordDef),
    );
  }
}

async function writeEpisodeFieldsAndLayout() {
  for (const field of episodeExtensionFields) {
    await writeXml(
      `force-app/main/default/objects/Animal_Episode__c/fields/${field.apiName}.field-meta.xml`,
      buildFieldXml(field),
    );
  }

  await writeXml(
    'force-app/main/default/layouts/Animal_Episode__c-Animal Episode Layout.layout-meta.xml',
    buildLayoutXml(episodeLayout),
  );
}

async function writeCustomObjects() {
  for (const objectDef of customObjects) {
    await writeXml(`force-app/main/default/objects/${objectDef.apiName}/${objectDef.apiName}.object-meta.xml`, buildObjectXml(objectDef));

    for (const field of objectDef.fields) {
      await writeXml(
        `force-app/main/default/objects/${objectDef.apiName}/fields/${field.apiName}.field-meta.xml`,
        buildFieldXml(field),
      );
    }

    for (const validationRule of objectDef.validations) {
      await writeXml(
        `force-app/main/default/objects/${objectDef.apiName}/validationRules/${validationRule.apiName}.validationRule-meta.xml`,
        buildValidationRuleXml(validationRule),
      );
    }

    await writeXml(
      `force-app/main/default/layouts/${objectDef.apiName}-${objectDef.label} Layout.layout-meta.xml`,
      buildLayoutXml(objectDef),
    );
  }
}

async function writeTabsAndApp() {
  for (const tab of customTabs) {
    await writeXml(`force-app/main/default/tabs/${tab.apiName}.tab-meta.xml`, buildCustomTabXml(tab));
  }

  await writeXml(`force-app/main/default/applications/${customApp.apiName}.app-meta.xml`, buildCustomAppXml(customApp));
}

async function writeCustomPermissions() {
  for (const customPermission of customPermissions) {
    await writeXml(
      `force-app/main/default/customPermissions/${customPermission.apiName}.customPermission-meta.xml`,
      buildCustomPermissionXml(customPermission),
    );
  }
}

async function writeManifest() {
  await writeXml('manifest/package.xml', buildManifestXml());
}

async function main() {
  await writeGlobalValueSets();
  await writeCustomMetadataTypes();
  await writeCustomMetadataRecords();
  await writeEpisodeFieldsAndLayout();
  await writeCustomObjects();
  await writeTabsAndApp();
  await writeCustomPermissions();
  await writeManifest();
  process.stdout.write('Phase II metadata foundation generated.\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
