import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function writeXml(relativePath, body) {
  const fullPath = path.join(rootDir, relativePath);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, xml(body), 'utf8');
}

function fieldPath(objectApiName, fieldApiName) {
  return `${objectApiName}.${fieldApiName}`;
}

function customReportTypeName(reportTypeApiName) {
  return `${reportTypeApiName}__c`;
}

function customReportField(rootObjectApiName, fieldApiName, relationshipApiName) {
  return relationshipApiName
    ? `${rootObjectApiName}.${relationshipApiName}$${fieldApiName}`
    : `${rootObjectApiName}$${fieldApiName}`;
}

async function collectFieldPaths(objectApiNames) {
  const fieldPaths = [];
  for (const objectApiName of objectApiNames) {
    const fieldsDir = path.join(
      rootDir,
      'force-app/main/default/objects',
      objectApiName,
      'fields',
    );
    try {
      const entries = await fs.readdir(fieldsDir);
      for (const entry of entries) {
        if (!entry.endsWith('.field-meta.xml')) {
          continue;
        }
        const fullPath = path.join(fieldsDir, entry);
        const contents = await fs.readFile(fullPath, 'utf8');
        if (
          contents.includes('<type>MasterDetail</type>') ||
          contents.includes('<required>true</required>')
        ) {
          continue;
        }
        fieldPaths.push(
          fieldPath(objectApiName, entry.replace('.field-meta.xml', '')),
        );
      }
    } catch {
      // Ignore objects without local field folders.
    }
  }
  return fieldPaths.sort();
}

async function collectApexClasses() {
  const classesDir = path.join(rootDir, 'force-app/main/default/classes');
  const entries = await fs.readdir(classesDir);
  return entries
    .filter((entry) => entry.endsWith('.cls'))
    .map((entry) => entry.replace('.cls', ''))
    .filter((className) => className.startsWith('A360') && !className.endsWith('Test'))
    .sort();
}

function buildPermissionSetXml(config) {
  const applicationVisibilities = config.applications
    .map(
      (application) => `    <applicationVisibilities>
        <application>${escapeXml(application)}</application>
        <visible>true</visible>
    </applicationVisibilities>`,
    )
    .join('\n');

  const classAccesses = config.classAccesses
    .map(
      (apexClass) => `    <classAccesses>
        <apexClass>${escapeXml(apexClass)}</apexClass>
        <enabled>true</enabled>
    </classAccesses>`,
    )
    .join('\n');

  const customPermissions = (config.customPermissions ?? [])
    .map(
      (customPermission) => `    <customPermissions>
        <enabled>true</enabled>
        <name>${escapeXml(customPermission)}</name>
    </customPermissions>`,
    )
    .join('\n');

  const fieldPermissions = config.fieldPermissions
    .map(
      (fieldPermission) => `    <fieldPermissions>
        <editable>${bool(fieldPermission.editable)}</editable>
        <field>${escapeXml(fieldPermission.field)}</field>
        <readable>${bool(fieldPermission.readable)}</readable>
    </fieldPermissions>`,
    )
    .join('\n');

  const flowAccesses = config.flowAccesses
    .map(
      (flowName) => `    <flowAccesses>
        <enabled>true</enabled>
        <flow>${escapeXml(flowName)}</flow>
    </flowAccesses>`,
    )
    .join('\n');

  const objectPermissions = config.objectPermissions
    .map(
      (item) => `    <objectPermissions>
        <allowCreate>${bool(item.allowCreate)}</allowCreate>
        <allowDelete>${bool(item.allowDelete)}</allowDelete>
        <allowEdit>${bool(item.allowEdit)}</allowEdit>
        <allowRead>${bool(item.allowRead)}</allowRead>
        <modifyAllRecords>${bool(item.modifyAllRecords)}</modifyAllRecords>
        <object>${escapeXml(item.object)}</object>
        <viewAllRecords>${bool(item.viewAllRecords)}</viewAllRecords>
    </objectPermissions>`,
    )
    .join('\n');

  const tabSettings = config.tabs
    .map(
      (tabName) => `    <tabSettings>
        <tab>${escapeXml(tabName)}</tab>
        <visibility>Visible</visibility>
    </tabSettings>`,
    )
    .join('\n');

  const userPermissions = config.userPermissions
    .map(
      (permissionName) => `    <userPermissions>
        <enabled>true</enabled>
        <name>${escapeXml(permissionName)}</name>
    </userPermissions>`,
    )
    .join('\n');

  return `<PermissionSet xmlns="${XMLNS}">
${applicationVisibilities}
${classAccesses}
${customPermissions}
    <description>${escapeXml(config.description)}</description>
${fieldPermissions}
${flowAccesses}
    <label>${escapeXml(config.label)}</label>
${objectPermissions}
${tabSettings}
${userPermissions}
</PermissionSet>`;
}

function buildReportFolderXml(folder) {
  return `<ReportFolder xmlns="${XMLNS}">
    <accessType>Public</accessType>
    <fullName>${escapeXml(folder.apiName)}</fullName>
    <name>${escapeXml(folder.label)}</name>
    <publicFolderAccess>ReadOnly</publicFolderAccess>
</ReportFolder>`;
}

function buildReportTypeXml(reportType) {
  const joinXml = reportType.join
    ? `    <join>
        <outerJoin>${bool(reportType.join.outerJoin)}</outerJoin>
        <relationship>${escapeXml(reportType.join.relationship)}</relationship>
    </join>`
    : '';

  const sectionsXml = reportType.sections
    .map((section) => {
      const columnsXml = section.fields
        .map(
          (fieldApiName) => `        <columns>
            <checkedByDefault>true</checkedByDefault>
            <field>${escapeXml(fieldApiName)}</field>
            <table>${escapeXml(section.table)}</table>
        </columns>`,
        )
        .join('\n');
      return `    <sections>
${columnsXml}
        <masterLabel>${escapeXml(section.label)}</masterLabel>
    </sections>`;
    })
    .join('\n');

  return `<ReportType xmlns="${XMLNS}">
    <baseObject>${escapeXml(reportType.baseObject)}</baseObject>
    <category>other</category>
    <deployed>true</deployed>
    <description>${escapeXml(reportType.description)}</description>
    <fullName>${escapeXml(reportType.apiName)}</fullName>
${joinXml}
    <label>${escapeXml(reportType.label)}</label>
${sectionsXml}
</ReportType>`;
}

function buildReportXml(reportDef, folderApiName) {
  const columnsXml = reportDef.columns
    .map(
      (fieldApiName) => `    <columns>
        <field>${escapeXml(fieldApiName)}</field>
    </columns>`,
    )
    .join('\n');

  const filterItemsXml = reportDef.filters
    .map(
      (filter) => `        <criteriaItems>
            <column>${escapeXml(filter.column)}</column>
            <operator>${escapeXml(filter.operator)}</operator>
            <value>${escapeXml(filter.value)}</value>
        </criteriaItems>`,
    )
    .join('\n');

  const filterXml =
    reportDef.filters.length > 0
      ? `    <filter>
        <booleanFilter>${reportDef.booleanFilter ?? reportDef.filters.map((_, index) => index + 1).join(' AND ')}</booleanFilter>
${filterItemsXml}
    </filter>`
      : '';

  const reportTypeApiNameXml = reportDef.reportTypeApiName
    ? `    <reportTypeApiName>${escapeXml(reportDef.reportTypeApiName)}</reportTypeApiName>`
    : '';

  const sortXml = reportDef.sortColumn
    ? `    <sortColumn>${escapeXml(reportDef.sortColumn)}</sortColumn>
    <sortOrder>Asc</sortOrder>`
    : '';

  return `<Report xmlns="${XMLNS}">
${columnsXml}
    <description>${escapeXml(reportDef.description)}</description>
${filterXml}
    <folderName>${escapeXml(folderApiName)}</folderName>
    <format>Tabular</format>
    <name>${escapeXml(reportDef.label)}</name>
    <reportType>${escapeXml(reportDef.reportType)}</reportType>
${reportTypeApiNameXml}
    <scope>organization</scope>
    <showDetails>true</showDetails>
    <showGrandTotal>false</showGrandTotal>
    <showSubTotals>false</showSubTotals>
${sortXml}
</Report>`;
}

const phase1Objects = [
  'Animal__c',
  'Animal_Identifier__c',
  'Animal_Relationship__c',
  'Animal_Episode__c',
  'Housing_Unit__c',
  'Animal_Location_Stay__c',
  'Intake_Event__c',
  'Outcome_Event__c',
  'Account',
  'Contact',
  'Case',
];

const phase2Objects = [
  'Assessment_Template__c',
  'Template_Domain_Definition__c',
  'Template_Indicator_Assignment__c',
  'Welfare_Assessment__c',
  'Welfare_Domain_Summary__c',
  'Welfare_Observation__c',
  'Care_Plan__c',
  'Care_Plan_Action__c',
  'Clinical_Event__c',
  'Human_Animal_Interaction__c',
];

const allObjects = [...phase1Objects, ...phase2Objects];

const adminOnlyFieldPaths = new Set([
  fieldPath('Assessment_Template__c', 'Default_Context_Key__c'),
  fieldPath('Assessment_Template__c', 'Metadata_Template_Key__c'),
  fieldPath('Assessment_Template__c', 'Is_Managed_Seed__c'),
  fieldPath('Assessment_Template__c', 'Seed_Last_Synced_On__c'),
  fieldPath('Template_Domain_Definition__c', 'Metadata_Row_Key__c'),
  fieldPath('Template_Indicator_Assignment__c', 'Metadata_Row_Key__c'),
  fieldPath('Welfare_Domain_Summary__c', 'Assessment_Domain_Key__c'),
  fieldPath('Welfare_Observation__c', 'Observation_Key__c'),
  fieldPath('Welfare_Assessment__c', 'Template_Code_Snapshot__c'),
  fieldPath('Welfare_Assessment__c', 'Template_Version_Snapshot__c'),
  fieldPath('Welfare_Assessment__c', 'Template_Key_Snapshot__c'),
  fieldPath('Welfare_Assessment__c', 'Risk_Evaluated_On__c'),
]);

const systemManagedFieldPaths = new Set([
  fieldPath('Animal__c', 'Current_Episode__c'),
  fieldPath('Animal__c', 'Current_Housing_Unit__c'),
  fieldPath('Animal__c', 'Current_Status__c'),
  fieldPath('Animal__c', 'Current_Care_Status__c'),
  fieldPath('Animal__c', 'Current_Welfare_Risk__c'),
  fieldPath('Animal_Episode__c', 'Current_Location_Stay__c'),
  fieldPath('Animal_Episode__c', 'Is_Current__c'),
  fieldPath('Animal_Episode__c', 'Current_Welfare_Level__c'),
  fieldPath('Animal_Episode__c', 'Current_Clinical_Priority__c'),
  fieldPath('Animal_Episode__c', 'Next_Review_Date__c'),
  fieldPath('Animal_Location_Stay__c', 'Is_Current__c'),
  fieldPath('Welfare_Assessment__c', 'Completeness__c'),
  fieldPath('Welfare_Assessment__c', 'Overall_Welfare_Concern__c'),
  fieldPath('Welfare_Assessment__c', 'Next_Review_Date__c'),
  fieldPath('Care_Plan__c', 'Auto_Created__c'),
  fieldPath('Care_Plan_Action__c', 'Completed_On__c'),
]);

const existingPhase1Flows = [
  'A360_Animal_Current_State_Rollup_Flow',
  'A360_Episode_Current_State_Trigger_Flow',
  'A360_Location_Stay_Current_State_Trigger_Flow',
  'A360_Intake_Flow',
  'A360_Move_Animal_Flow',
  'A360_Close_Episode_Flow',
];

const phase2AutomationFlows = [
  'A360_Welfare_Assessment_Flow',
  'A360_Assessment_Risk_Evaluation_Flow',
  'A360_Create_Care_Plan_Flow',
  'A360_Care_Plan_Auto_Create_Flow',
  'A360_Review_Due_Reminder_Flow',
];

const launchableOperationalFlows = [
  ...existingPhase1Flows.filter((item) => !item.includes('Trigger')),
  ...phase2AutomationFlows,
];

const reportFolder = {
  apiName: 'Animal_360',
  label: 'Animal 360',
};

const reportTypes = [
  {
    apiName: 'Animal_Episode_with_Welfare_Assessments',
    label: 'Animal Episodes with Welfare Assessments',
    description: 'Phase II report type for episode and welfare assessment reporting.',
    baseObject: 'Animal_Episode__c',
    join: { outerJoin: true, relationship: 'Welfare_Assessments__r' },
    sections: [
      {
        label: 'Animal Episode',
        table: 'Animal_Episode__c',
        fields: ['Name', 'Animal__c', 'Episode_Status__c', 'Current_Welfare_Level__c', 'Next_Review_Date__c'],
      },
      {
        label: 'Welfare Assessments',
        table: 'Animal_Episode__c.Welfare_Assessments__r',
        fields: [
          'Name',
          'Assessment_DateTime__c',
          'Assessment_Status__c',
          'Overall_Welfare_Concern__c',
          'Immediate_Action_Required__c',
          'Next_Review_Date__c',
          'Overall_Negative_Grade__c',
          'Overall_Positive_Grade__c',
        ],
      },
    ],
  },
  {
    apiName: 'Welfare_Assessment_with_Observations',
    label: 'Welfare Assessments with Observations',
    description: 'Phase II report type for assessment and observation reporting.',
    baseObject: 'Welfare_Assessment__c',
    join: { outerJoin: true, relationship: 'Observations__r' },
    sections: [
      {
        label: 'Welfare Assessment',
        table: 'Welfare_Assessment__c',
        fields: ['Name', 'Assessment_DateTime__c', 'Overall_Welfare_Concern__c', 'Immediate_Action_Required__c', 'Animal__c'],
      },
      {
        label: 'Observations',
        table: 'Welfare_Assessment__c.Observations__r',
        fields: ['Name', 'Domain_Code__c', 'Indicator_Key__c', 'Severity_Level__c', 'Requires_Intervention__c'],
      },
    ],
  },
  {
    apiName: 'Animal_Episode_with_Care_Plans',
    label: 'Animal Episodes with Care Plans',
    description: 'Phase II report type for episode and care plan reporting.',
    baseObject: 'Animal_Episode__c',
    join: { outerJoin: true, relationship: 'Care_Plans__r' },
    sections: [
      {
        label: 'Animal Episode',
        table: 'Animal_Episode__c',
        fields: ['Name', 'Animal__c', 'Episode_Status__c', 'Current_Welfare_Level__c'],
      },
      {
        label: 'Care Plans',
        table: 'Animal_Episode__c.Care_Plans__r',
        fields: ['Name', 'Plan_Type__c', 'Status__c', 'Target_Review_Date__c', 'Owner_User__c'],
      },
    ],
  },
  {
    apiName: 'Animal_Episode_with_Clinical_Events',
    label: 'Animal Episodes with Clinical Events',
    description: 'Phase II report type for episode and clinical event reporting.',
    baseObject: 'Animal_Episode__c',
    join: { outerJoin: true, relationship: 'Clinical_Events__r' },
    sections: [
      {
        label: 'Animal Episode',
        table: 'Animal_Episode__c',
        fields: ['Name', 'Animal__c', 'Episode_Status__c', 'Current_Clinical_Priority__c'],
      },
      {
        label: 'Clinical Events',
        table: 'Animal_Episode__c.Clinical_Events__r',
        fields: ['Name', 'Clinical_DateTime__c', 'Clinical_Event_Type__c', 'Clinical_Priority__c', 'Next_Review_Date__c'],
      },
    ],
  },
  {
    apiName: 'Animal_Episode_with_Human_Animal_Interactions',
    label: 'Animal Episodes with Human Animal Interactions',
    description: 'Phase II report type for episode and interaction reporting.',
    baseObject: 'Animal_Episode__c',
    join: { outerJoin: true, relationship: 'Human_Animal_Interactions__r' },
    sections: [
      {
        label: 'Animal Episode',
        table: 'Animal_Episode__c',
        fields: ['Name', 'Animal__c', 'Episode_Status__c'],
      },
      {
        label: 'Interactions',
        table: 'Animal_Episode__c.Human_Animal_Interactions__r',
        fields: ['Name', 'Interaction_DateTime__c', 'Interaction_Type__c', 'Interaction_Quality__c', 'Animal_Response__c'],
      },
    ],
  },
];

const reports = [
  {
    apiName: 'Welfare_Assessments_by_Concern_Level',
    label: 'Welfare Assessments by Concern',
    description: 'Phase II report showing welfare assessments by assessed concern level.',
    reportType: customReportTypeName('Animal_Episode_with_Welfare_Assessments'),
    columns: [
      customReportField('Animal_Episode__c', 'Animal__c'),
      customReportField('Animal_Episode__c', 'Episode_Status__c'),
      customReportField('Animal_Episode__c', 'Name', 'Welfare_Assessments__r'),
      customReportField(
        'Animal_Episode__c',
        'Assessment_DateTime__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Overall_Welfare_Concern__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Immediate_Action_Required__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Next_Review_Date__c',
        'Welfare_Assessments__r',
      ),
    ],
    filters: [],
    sortColumn: customReportField(
      'Animal_Episode__c',
      'Assessment_DateTime__c',
      'Welfare_Assessments__r',
    ),
  },
  {
    apiName: 'High_and_Critical_Cases_Requiring_Action',
    label: 'Cases Requiring Action',
    description: 'Phase II report listing welfare assessments that require immediate action.',
    reportType: customReportTypeName('Animal_Episode_with_Welfare_Assessments'),
    columns: [
      customReportField('Animal_Episode__c', 'Animal__c'),
      customReportField('Animal_Episode__c', 'Episode_Status__c'),
      customReportField('Animal_Episode__c', 'Name', 'Welfare_Assessments__r'),
      customReportField(
        'Animal_Episode__c',
        'Overall_Welfare_Concern__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Immediate_Action_Required__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Next_Review_Date__c',
        'Welfare_Assessments__r',
      ),
    ],
    filters: [
      {
        column: customReportField(
          'Animal_Episode__c',
          'Immediate_Action_Required__c',
          'Welfare_Assessments__r',
        ),
        operator: 'equals',
        value: 'true',
      },
    ],
    sortColumn: customReportField(
      'Animal_Episode__c',
      'Next_Review_Date__c',
      'Welfare_Assessments__r',
    ),
  },
  {
    apiName: 'Welfare_Trend_by_Animal',
    label: 'Welfare Trend by Animal',
    description: 'Phase II report showing welfare assessments over time by animal.',
    reportType: customReportTypeName('Animal_Episode_with_Welfare_Assessments'),
    columns: [
      customReportField('Animal_Episode__c', 'Animal__c'),
      customReportField(
        'Animal_Episode__c',
        'Assessment_DateTime__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Overall_Welfare_Concern__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Overall_Negative_Grade__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Overall_Positive_Grade__c',
        'Welfare_Assessments__r',
      ),
    ],
    filters: [],
    sortColumn: customReportField('Animal_Episode__c', 'Animal__c'),
  },
  {
    apiName: 'Assessments_Overdue_for_Review',
    label: 'Assessments Overdue',
    description: 'Phase II report listing completed assessments whose next review date is overdue.',
    reportType: customReportTypeName('Animal_Episode_with_Welfare_Assessments'),
    columns: [
      customReportField('Animal_Episode__c', 'Animal__c'),
      customReportField('Animal_Episode__c', 'Episode_Status__c'),
      customReportField('Animal_Episode__c', 'Name', 'Welfare_Assessments__r'),
      customReportField(
        'Animal_Episode__c',
        'Assessment_Status__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Overall_Welfare_Concern__c',
        'Welfare_Assessments__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Next_Review_Date__c',
        'Welfare_Assessments__r',
      ),
    ],
    filters: [
      {
        column: customReportField(
          'Animal_Episode__c',
          'Assessment_Status__c',
          'Welfare_Assessments__r',
        ),
        operator: 'equals',
        value: 'Completed',
      },
      {
        column: customReportField(
          'Animal_Episode__c',
          'Next_Review_Date__c',
          'Welfare_Assessments__r',
        ),
        operator: 'lessThan',
        value: 'TODAY',
      },
    ],
    booleanFilter: '1 AND 2',
    sortColumn: customReportField(
      'Animal_Episode__c',
      'Next_Review_Date__c',
      'Welfare_Assessments__r',
    ),
  },
  {
    apiName: 'Open_Care_Plans_by_Type',
    label: 'Open Care Plans by Type',
    description: 'Phase II report showing currently open care plans by plan type.',
    reportType: customReportTypeName('Animal_Episode_with_Care_Plans'),
    columns: [
      customReportField('Animal_Episode__c', 'Animal__c'),
      customReportField('Animal_Episode__c', 'Episode_Status__c'),
      customReportField('Animal_Episode__c', 'Name', 'Care_Plans__r'),
      customReportField('Animal_Episode__c', 'Plan_Type__c', 'Care_Plans__r'),
      customReportField('Animal_Episode__c', 'Status__c', 'Care_Plans__r'),
      customReportField(
        'Animal_Episode__c',
        'Target_Review_Date__c',
        'Care_Plans__r',
      ),
      customReportField('Animal_Episode__c', 'Owner_User__c', 'Care_Plans__r'),
    ],
    filters: [
      {
        column: customReportField('Animal_Episode__c', 'Status__c', 'Care_Plans__r'),
        operator: 'notEqual',
        value: 'Completed',
      },
      {
        column: customReportField('Animal_Episode__c', 'Status__c', 'Care_Plans__r'),
        operator: 'notEqual',
        value: 'Cancelled',
      },
    ],
    booleanFilter: '1 AND 2',
    sortColumn: customReportField(
      'Animal_Episode__c',
      'Target_Review_Date__c',
      'Care_Plans__r',
    ),
  },
  {
    apiName: 'Clinical_Events_by_Priority',
    label: 'Clinical Events by Priority',
    description: 'Phase II report showing clinical events ordered by clinical priority.',
    reportType: 'CustomEntity$Clinical_Event__c',
    reportTypeApiName: 'CustomEntity$Clinical_Event__c',
    columns: [
      'CUST_NAME',
      'Clinical_Event__c.Animal__c',
      'Clinical_Event__c.Clinical_DateTime__c',
      'Clinical_Event__c.Clinical_Priority__c',
      'Clinical_Event__c.Clinical_Event_Type__c',
      'Clinical_Event__c.Next_Review_Date__c',
    ],
    filters: [],
    sortColumn: 'Clinical_Event__c.Clinical_DateTime__c',
  },
  {
    apiName: 'Interactions_by_Response_Pattern',
    label: 'Interactions by Response Pattern',
    description: 'Phase II report showing interaction outcomes and response patterns.',
    reportType: customReportTypeName('Animal_Episode_with_Human_Animal_Interactions'),
    columns: [
      customReportField('Animal_Episode__c', 'Animal__c'),
      customReportField('Animal_Episode__c', 'Episode_Status__c'),
      customReportField(
        'Animal_Episode__c',
        'Name',
        'Human_Animal_Interactions__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Interaction_DateTime__c',
        'Human_Animal_Interactions__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Interaction_Type__c',
        'Human_Animal_Interactions__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Interaction_Quality__c',
        'Human_Animal_Interactions__r',
      ),
      customReportField(
        'Animal_Episode__c',
        'Animal_Response__c',
        'Human_Animal_Interactions__r',
      ),
    ],
    filters: [],
    sortColumn: customReportField(
      'Animal_Episode__c',
      'Interaction_DateTime__c',
      'Human_Animal_Interactions__r',
    ),
  },
];

function objectPermission(object, allowCreate, allowEdit, allowDelete, viewAllRecords, modifyAllRecords) {
  return {
    object,
    allowCreate,
    allowEdit,
    allowDelete,
    allowRead: true,
    viewAllRecords,
    modifyAllRecords,
  };
}

function buildFieldPermissions(allFieldPaths, readableObjects, editableObjects) {
  const readableObjectSet = new Set(readableObjects);
  const editableObjectSet = new Set(editableObjects);

  return allFieldPaths
    .filter((item) => readableObjectSet.has(item.split('.')[0]))
    .filter((item) => !(!editableObjectSet.has(item.split('.')[0]) && adminOnlyFieldPaths.has(item)))
    .filter((item) => readableObjectSet.has(item.split('.')[0]) && !(adminOnlyFieldPaths.has(item) && !editableObjectSet.has(item.split('.')[0]) && !editableObjectSet.has('ADMIN_INTERNAL')))
    .map((item) => ({
      field: item,
      readable: true,
      editable:
        editableObjectSet.has(item.split('.')[0]) &&
        !systemManagedFieldPaths.has(item) &&
        !adminOnlyFieldPaths.has(item),
    }));
}

async function main() {
  const allFieldPaths = await collectFieldPaths(allObjects);
  const allApexClasses = await collectApexClasses();

  const adminObjects = allObjects;
  const careManagerEditableObjects = [
    ...phase1Objects,
    'Welfare_Assessment__c',
    'Welfare_Domain_Summary__c',
    'Welfare_Observation__c',
    'Care_Plan__c',
    'Care_Plan_Action__c',
    'Human_Animal_Interaction__c',
  ];
  const careManagerReadableObjects = [
    ...careManagerEditableObjects,
    'Assessment_Template__c',
    'Template_Domain_Definition__c',
    'Template_Indicator_Assignment__c',
    'Clinical_Event__c',
  ];
  const readOnlyObjects = allObjects;
  const assessorEditableObjects = [
    'Welfare_Assessment__c',
    'Welfare_Domain_Summary__c',
    'Welfare_Observation__c',
    'Human_Animal_Interaction__c',
  ];
  const assessorReadableObjects = [
    ...phase1Objects,
    'Assessment_Template__c',
    'Template_Domain_Definition__c',
    'Template_Indicator_Assignment__c',
    'Welfare_Assessment__c',
    'Welfare_Domain_Summary__c',
    'Welfare_Observation__c',
    'Care_Plan__c',
    'Care_Plan_Action__c',
    'Clinical_Event__c',
    'Human_Animal_Interaction__c',
  ];
  const clinicalEditableObjects = [
    'Clinical_Event__c',
    'Care_Plan_Action__c',
  ];
  const clinicalReadableObjects = [
    ...phase1Objects,
    'Assessment_Template__c',
    'Welfare_Assessment__c',
    'Welfare_Domain_Summary__c',
    'Welfare_Observation__c',
    'Care_Plan__c',
    'Care_Plan_Action__c',
    'Clinical_Event__c',
    'Human_Animal_Interaction__c',
  ];

  const permissionSets = [
    {
      apiName: 'Animal360_Admin',
      label: 'Animal360 Admin',
      description: 'Administrative Phase I and Phase II access for Animal 360.',
      applications: ['Animal_360'],
      classAccesses: allApexClasses,
      customPermissions: [
        'A360_Manage_Assessment_Templates',
        'A360_Welfare_Escalation_Override',
      ],
      fieldPermissions: allFieldPaths.map((item) => ({
        field: item,
        readable: true,
        editable: true,
      })),
      flowAccesses: [...existingPhase1Flows, ...phase2AutomationFlows],
      objectPermissions: [
        ...phase1Objects
          .filter((item) => !['Account', 'Contact', 'Case'].includes(item))
          .map((item) => objectPermission(item, true, true, true, true, true)),
        ...phase2Objects.map((item) => objectPermission(item, true, true, true, true, true)),
        objectPermission('Account', true, true, true, true, false),
        objectPermission('Contact', true, true, true, true, false),
        objectPermission('Case', true, true, true, true, false),
      ],
      tabs: [
        'Animal__c',
        'Animal_Episode__c',
        'Housing_Unit__c',
        'Intake_Event__c',
        'Outcome_Event__c',
        'Assessment_Template__c',
        'Welfare_Assessment__c',
        'Care_Plan__c',
        'Clinical_Event__c',
        'Human_Animal_Interaction__c',
      ],
      userPermissions: ['RunFlow', 'RunReports'],
    },
    {
      apiName: 'Animal360_Care_Manager',
      label: 'Animal360 Care Manager',
      description: 'Operational Phase I and Phase II access for care, welfare, and intervention workflows.',
      applications: ['Animal_360'],
      classAccesses: [
        'A360AnimalRollupService',
        'A360AssessmentTemplateService',
        'A360AssessmentPersistenceService',
        'A360AssessmentRiskService',
        'A360CarePlanService',
        'A360ReviewReminderService',
      ],
      customPermissions: ['A360_Welfare_Escalation_Override'],
      fieldPermissions: buildFieldPermissions(
        allFieldPaths.filter((item) => !adminOnlyFieldPaths.has(item)),
        careManagerReadableObjects,
        careManagerEditableObjects,
      ),
      flowAccesses: launchableOperationalFlows,
      objectPermissions: [
        ...phase1Objects.map((item) =>
          objectPermission(item, true, true, false, true, false),
        ),
        objectPermission('Assessment_Template__c', false, false, false, true, false),
        objectPermission('Template_Domain_Definition__c', false, false, false, true, false),
        objectPermission('Template_Indicator_Assignment__c', false, false, false, true, false),
        objectPermission('Welfare_Assessment__c', true, true, false, true, false),
        objectPermission('Welfare_Domain_Summary__c', true, true, false, true, false),
        objectPermission('Welfare_Observation__c', true, true, false, true, false),
        objectPermission('Care_Plan__c', true, true, false, true, false),
        objectPermission('Care_Plan_Action__c', true, true, false, true, false),
        objectPermission('Clinical_Event__c', false, false, false, true, false),
        objectPermission('Human_Animal_Interaction__c', true, true, false, true, false),
      ],
      tabs: [
        'Animal__c',
        'Animal_Episode__c',
        'Housing_Unit__c',
        'Intake_Event__c',
        'Outcome_Event__c',
        'Welfare_Assessment__c',
        'Care_Plan__c',
        'Clinical_Event__c',
        'Human_Animal_Interaction__c',
      ],
      userPermissions: ['RunFlow', 'RunReports'],
    },
    {
      apiName: 'Animal360_Read_Only',
      label: 'Animal360 Read Only',
      description: 'Read-only Phase I and Phase II reporting and lookup access for Animal 360.',
      applications: ['Animal_360'],
      classAccesses: [],
      customPermissions: [],
      fieldPermissions: buildFieldPermissions(
        allFieldPaths.filter((item) => !adminOnlyFieldPaths.has(item)),
        readOnlyObjects,
        [],
      ),
      flowAccesses: [],
      objectPermissions: readOnlyObjects.map((item) =>
        objectPermission(item, false, false, false, true, false),
      ),
      tabs: [
        'Animal__c',
        'Animal_Episode__c',
        'Housing_Unit__c',
        'Intake_Event__c',
        'Outcome_Event__c',
        'Welfare_Assessment__c',
        'Care_Plan__c',
        'Clinical_Event__c',
        'Human_Animal_Interaction__c',
      ],
      userPermissions: ['RunReports'],
    },
    {
      apiName: 'Animal360_Assessor',
      label: 'Animal360 Assessor',
      description: 'Assessment-entry access for Phase II welfare evidence capture.',
      applications: ['Animal_360'],
      classAccesses: [
        'A360AssessmentTemplateService',
        'A360AssessmentPersistenceService',
        'A360AssessmentRiskService',
        'A360CarePlanService',
      ],
      customPermissions: [],
      fieldPermissions: buildFieldPermissions(
        allFieldPaths.filter((item) => !adminOnlyFieldPaths.has(item)),
        assessorReadableObjects,
        assessorEditableObjects,
      ),
      flowAccesses: [
        'A360_Welfare_Assessment_Flow',
        'A360_Assessment_Risk_Evaluation_Flow',
      ],
      objectPermissions: [
        ...phase1Objects.map((item) =>
          objectPermission(item, false, false, false, true, false),
        ),
        objectPermission('Assessment_Template__c', false, false, false, true, false),
        objectPermission('Template_Domain_Definition__c', false, false, false, true, false),
        objectPermission('Template_Indicator_Assignment__c', false, false, false, true, false),
        objectPermission('Welfare_Assessment__c', true, true, false, true, false),
        objectPermission('Welfare_Domain_Summary__c', true, true, false, true, false),
        objectPermission('Welfare_Observation__c', true, true, false, true, false),
        objectPermission('Care_Plan__c', false, false, false, true, false),
        objectPermission('Care_Plan_Action__c', false, false, false, true, false),
        objectPermission('Clinical_Event__c', false, false, false, true, false),
        objectPermission('Human_Animal_Interaction__c', true, true, false, true, false),
      ],
      tabs: [
        'Animal__c',
        'Animal_Episode__c',
        'Welfare_Assessment__c',
        'Care_Plan__c',
        'Human_Animal_Interaction__c',
      ],
      userPermissions: ['RunFlow', 'RunReports'],
    },
    {
      apiName: 'Animal360_Clinical_User',
      label: 'Animal360 Clinical User',
      description: 'Clinical-event and follow-up access for Phase II clinical workflows.',
      applications: ['Animal_360'],
      classAccesses: [
        'A360AssessmentTemplateService',
        'A360AssessmentRiskService',
        'A360CarePlanService',
        'A360ReviewReminderService',
      ],
      customPermissions: [],
      fieldPermissions: buildFieldPermissions(
        allFieldPaths.filter((item) => !adminOnlyFieldPaths.has(item)),
        clinicalReadableObjects,
        clinicalEditableObjects,
      ),
      flowAccesses: [
        'A360_Assessment_Risk_Evaluation_Flow',
        'A360_Create_Care_Plan_Flow',
        'A360_Care_Plan_Auto_Create_Flow',
        'A360_Review_Due_Reminder_Flow',
      ],
      objectPermissions: [
        ...phase1Objects.map((item) =>
          objectPermission(item, false, false, false, true, false),
        ),
        objectPermission('Assessment_Template__c', false, false, false, true, false),
        objectPermission('Welfare_Assessment__c', false, false, false, true, false),
        objectPermission('Welfare_Domain_Summary__c', false, false, false, true, false),
        objectPermission('Welfare_Observation__c', false, false, false, true, false),
        objectPermission('Care_Plan__c', false, false, false, true, false),
        objectPermission('Care_Plan_Action__c', true, true, false, true, false),
        objectPermission('Clinical_Event__c', true, true, false, true, false),
        objectPermission('Human_Animal_Interaction__c', false, false, false, true, false),
      ],
      tabs: [
        'Animal__c',
        'Animal_Episode__c',
        'Welfare_Assessment__c',
        'Care_Plan__c',
        'Clinical_Event__c',
      ],
      userPermissions: ['RunFlow', 'RunReports'],
    },
  ];

  for (const permissionSet of permissionSets) {
    await writeXml(
      `force-app/main/default/permissionsets/${permissionSet.apiName}.permissionset-meta.xml`,
      buildPermissionSetXml(permissionSet),
    );
  }

  await writeXml(
    `force-app/main/default/reports/${reportFolder.apiName}.reportFolder-meta.xml`,
    buildReportFolderXml(reportFolder),
  );

  for (const reportType of reportTypes) {
    await writeXml(
      `force-app/main/default/reportTypes/${reportType.apiName}.reportType-meta.xml`,
      buildReportTypeXml(reportType),
    );
  }

  for (const report of reports) {
    await writeXml(
      `force-app/main/default/reports/${reportFolder.apiName}/${report.apiName}.report-meta.xml`,
      buildReportXml(report, reportFolder.apiName),
    );
  }

  process.stdout.write('Phase II security and reporting metadata generated.\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
