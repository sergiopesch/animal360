import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_VERSION = '66.0';
const XMLNS = 'http://soap.sforce.com/2006/04/metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultDir = path.join(rootDir, 'force-app', 'main', 'default');

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
  return fullPath;
}

async function writeXml(relativePath, body) {
  return writeText(relativePath, xml(body));
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

function dateField(apiName, label, options = {}) {
  return { kind: 'Date', apiName, label, ...options };
}

function dateTimeField(apiName, label, options = {}) {
  return { kind: 'DateTime', apiName, label, ...options };
}

function checkboxField(apiName, label, defaultValue, options = {}) {
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

function fieldPath(objectApiName, fieldApiName) {
  return `${objectApiName}.${fieldApiName}`;
}

const globalValueSets = [
  {
    apiName: 'A360_Species',
    label: 'Animal Species',
    values: [
      picklistValue('Dog'),
      picklistValue('Cat'),
      picklistValue('Rabbit'),
      picklistValue('Bird'),
      picklistValue('Small Mammal'),
      picklistValue('Reptile'),
      picklistValue('Livestock'),
      picklistValue('Wildlife'),
      picklistValue('Other'),
    ],
  },
  {
    apiName: 'A360_Sex',
    label: 'Sex',
    values: [
      picklistValue('Female'),
      picklistValue('Male'),
      picklistValue('Intersex'),
      picklistValue('Unknown'),
    ],
  },
  {
    apiName: 'A360_Reproductive_Status',
    label: 'Reproductive Status',
    values: [
      picklistValue('Entire'),
      picklistValue('Neutered'),
      picklistValue('Spayed'),
      picklistValue('Pregnant'),
      picklistValue('Lactating'),
      picklistValue('Unknown'),
    ],
  },
  {
    apiName: 'A360_Episode_Type',
    label: 'Episode Type',
    values: [
      picklistValue('Intake'),
      picklistValue('Shelter Care'),
      picklistValue('Foster Care'),
      picklistValue('Medical'),
      picklistValue('Behaviour'),
      picklistValue('Transfer'),
      picklistValue('Other'),
    ],
  },
  {
    apiName: 'A360_Outcome_Type',
    label: 'Outcome Type',
    values: [
      picklistValue('Adopted'),
      picklistValue('Returned to Owner'),
      picklistValue('Transferred'),
      picklistValue('Foster Placement'),
      picklistValue('Released'),
      picklistValue('Euthanised'),
      picklistValue('Deceased'),
      picklistValue('Other'),
    ],
  },
  {
    apiName: 'A360_Housing_Type',
    label: 'Housing Type',
    values: [
      picklistValue('Kennel'),
      picklistValue('Cattery'),
      picklistValue('Foster Home'),
      picklistValue('Isolation'),
      picklistValue('Stall'),
      picklistValue('Pasture'),
      picklistValue('Aquarium'),
      picklistValue('Other'),
    ],
  },
  {
    apiName: 'A360_Welfare_Risk',
    label: 'Welfare Risk',
    values: [
      picklistValue('Low'),
      picklistValue('Moderate'),
      picklistValue('High'),
      picklistValue('Critical'),
    ],
  },
];

const partnerTypeValues = [
  picklistValue('Shelter'),
  picklistValue('Rescue'),
  picklistValue('Veterinary Clinic'),
  picklistValue('Foster Network'),
  picklistValue('Council'),
  picklistValue('Transport'),
  picklistValue('Owner'),
  picklistValue('Adopter'),
  picklistValue('Other'),
];

const contactRoleValues = [
  picklistValue('Primary Contact'),
  picklistValue('Foster Carer'),
  picklistValue('Veterinarian'),
  picklistValue('Transporter'),
  picklistValue('Owner'),
  picklistValue('Adopter'),
  picklistValue('Other'),
];

const contactChannelValues = [
  picklistValue('Phone'),
  picklistValue('Email'),
  picklistValue('SMS'),
  picklistValue('Other'),
];

const caseContextValues = [
  picklistValue('General Care'),
  picklistValue('Medical'),
  picklistValue('Behaviour'),
  picklistValue('Housing'),
  picklistValue('Outcome'),
  picklistValue('Other'),
];

const identifierTypeValues = [
  picklistValue('Shelter ID'),
  picklistValue('Microchip'),
  picklistValue('Council ID'),
  picklistValue('Veterinary ID'),
  picklistValue('Foster ID'),
  picklistValue('Other'),
];

const countryValues = [
  picklistValue('Australia'),
  picklistValue('New Zealand'),
  picklistValue('United States'),
  picklistValue('United Kingdom'),
  picklistValue('Other'),
];

const relationshipTypeValues = [
  picklistValue('Littermate'),
  picklistValue('Bonded Pair'),
  picklistValue('Offspring'),
  picklistValue('Parent'),
  picklistValue('Aggression Risk'),
  picklistValue('Medical Cohort'),
  picklistValue('Other'),
];

const currentStatusValues = [
  picklistValue('Pending Intake'),
  picklistValue('In Care'),
  picklistValue('Exited Care'),
  picklistValue('Deceased'),
];

const episodeStatusValues = [
  picklistValue('Planned'),
  picklistValue('Open'),
  picklistValue('On Hold'),
  picklistValue('Closed'),
  picklistValue('Cancelled'),
];

const intakeSourceValues = [
  picklistValue('Stray'),
  picklistValue('Owner Surrender'),
  picklistValue('Transfer In'),
  picklistValue('Seizure'),
  picklistValue('Return'),
  picklistValue('Born In Care'),
  picklistValue('Other'),
];

const moveReasonValues = [
  picklistValue('Intake Placement'),
  picklistValue('Routine Move'),
  picklistValue('Medical Isolation'),
  picklistValue('Behavioural Management'),
  picklistValue('Foster Transfer'),
  picklistValue('Outcome Processing'),
  picklistValue('Other'),
];

const customObjects = [
  {
    apiName: 'Animal__c',
    label: 'Animal',
    pluralLabel: 'Animals',
    description: 'Core animal record for intake, housing, and episode management.',
    sharingModel: 'ReadWrite',
    visibility: 'Public',
    enableActivities: true,
    enableReports: true,
    nameField: { type: 'AutoNumber', label: 'Animal Number', displayFormat: 'AN-{00000}' },
    fields: [
      textField('Display_Name__c', 'Display Name', 80, {
        required: true,
        description: 'User-facing display name for the animal.',
        helpText: 'Enter the name staff should use when referring to the animal.',
      }),
      picklistGlobalField('Species__c', 'Species', 'A360_Species', {
        description: 'Primary species classification.',
        helpText: 'Choose the animal species.',
      }),
      textField('Breed_Primary__c', 'Primary Breed', 80, {
        description: 'Primary breed or type description.',
      }),
      textField('Breed_Secondary__c', 'Secondary Breed', 80, {
        description: 'Secondary breed or type description when known.',
      }),
      picklistGlobalField('Sex__c', 'Sex', 'A360_Sex', {
        description: 'Recorded sex for the animal.',
      }),
      dateField('Date_of_Birth__c', 'Date of Birth', {
        description: 'Confirmed or best-known date of birth.',
      }),
      numberField('Estimated_Age_Months__c', 'Estimated Age (Months)', 4, 0, {
        description: 'Estimated age in whole months when the exact birth date is unknown.',
      }),
      picklistGlobalField('Reproductive_Status__c', 'Reproductive Status', 'A360_Reproductive_Status', {
        description: 'Current reproductive status of the animal.',
      }),
      checkboxField('Is_Deceased__c', 'Is Deceased', false, {
        description: 'Marks the animal as deceased.',
      }),
      dateField('Date_of_Death__c', 'Date of Death', {
        description: 'Known date of death.',
      }),
      lookupField('Current_Episode__c', 'Current Episode', 'Animal_Episode__c', 'Current Animals', 'Current_Animals', {
        description: 'System-maintained pointer to the active episode.',
        helpText: 'This field is system maintained by operational automation.',
      }),
      lookupField(
        'Current_Housing_Unit__c',
        'Current Housing Unit',
        'Housing_Unit__c',
        'Currently Housed Animals',
        'Currently_Housed_Animals',
        {
          description: 'System-maintained pointer to the active housing unit.',
          helpText: 'This field is system maintained by operational automation.',
        },
      ),
      picklistLocalField('Current_Status__c', 'Current Status', currentStatusValues, {
        description: 'System-maintained lifecycle status summary.',
        helpText: 'This field is system maintained by operational automation.',
      }),
      picklistLocalField('Current_Care_Status__c', 'Current Care Status', episodeStatusValues, {
        description: 'System-maintained summary of the active episode status.',
        helpText: 'This field is system maintained by operational automation.',
      }),
      picklistGlobalField('Current_Welfare_Risk__c', 'Current Welfare Risk', 'A360_Welfare_Risk', {
        description: 'Current welfare risk flag for operational reporting.',
      }),
      lookupField('Responsible_Account__c', 'Responsible Account', 'Account', 'Responsible Animals', 'Responsible_Animals', {
        description: 'Organisation currently responsible for the animal.',
      }),
      lookupField(
        'Responsible_Contact__c',
        'Responsible Contact',
        'Contact',
        'Responsible Contact Animals',
        'Responsible_Contact_Animals',
        {
          description: 'Primary contact responsible for the animal.',
        },
      ),
    ],
    validations: [
      {
        apiName: 'A360_Animal_Deceased_Date_Required',
        description: 'Requires a date of death when the animal is marked as deceased.',
        errorConditionFormula: 'AND(Is_Deceased__c, ISBLANK(Date_of_Death__c))',
        errorMessage: 'Enter a date of death when the animal is marked as deceased.',
      },
      {
        apiName: 'A360_Animal_Age_Source_Required',
        description: 'Requires either a date of birth or an estimated age for new records.',
        errorConditionFormula: 'AND(ISBLANK(Date_of_Birth__c), ISBLANK(Estimated_Age_Months__c))',
        errorMessage: 'Provide either a date of birth or an estimated age in months.',
      },
    ],
    layoutSections: [
      {
        label: 'Animal Details',
        columns: [
          ['Name', 'Display_Name__c', 'Species__c', 'Breed_Primary__c', 'Sex__c', 'Date_of_Birth__c'],
          ['Breed_Secondary__c', 'Estimated_Age_Months__c', 'Reproductive_Status__c', 'Is_Deceased__c', 'Date_of_Death__c'],
        ],
      },
      {
        label: 'Current State',
        columns: [
          ['Current_Status__c', 'Current_Care_Status__c', 'Current_Episode__c', 'Current_Housing_Unit__c'],
          ['Current_Welfare_Risk__c', 'Responsible_Account__c', 'Responsible_Contact__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Animal_Identifier__c',
    label: 'Animal Identifier',
    pluralLabel: 'Animal Identifiers',
    description: 'Tracks external and operational identifiers assigned to an animal.',
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    enableActivities: false,
    enableReports: true,
    nameField: { type: 'AutoNumber', label: 'Identifier Number', displayFormat: 'ID-{00000}' },
    fields: [
      masterDetailField('Animal__c', 'Animal', 'Animal__c', 'Identifiers', 'Identifiers', {
        description: 'Animal that owns this identifier.',
        writeRequiresMasterRead: false,
      }),
      picklistLocalField('Identifier_Type__c', 'Identifier Type', identifierTypeValues, {
        description: 'Operational or external identifier type.',
      }),
      textField('Identifier_Value__c', 'Identifier Value', 80, {
        required: true,
        unique: true,
        externalId: true,
        caseSensitive: false,
        description: 'Unique identifier value used for matching and integrations.',
      }),
      textField('Issuing_Body__c', 'Issuing Body', 120, {
        description: 'Organisation that issued the identifier.',
      }),
      picklistLocalField('Country__c', 'Country', countryValues, {
        description: 'Country associated with the identifier.',
      }),
      dateField('Start_Date__c', 'Start Date', {
        description: 'Date the identifier became effective.',
      }),
      dateField('End_Date__c', 'End Date', {
        description: 'Date the identifier stopped being effective.',
      }),
      checkboxField('Is_Primary__c', 'Is Primary', false, {
        description: 'Marks the identifier as the primary identifier for the animal.',
      }),
    ],
    validations: [
      {
        apiName: 'A360_Identifier_End_After_Start',
        description: 'Ensures identifier end dates do not precede start dates.',
        errorConditionFormula: 'AND(NOT(ISBLANK(End_Date__c)), NOT(ISBLANK(Start_Date__c)), End_Date__c < Start_Date__c)',
        errorMessage: 'End Date must be on or after Start Date.',
      },
    ],
    layoutSections: [
      {
        label: 'Identifier Details',
        columns: [
          ['Name', 'Animal__c', 'Identifier_Type__c', 'Identifier_Value__c'],
          ['Is_Primary__c', 'Issuing_Body__c', 'Country__c', 'Start_Date__c', 'End_Date__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Animal_Relationship__c',
    label: 'Animal Relationship',
    pluralLabel: 'Animal Relationships',
    description: 'Represents important operational relationships between animals.',
    sharingModel: 'ReadWrite',
    visibility: 'Public',
    enableActivities: false,
    enableReports: true,
    nameField: { type: 'AutoNumber', label: 'Relationship Number', displayFormat: 'REL-{00000}' },
    fields: [
      lookupField('From_Animal__c', 'From Animal', 'Animal__c', 'Outbound Relationships', 'Outbound_Relationships', {
        description: 'Source animal in the relationship.',
      }),
      lookupField('To_Animal__c', 'To Animal', 'Animal__c', 'Inbound Relationships', 'Inbound_Relationships', {
        description: 'Target animal in the relationship.',
      }),
      picklistLocalField('Relationship_Type__c', 'Relationship Type', relationshipTypeValues, {
        description: 'Type of relationship between the animals.',
      }),
      dateField('Start_Date__c', 'Start Date', {
        description: 'Date the relationship started.',
      }),
      dateField('End_Date__c', 'End Date', {
        description: 'Date the relationship ended.',
      }),
      longTextField('Notes__c', 'Notes', 32768, 4, {
        description: 'Operational notes about the relationship.',
      }),
    ],
    validations: [
      {
        apiName: 'A360_No_Self_Relationship',
        description: 'Prevents an animal relationship from referencing the same animal on both sides.',
        errorConditionFormula: 'From_Animal__c = To_Animal__c',
        errorMessage: 'From Animal and To Animal must be different.',
      },
    ],
    layoutSections: [
      {
        label: 'Relationship Details',
        columns: [
          ['Name', 'From_Animal__c', 'To_Animal__c', 'Relationship_Type__c'],
          ['Start_Date__c', 'End_Date__c', 'Notes__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Animal_Episode__c',
    label: 'Animal Episode',
    pluralLabel: 'Animal Episodes',
    description: 'Captures a bounded period of care for an animal.',
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    enableActivities: true,
    enableReports: true,
    nameField: { type: 'AutoNumber', label: 'Episode Number', displayFormat: 'EP-{00000}' },
    fields: [
      masterDetailField('Animal__c', 'Animal', 'Animal__c', 'Episodes', 'Episodes', {
        description: 'Animal that owns this episode.',
        writeRequiresMasterRead: false,
      }),
      picklistGlobalField('Episode_Type__c', 'Episode Type', 'A360_Episode_Type', {
        description: 'Classification for this episode.',
      }),
      dateTimeField('Intake_DateTime__c', 'Intake Date Time', {
        description: 'Date and time the episode started.',
      }),
      dateTimeField('End_DateTime__c', 'End Date Time', {
        description: 'Date and time the episode ended.',
      }),
      picklistLocalField('Episode_Status__c', 'Episode Status', episodeStatusValues, {
        description: 'Current operational status for the episode.',
      }),
      checkboxField('Is_Current__c', 'Is Current', false, {
        description: 'Marks the episode as the active episode for the animal.',
      }),
      picklistLocalField('Intake_Source__c', 'Intake Source', intakeSourceValues, {
        description: 'How the animal entered care for this episode.',
      }),
      picklistGlobalField('Outcome_Type__c', 'Outcome Type', 'A360_Outcome_Type', {
        description: 'Outcome type recorded at closeout.',
      }),
      lookupField(
        'Outcome_Account__c',
        'Outcome Account',
        'Account',
        'Episodes as Outcome Account',
        'Episodes_as_Outcome_Account',
        {
          description: 'Destination or responsible account captured at closeout.',
        },
      ),
      lookupField(
        'Outcome_Contact__c',
        'Outcome Contact',
        'Contact',
        'Episodes as Outcome Contact',
        'Episodes_as_Outcome_Contact',
        {
          description: 'Destination or responsible contact captured at closeout.',
        },
      ),
      lookupField(
        'Current_Location_Stay__c',
        'Current Location Stay',
        'Animal_Location_Stay__c',
        'Current Episodes',
        'Current_Episodes',
        {
          description: 'System-maintained pointer to the active location stay.',
          helpText: 'This field is system maintained by operational automation.',
        },
      ),
      longTextField('Notes__c', 'Notes', 32768, 4, {
        description: 'Operational notes for the episode.',
      }),
    ],
    validations: [
      {
        apiName: 'A360_Episode_End_After_Start',
        description: 'Ensures episode end date times are not before intake date times.',
        errorConditionFormula:
          'AND(NOT(ISBLANK(End_DateTime__c)), NOT(ISBLANK(Intake_DateTime__c)), End_DateTime__c < Intake_DateTime__c)',
        errorMessage: 'End Date Time must be on or after Intake Date Time.',
      },
      {
        apiName: 'A360_Current_Episode_No_End',
        description: 'Prevents active episodes from storing an end date.',
        errorConditionFormula: 'AND(Is_Current__c, NOT(ISBLANK(End_DateTime__c)))',
        errorMessage: 'Clear Is Current before entering an End Date Time.',
      },
    ],
    layoutSections: [
      {
        label: 'Episode Details',
        columns: [
          ['Name', 'Animal__c', 'Episode_Type__c', 'Episode_Status__c', 'Is_Current__c'],
          ['Intake_DateTime__c', 'End_DateTime__c', 'Intake_Source__c', 'Outcome_Type__c'],
        ],
      },
      {
        label: 'Current State',
        columns: [
          ['Current_Location_Stay__c', 'Outcome_Account__c', 'Outcome_Contact__c'],
          ['Notes__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Housing_Unit__c',
    label: 'Housing Unit',
    pluralLabel: 'Housing Units',
    description: 'Represents a physical or virtual placement location used in animal-care operations.',
    sharingModel: 'ReadWrite',
    visibility: 'Public',
    enableActivities: false,
    enableReports: true,
    nameField: { type: 'Text', label: 'Housing Unit Name' },
    fields: [
      textField('Unit_Code__c', 'Unit Code', 40, {
        unique: true,
        required: true,
        description: 'Operational code used to identify the housing unit.',
      }),
      picklistGlobalField('Housing_Type__c', 'Housing Type', 'A360_Housing_Type', {
        description: 'Classification for the housing unit.',
      }),
      lookupField('Site_Account__c', 'Site Account', 'Account', 'Housing Units', 'Housing_Units', {
        description: 'Owning or operating site account.',
      }),
      numberField('Capacity__c', 'Capacity', 3, 0, {
        description: 'Nominal capacity for the housing unit.',
      }),
      numberField('Current_Occupancy__c', 'Current Occupancy', 3, 0, {
        description: 'Operational reporting field for current occupancy.',
      }),
      checkboxField('Is_Active__c', 'Is Active', true, {
        description: 'Marks whether the housing unit is available for use.',
      }),
      longTextField('Notes__c', 'Notes', 32768, 4, {
        description: 'Operational notes about the housing unit.',
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Housing Unit Details',
        columns: [
          ['Name', 'Unit_Code__c', 'Housing_Type__c', 'Site_Account__c'],
          ['Capacity__c', 'Current_Occupancy__c', 'Is_Active__c', 'Notes__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Animal_Location_Stay__c',
    label: 'Animal Location Stay',
    pluralLabel: 'Animal Location Stays',
    description: 'Tracks each placement of an episode in a housing unit over time.',
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    enableActivities: false,
    enableReports: true,
    nameField: { type: 'AutoNumber', label: 'Location Stay Number', displayFormat: 'STAY-{00000}' },
    fields: [
      masterDetailField(
        'Animal_Episode__c',
        'Animal Episode',
        'Animal_Episode__c',
        'Location Stays',
        'Location_Stays',
        {
          description: 'Episode that owns this location stay.',
          writeRequiresMasterRead: false,
        },
      ),
      lookupField('Housing_Unit__c', 'Housing Unit', 'Housing_Unit__c', 'Location Stays', 'Housing_Unit_Location_Stays', {
        description: 'Housing unit assigned during this stay.',
      }),
      dateTimeField('Start_DateTime__c', 'Start Date Time', {
        description: 'Date and time the stay started.',
      }),
      dateTimeField('End_DateTime__c', 'End Date Time', {
        description: 'Date and time the stay ended.',
      }),
      checkboxField('Is_Current__c', 'Is Current', false, {
        description: 'Marks the stay as the active placement for the episode.',
      }),
      picklistLocalField('Move_Reason__c', 'Move Reason', moveReasonValues, {
        description: 'Reason the stay started.',
      }),
      longTextField('Notes__c', 'Notes', 32768, 4, {
        description: 'Operational notes about the stay.',
      }),
    ],
    validations: [
      {
        apiName: 'A360_Stay_End_After_Start',
        description: 'Ensures location stay end date times are not before the start date time.',
        errorConditionFormula:
          'AND(NOT(ISBLANK(End_DateTime__c)), NOT(ISBLANK(Start_DateTime__c)), End_DateTime__c < Start_DateTime__c)',
        errorMessage: 'End Date Time must be on or after Start Date Time.',
      },
      {
        apiName: 'A360_Current_Stay_No_End',
        description: 'Prevents active stays from storing an end date.',
        errorConditionFormula: 'AND(Is_Current__c, NOT(ISBLANK(End_DateTime__c)))',
        errorMessage: 'Clear Is Current before entering an End Date Time.',
      },
    ],
    layoutSections: [
      {
        label: 'Location Stay Details',
        columns: [
          ['Name', 'Animal_Episode__c', 'Housing_Unit__c', 'Is_Current__c'],
          ['Start_DateTime__c', 'End_DateTime__c', 'Move_Reason__c', 'Notes__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Intake_Event__c',
    label: 'Intake Event',
    pluralLabel: 'Intake Events',
    description: 'Captures the intake transaction that opened an episode.',
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    enableActivities: false,
    enableReports: true,
    nameField: { type: 'AutoNumber', label: 'Intake Event Number', displayFormat: 'IN-{00000}' },
    fields: [
      masterDetailField('Animal_Episode__c', 'Animal Episode', 'Animal_Episode__c', 'Intake Events', 'Intake_Events', {
        description: 'Episode that owns this intake event.',
        writeRequiresMasterRead: false,
      }),
      picklistLocalField('Source__c', 'Source', intakeSourceValues, {
        description: 'Recorded intake source for the event.',
      }),
      dateTimeField('Event_DateTime__c', 'Event Date Time', {
        description: 'When the intake was recorded.',
      }),
      lookupField(
        'Responsible_Account__c',
        'Responsible Account',
        'Account',
        'Intake Events',
        'Intake_Events',
        {
          description: 'Responsible organisation captured at intake.',
        },
      ),
      lookupField(
        'Responsible_Contact__c',
        'Responsible Contact',
        'Contact',
        'Intake Event Contacts',
        'Intake_Event_Contacts',
        {
          description: 'Responsible contact captured at intake.',
        },
      ),
      longTextField('Notes__c', 'Notes', 32768, 4, {
        description: 'Operational notes about the intake event.',
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Intake Event Details',
        columns: [
          ['Name', 'Animal_Episode__c', 'Source__c', 'Event_DateTime__c'],
          ['Responsible_Account__c', 'Responsible_Contact__c', 'Notes__c'],
        ],
      },
    ],
  },
  {
    apiName: 'Outcome_Event__c',
    label: 'Outcome Event',
    pluralLabel: 'Outcome Events',
    description: 'Captures the closing transaction for an episode.',
    sharingModel: 'ControlledByParent',
    visibility: 'Public',
    enableActivities: false,
    enableReports: true,
    nameField: { type: 'AutoNumber', label: 'Outcome Event Number', displayFormat: 'OUT-{00000}' },
    fields: [
      masterDetailField('Animal_Episode__c', 'Animal Episode', 'Animal_Episode__c', 'Outcome Events', 'Outcome_Events', {
        description: 'Episode that owns this outcome event.',
        writeRequiresMasterRead: false,
      }),
      picklistGlobalField('Outcome_Type__c', 'Outcome Type', 'A360_Outcome_Type', {
        description: 'Outcome recorded for the episode.',
      }),
      dateTimeField('Event_DateTime__c', 'Event Date Time', {
        description: 'When the outcome was recorded.',
      }),
      lookupField(
        'Destination_Account__c',
        'Destination Account',
        'Account',
        'Outcome Events',
        'Outcome_Events',
        {
          description: 'Destination account captured at outcome.',
        },
      ),
      lookupField(
        'Destination_Contact__c',
        'Destination Contact',
        'Contact',
        'Outcome Event Contacts',
        'Outcome_Event_Contacts',
        {
          description: 'Destination contact captured at outcome.',
        },
      ),
      longTextField('Notes__c', 'Notes', 32768, 4, {
        description: 'Operational notes about the outcome event.',
      }),
    ],
    validations: [],
    layoutSections: [
      {
        label: 'Outcome Event Details',
        columns: [
          ['Name', 'Animal_Episode__c', 'Outcome_Type__c', 'Event_DateTime__c'],
          ['Destination_Account__c', 'Destination_Contact__c', 'Notes__c'],
        ],
      },
    ],
  },
];

const standardObjectFields = {
  Account: [
    picklistLocalField('A360_Partner_Type__c', 'A360 Partner Type', partnerTypeValues, {
      description: 'Role this partner organisation plays in Love 4 Animals operations.',
      helpText: 'Use this field to classify the partner organisation for Love 4 Animals.',
    }),
    longTextField('A360_Animal_360_Notes__c', 'A360 Notes', 32768, 4, {
      description: 'Love 4 Animals operating notes about the partner organisation.',
    }),
  ],
  Contact: [
    picklistLocalField('A360_Animal_360_Role__c', 'A360 Role', contactRoleValues, {
      description: 'Role this contact plays in Love 4 Animals operations.',
    }),
    picklistLocalField('A360_Preferred_Contact_Channel__c', 'A360 Preferred Contact Channel', contactChannelValues, {
      description: 'Preferred contact channel for Love 4 Animals operations.',
    }),
  ],
  Case: [
    lookupField('A360_Animal__c', 'A360 Animal', 'Animal__c', 'Cases', 'Cases', {
      description: 'Animal context linked to the case.',
    }),
    lookupField('A360_Episode__c', 'A360 Episode', 'Animal_Episode__c', 'Cases', 'Cases', {
      description: 'Episode context linked to the case.',
    }),
    lookupField('A360_Housing_Unit__c', 'A360 Housing Unit', 'Housing_Unit__c', 'Cases', 'Cases', {
      description: 'Housing unit context linked to the case.',
    }),
    picklistLocalField('A360_Case_Context__c', 'A360 Case Context', caseContextValues, {
      description: 'Operational context for the case.',
    }),
  ],
};

const reportFolder = {
  apiName: 'Animal_360',
  label: 'Love 4 Animals',
};

const reportTypes = [
  {
    apiName: 'Animal_with_Episodes',
    label: 'Animals with Episodes',
    description: 'Report type for animal and episode reporting.',
    baseObject: 'Animal__c',
    join: { relationship: 'Episodes__r', outerJoin: true },
    sections: [
      {
        label: 'Animal',
        table: 'Animal__c',
        fields: ['Name', 'Display_Name__c', 'Species__c', 'Current_Status__c', 'Current_Care_Status__c'],
      },
      {
        label: 'Episodes',
        table: 'Animal__c.Episodes__r',
        fields: ['Name', 'Episode_Type__c', 'Episode_Status__c', 'Intake_DateTime__c', 'Outcome_Type__c'],
      },
    ],
  },
  {
    apiName: 'Animal_Episode_with_Location_Stays',
    label: 'Animal Episodes with Location Stays',
    description: 'Report type for placement reporting.',
    baseObject: 'Animal_Episode__c',
    join: { relationship: 'Location_Stays__r', outerJoin: true },
    sections: [
      {
        label: 'Episode',
        table: 'Animal_Episode__c',
        fields: ['Name', 'Episode_Type__c', 'Episode_Status__c', 'Intake_DateTime__c', 'Is_Current__c'],
      },
      {
        label: 'Location Stays',
        table: 'Animal_Episode__c.Location_Stays__r',
        fields: ['Name', 'Housing_Unit__c', 'Start_DateTime__c', 'End_DateTime__c', 'Move_Reason__c'],
      },
    ],
  },
  {
    apiName: 'Housing_Unit_with_Location_Stays',
    label: 'Housing Units with Location Stays',
    description: 'Report type for housing utilisation reporting.',
    baseObject: 'Housing_Unit__c',
    join: { relationship: 'Housing_Unit_Location_Stays__r', outerJoin: true },
    sections: [
      {
        label: 'Housing Unit',
        table: 'Housing_Unit__c',
        fields: ['Name', 'Unit_Code__c', 'Housing_Type__c', 'Capacity__c', 'Current_Occupancy__c', 'Is_Active__c'],
      },
      {
        label: 'Location Stays',
        table: 'Housing_Unit__c.Housing_Unit_Location_Stays__r',
        fields: ['Name', 'Animal_Episode__c', 'Start_DateTime__c', 'End_DateTime__c', 'Is_Current__c'],
      },
    ],
  },
];

const reports = [
  {
    fileName: 'Animals_Currently_In_Care',
    label: 'Animals Currently In Care',
    description: 'Operational report showing the current status of animals in care.',
    reportType: 'CustomEntity$Animal__c',
    reportTypeApiName: 'CustomEntity$Animal__c',
    columns: [
      'CUST_NAME',
      'Animal__c.Display_Name__c',
      'Animal__c.Species__c',
      'Animal__c.Current_Status__c',
      'Animal__c.Current_Care_Status__c',
      'Animal__c.Current_Housing_Unit__c',
    ],
    filters: [{ column: 'Animal__c.Current_Status__c', operator: 'equals', value: 'In Care' }],
    sortColumn: 'Animal__c.Display_Name__c',
  },
  {
    fileName: 'Open_Episodes',
    label: 'Open Episodes',
    description: 'Operational report showing episodes that are currently open.',
    reportType: 'CustomEntityCustomEntity$Animal__c$Animal_Episode__c',
    reportTypeApiName: 'CustomEntityCustomEntity$Animal__c$Animal_Episode__c',
    columns: [
      'CHILD_NAME',
      'Animal__c.Display_Name__c',
      'Animal_Episode__c.Episode_Type__c',
      'Animal_Episode__c.Episode_Status__c',
      'Animal_Episode__c.Intake_DateTime__c',
      'Animal_Episode__c.Is_Current__c',
    ],
    filters: [{ column: 'Animal_Episode__c.Episode_Status__c', operator: 'equals', value: 'Open' }],
    sortColumn: 'Animal_Episode__c.Intake_DateTime__c',
  },
  {
    fileName: 'Housing_Unit_Capacity',
    label: 'Housing Unit Capacity',
    description: 'Operational report showing configured housing unit capacity.',
    reportType: 'CustomEntity$Housing_Unit__c',
    reportTypeApiName: 'CustomEntity$Housing_Unit__c',
    columns: [
      'CUST_NAME',
      'Housing_Unit__c.Unit_Code__c',
      'Housing_Unit__c.Housing_Type__c',
      'Housing_Unit__c.Capacity__c',
      'Housing_Unit__c.Current_Occupancy__c',
      'Housing_Unit__c.Is_Active__c',
    ],
    filters: [],
    sortColumn: 'Housing_Unit__c.Unit_Code__c',
  },
];

const customTabs = [
  { apiName: 'Animal__c', label: 'Animals', motif: 'Custom1: Heart' },
  { apiName: 'Animal_Episode__c', label: 'Episodes', motif: 'Custom2: Fan' },
  { apiName: 'Housing_Unit__c', label: 'Housing Units', motif: 'Custom34: Insect' },
  { apiName: 'Intake_Event__c', label: 'Intake Events', motif: 'Custom1: Heart' },
  { apiName: 'Outcome_Event__c', label: 'Outcome Events', motif: 'Custom2: Fan' },
];

const customApp = {
  apiName: 'Animal_360',
  label: 'Love 4 Animals',
  description: 'Love 4 Animals application for intake, movement, closure, and reporting.',
  defaultLandingTab: 'Animal__c',
  tabs: ['Animal__c', 'Animal_Episode__c', 'Housing_Unit__c', 'Intake_Event__c', 'Outcome_Event__c', 'standard-Case', 'standard-Report'],
};

const flowNames = [
  'A360_Animal_Current_State_Rollup_Flow',
  'A360_Episode_Current_State_Trigger_Flow',
  'A360_Location_Stay_Current_State_Trigger_Flow',
  'A360_Intake_Flow',
  'A360_Move_Animal_Flow',
  'A360_Close_Episode_Flow',
];

const classNames = [
  'A360AnimalIntegrityService',
  'A360AnimalIdentifierTriggerHandler',
  'A360AnimalEpisodeTriggerHandler',
  'A360AnimalLocationStayTriggerHandler',
  'A360AnimalRollupService',
];

const triggerNames = [
  'A360AnimalIdentifierTrigger',
  'A360AnimalEpisodeTrigger',
  'A360AnimalLocationStayTrigger',
];

const systemManagedFieldPaths = new Set([
  fieldPath('Animal__c', 'Current_Episode__c'),
  fieldPath('Animal__c', 'Current_Housing_Unit__c'),
  fieldPath('Animal__c', 'Current_Status__c'),
  fieldPath('Animal__c', 'Current_Care_Status__c'),
  fieldPath('Animal__c', 'Current_Welfare_Risk__c'),
  fieldPath('Animal_Episode__c', 'Current_Location_Stay__c'),
  fieldPath('Animal_Episode__c', 'Is_Current__c'),
  fieldPath('Animal_Location_Stay__c', 'Is_Current__c'),
]);

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

function buildFieldXml(field) {
  const lines = [`<CustomField xmlns="${XMLNS}">`, `    <fullName>${escapeXml(field.apiName)}</fullName>`];

  if (field.description) {
    lines.push(`    <description>${escapeXml(field.description)}</description>`);
  }
  if (field.helpText) {
    lines.push(`    <inlineHelpText>${escapeXml(field.helpText)}</inlineHelpText>`);
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
      lines.push(`    <precision>${field.precision}</precision>`);
      lines.push(`    <scale>${field.scale}</scale>`);
      break;
    case 'Checkbox':
      lines.push(`    <defaultValue>${field.defaultValue}</defaultValue>`);
      break;
    case 'PicklistGlobal':
      break;
    case 'PicklistLocal':
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
      lines.push(`    <writeRequiresMasterRead>${bool(field.writeRequiresMasterRead ?? false)}</writeRequiresMasterRead>`);
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
    <sharingModel>${objectDef.sharingModel}</sharingModel>
    <visibility>${objectDef.visibility}</visibility>
</CustomObject>`;
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

function buildLayoutXml(objectDef) {
  const sectionsXml = objectDef.layoutSections
    .map((section) => {
      const columnsXml = section.columns
        .map((columnFields) => {
          const itemsXml = columnFields
            .map((fieldApiName) => {
              const behavior =
                fieldApiName == 'Name' && objectDef.nameField.type == 'AutoNumber'
                  ? 'Readonly'
                  : fieldApiName == 'Name' && objectDef.nameField.type == 'Text'
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
    <description>${escapeXml(`${tab.label} navigation tab for Love 4 Animals operations.`)}</description>
    <motif>${escapeXml(tab.motif)}</motif>
</CustomTab>`;
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

function buildReportXml(reportDef) {
  const columnsXml = reportDef.columns
    .map((fieldApiName) => `    <columns>
        <field>${escapeXml(fieldApiName)}</field>
    </columns>`)
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
        <booleanFilter>${reportDef.filters.map((_, index) => index + 1).join(' AND ')}</booleanFilter>
${filterItemsXml}
    </filter>`
      : '';

  return `<Report xmlns="${XMLNS}">
${columnsXml}
    <description>${escapeXml(reportDef.description)}</description>
${filterXml}
    <folderName>${escapeXml(reportFolder.apiName)}</folderName>
    <format>Tabular</format>
    <name>${escapeXml(reportDef.label)}</name>
    <reportType>${escapeXml(reportDef.reportType)}</reportType>
    <reportTypeApiName>${escapeXml(reportDef.reportTypeApiName)}</reportTypeApiName>
    <scope>organization</scope>
    <showDetails>true</showDetails>
    <showGrandTotal>false</showGrandTotal>
    <showSubTotals>false</showSubTotals>
    <sortColumn>${escapeXml(reportDef.sortColumn)}</sortColumn>
    <sortOrder>Asc</sortOrder>
</Report>`;
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
    <description>${escapeXml(config.description)}</description>
${fieldPermissions}
${flowAccesses}
    <label>${escapeXml(config.label)}</label>
${objectPermissions}
${tabSettings}
${userPermissions}
</PermissionSet>`;
}

function flowValueXml(value) {
  if (value.elementReference) {
    return `<elementReference>${escapeXml(value.elementReference)}</elementReference>`;
  }
  if (value.stringValue !== undefined) {
    return `<stringValue>${escapeXml(value.stringValue)}</stringValue>`;
  }
  if (value.booleanValue !== undefined) {
    return `<booleanValue>${bool(value.booleanValue)}</booleanValue>`;
  }
  if (value.numberValue !== undefined) {
    return `<numberValue>${value.numberValue}</numberValue>`;
  }
  if (value.dateValue !== undefined) {
    return `<dateValue>${escapeXml(value.dateValue)}</dateValue>`;
  }
  if (value.dateTimeValue !== undefined) {
    return `<dateTimeValue>${escapeXml(value.dateTimeValue)}</dateTimeValue>`;
  }
  return '<stringValue></stringValue>';
}

function screenFieldXml(field) {
  const parts = [
    '        <fields>',
    `            <name>${escapeXml(field.name)}</name>`,
    `            <fieldType>${field.fieldType}</fieldType>`,
  ];
  if (field.dataType) {
    parts.push(`            <dataType>${field.dataType}</dataType>`);
  }
  if (field.fieldText) {
    parts.push(`            <fieldText>${escapeXml(field.fieldText)}</fieldText>`);
  }
  if (field.helpText) {
    parts.push(`            <helpText>${escapeXml(field.helpText)}</helpText>`);
  }
  if (field.defaultValue) {
    parts.push(`            <defaultValue>${flowValueXml(field.defaultValue)}</defaultValue>`);
  }
  if (field.isRequired !== undefined) {
    parts.push(`            <isRequired>${bool(field.isRequired)}</isRequired>`);
  }
  parts.push('            <isVisible>true</isVisible>');
  if (field.fieldType === 'DisplayText') {
    parts.push(`            <fieldText>${escapeXml(field.displayText)}</fieldText>`);
  }
  parts.push('        </fields>');
  return parts.join('\n');
}

function flowInputAssignmentXml(fieldApiName, value) {
  return `        <inputAssignments>
            <field>${escapeXml(fieldApiName)}</field>
            <value>${flowValueXml(value)}</value>
        </inputAssignments>`;
}

function flowSubflowInputXml(name, value) {
  return `        <inputAssignments>
            <name>${escapeXml(name)}</name>
            <value>${flowValueXml(value)}</value>
        </inputAssignments>`;
}

function buildRollupFlowXml() {
  return `<Flow xmlns="${XMLNS}">
    <apiVersion>${API_VERSION}</apiVersion>
    <actionCalls>
        <name>Run_Rollup_Service</name>
        <label>Run Rollup Service</label>
        <locationX>280</locationX>
        <locationY>80</locationY>
        <actionName>A360AnimalRollupService</actionName>
        <actionType>apex</actionType>
        <flowTransactionModel>CurrentTransaction</flowTransactionModel>
        <inputParameters>
            <name>animalId</name>
            <value><elementReference>animalId</elementReference></value>
        </inputParameters>
        <inputParameters>
            <name>episodeId</name>
            <value><elementReference>episodeId</elementReference></value>
        </inputParameters>
    </actionCalls>
    <interviewLabel>Animal Current State Rollup {!$Flow.CurrentDateTime}</interviewLabel>
    <label>Animal Current State Rollup Flow</label>
    <processType>AutoLaunchedFlow</processType>
    <runInMode>SystemModeWithSharing</runInMode>
    <start>
        <locationX>40</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Run_Rollup_Service</targetReference>
        </connector>
    </start>
    <status>Active</status>
    <variables>
        <name>animalId</name>
        <dataType>String</dataType>
        <isInput>true</isInput>
        <isOutput>false</isOutput>
    </variables>
    <variables>
        <name>episodeId</name>
        <dataType>String</dataType>
        <isInput>true</isInput>
        <isOutput>false</isOutput>
    </variables>
</Flow>`;
}

function buildEpisodeTriggerFlowXml() {
  return `<Flow xmlns="${XMLNS}">
    <apiVersion>${API_VERSION}</apiVersion>
    <interviewLabel>Episode Rollup Trigger {!$Flow.CurrentDateTime}</interviewLabel>
    <label>Episode Current State Trigger Flow</label>
    <processType>AutoLaunchedFlow</processType>
    <runInMode>SystemModeWithSharing</runInMode>
    <start>
        <locationX>40</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Run_Rollup_Subflow</targetReference>
        </connector>
        <object>Animal_Episode__c</object>
        <recordTriggerType>CreateAndUpdate</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <status>Active</status>
    <subflows>
        <name>Run_Rollup_Subflow</name>
        <label>Run Rollup Subflow</label>
        <locationX>280</locationX>
        <locationY>80</locationY>
        <flowName>A360_Animal_Current_State_Rollup_Flow</flowName>
        <inputAssignments>
            <name>episodeId</name>
            <value><elementReference>$Record.Id</elementReference></value>
        </inputAssignments>
    </subflows>
</Flow>`;
}

function buildLocationStayTriggerFlowXml() {
  return `<Flow xmlns="${XMLNS}">
    <apiVersion>${API_VERSION}</apiVersion>
    <interviewLabel>Location Stay Rollup Trigger {!$Flow.CurrentDateTime}</interviewLabel>
    <label>Location Stay Current State Trigger Flow</label>
    <processType>AutoLaunchedFlow</processType>
    <runInMode>SystemModeWithSharing</runInMode>
    <start>
        <locationX>40</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Run_Rollup_Subflow</targetReference>
        </connector>
        <object>Animal_Location_Stay__c</object>
        <recordTriggerType>CreateAndUpdate</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <status>Active</status>
    <subflows>
        <name>Run_Rollup_Subflow</name>
        <label>Run Rollup Subflow</label>
        <locationX>280</locationX>
        <locationY>80</locationY>
        <flowName>A360_Animal_Current_State_Rollup_Flow</flowName>
        <inputAssignments>
            <name>episodeId</name>
            <value><elementReference>$Record.Animal_Episode__c</elementReference></value>
        </inputAssignments>
    </subflows>
</Flow>`;
}

function buildIntakeFlowXml() {
  return `<Flow xmlns="${XMLNS}">
    <apiVersion>${API_VERSION}</apiVersion>
    <interviewLabel>Animal Intake {!$Flow.CurrentDateTime}</interviewLabel>
    <label>Animal Intake Flow</label>
    <processType>Flow</processType>
    <runInMode>SystemModeWithSharing</runInMode>
    <screens>
        <name>Enter_Intake_Details</name>
        <label>Enter Intake Details</label>
        <locationX>260</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <connector>
            <targetReference>Create_Animal</targetReference>
        </connector>
        ${screenFieldXml({
          name: 'Intake_Instructions',
          fieldType: 'DisplayText',
          displayText:
            'Enter the required intake details. For picklist-backed values, use configured labels. Housing Unit ID should be the Salesforce record ID of the target housing unit.',
        })}
        ${screenFieldXml({
          name: 'Animal_Display_Name',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Animal Display Name',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Estimated_Age_Months_Value',
          fieldType: 'InputField',
          dataType: 'Number',
          fieldText: 'Estimated Age (Months)',
          helpText: 'Provide a whole number of months when exact date of birth is unknown.',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Species_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Species',
          helpText: 'Use one of the configured values, for example Dog or Cat.',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Sex_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Sex',
          helpText: 'Use one of the configured values, for example Female, Male, Intersex, or Unknown.',
          isRequired: false,
        })}
        ${screenFieldXml({
          name: 'Intake_Source_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Intake Source',
          helpText: 'Use one of the configured values, for example Stray or Owner Surrender.',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Intake_DateTime_Value',
          fieldType: 'InputField',
          dataType: 'DateTime',
          fieldText: 'Intake Date Time',
          helpText: 'Defaults to the current org date and time. Update it if the intake happened earlier.',
          defaultValue: { elementReference: '$Flow.CurrentDateTime' },
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Housing_Unit_Id_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Housing Unit Id',
          isRequired: true,
        })}
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
    </screens>
    <screens>
        <name>Success_Screen</name>
        <label>Intake Complete</label>
        <locationX>1500</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
        ${screenFieldXml({
          name: 'Success_Message',
          fieldType: 'DisplayText',
          displayText:
            'Animal intake completed successfully. Animal Id: {!varAnimalId} Episode Id: {!varEpisodeId}.',
        })}
    </screens>
    <screens>
        <name>Error_Screen</name>
        <label>Intake Error</label>
        <locationX>1040</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
        ${screenFieldXml({
          name: 'Error_Message',
          fieldType: 'DisplayText',
          displayText: 'The intake flow could not complete. {!$Flow.FaultMessage}',
        })}
    </screens>
    <recordCreates>
        <name>Create_Animal</name>
        <label>Create Animal</label>
        <locationX>500</locationX>
        <locationY>80</locationY>
        <assignRecordIdToReference>varAnimalId</assignRecordIdToReference>
        <connector>
            <targetReference>Create_Episode</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
${flowInputAssignmentXml('Display_Name__c', { elementReference: 'Animal_Display_Name' })}
${flowInputAssignmentXml('Estimated_Age_Months__c', { elementReference: 'Estimated_Age_Months_Value' })}
${flowInputAssignmentXml('Species__c', { elementReference: 'Species_Value' })}
${flowInputAssignmentXml('Sex__c', { elementReference: 'Sex_Value' })}
        <object>Animal__c</object>
    </recordCreates>
    <recordCreates>
        <name>Create_Episode</name>
        <label>Create Episode</label>
        <locationX>700</locationX>
        <locationY>80</locationY>
        <assignRecordIdToReference>varEpisodeId</assignRecordIdToReference>
        <connector>
            <targetReference>Create_Intake_Event</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
${flowInputAssignmentXml('Animal__c', { elementReference: 'varAnimalId' })}
${flowInputAssignmentXml('Episode_Type__c', { stringValue: 'Intake' })}
${flowInputAssignmentXml('Episode_Status__c', { stringValue: 'Open' })}
${flowInputAssignmentXml('Is_Current__c', { booleanValue: true })}
${flowInputAssignmentXml('Intake_DateTime__c', { elementReference: 'Intake_DateTime_Value' })}
${flowInputAssignmentXml('Intake_Source__c', { elementReference: 'Intake_Source_Value' })}
        <object>Animal_Episode__c</object>
    </recordCreates>
    <recordCreates>
        <name>Create_Intake_Event</name>
        <label>Create Intake Event</label>
        <locationX>900</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Create_Location_Stay</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
${flowInputAssignmentXml('Animal_Episode__c', { elementReference: 'varEpisodeId' })}
${flowInputAssignmentXml('Source__c', { elementReference: 'Intake_Source_Value' })}
${flowInputAssignmentXml('Event_DateTime__c', { elementReference: 'Intake_DateTime_Value' })}
        <object>Intake_Event__c</object>
    </recordCreates>
    <recordCreates>
        <name>Create_Location_Stay</name>
        <label>Create Location Stay</label>
        <locationX>1100</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Run_Rollup_Subflow</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
${flowInputAssignmentXml('Animal_Episode__c', { elementReference: 'varEpisodeId' })}
${flowInputAssignmentXml('Housing_Unit__c', { elementReference: 'Housing_Unit_Id_Value' })}
${flowInputAssignmentXml('Start_DateTime__c', { elementReference: 'Intake_DateTime_Value' })}
${flowInputAssignmentXml('Is_Current__c', { booleanValue: true })}
${flowInputAssignmentXml('Move_Reason__c', { stringValue: 'Intake Placement' })}
        <object>Animal_Location_Stay__c</object>
    </recordCreates>
    <subflows>
        <name>Run_Rollup_Subflow</name>
        <label>Run Rollup Subflow</label>
        <locationX>1300</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Success_Screen</targetReference>
        </connector>
        <flowName>A360_Animal_Current_State_Rollup_Flow</flowName>
${flowSubflowInputXml('episodeId', { elementReference: 'varEpisodeId' })}
    </subflows>
    <start>
        <locationX>40</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Enter_Intake_Details</targetReference>
        </connector>
    </start>
    <status>Active</status>
    <variables>
        <name>varAnimalId</name>
        <dataType>String</dataType>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
    </variables>
    <variables>
        <name>varEpisodeId</name>
        <dataType>String</dataType>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
    </variables>
</Flow>`;
}

function buildMoveFlowXml() {
  return `<Flow xmlns="${XMLNS}">
    <apiVersion>${API_VERSION}</apiVersion>
    <interviewLabel>Move Animal {!$Flow.CurrentDateTime}</interviewLabel>
    <label>Move Animal Flow</label>
    <processType>Flow</processType>
    <runInMode>SystemModeWithSharing</runInMode>
    <screens>
        <name>Enter_Move_Details</name>
        <label>Enter Move Details</label>
        <locationX>260</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <connector>
            <targetReference>Close_Current_Stay</targetReference>
        </connector>
        ${screenFieldXml({
          name: 'Move_Instructions',
          fieldType: 'DisplayText',
          displayText:
            'Enter the episode Id, the destination housing unit Id, and the move details. Picklist-backed fields require the exact configured labels.',
        })}
        ${screenFieldXml({
          name: 'Episode_Id_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Episode Id',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'New_Housing_Unit_Id_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'New Housing Unit Id',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Move_DateTime_Value',
          fieldType: 'InputField',
          dataType: 'DateTime',
          fieldText: 'Move Date Time',
          helpText: 'Defaults to the current org date and time. Update it if the move happened earlier.',
          defaultValue: { elementReference: '$Flow.CurrentDateTime' },
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Move_Reason_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Move Reason',
          helpText: 'Use one of the configured values, for example Routine Move or Medical Isolation.',
          isRequired: true,
        })}
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
    </screens>
    <screens>
        <name>Success_Screen</name>
        <label>Move Complete</label>
        <locationX>1120</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
        ${screenFieldXml({
          name: 'Success_Message',
          fieldType: 'DisplayText',
          displayText:
            'Animal move completed successfully. Episode Id: {!Episode_Id_Value} New Stay Id: {!varNewStayId}.',
        })}
    </screens>
    <screens>
        <name>Error_Screen</name>
        <label>Move Error</label>
        <locationX>920</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
        ${screenFieldXml({
          name: 'Error_Message',
          fieldType: 'DisplayText',
          displayText: 'The move flow could not complete. {!$Flow.FaultMessage}',
        })}
    </screens>
    <recordUpdates>
        <name>Close_Current_Stay</name>
        <label>Close Current Stay</label>
        <locationX>480</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Create_New_Stay</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
        <filters>
            <field>Animal_Episode__c</field>
            <operator>EqualTo</operator>
            <value><elementReference>Episode_Id_Value</elementReference></value>
        </filters>
        <filters>
            <field>Is_Current__c</field>
            <operator>EqualTo</operator>
            <value><booleanValue>true</booleanValue></value>
        </filters>
${flowInputAssignmentXml('End_DateTime__c', { elementReference: 'Move_DateTime_Value' })}
${flowInputAssignmentXml('Is_Current__c', { booleanValue: false })}
        <object>Animal_Location_Stay__c</object>
    </recordUpdates>
    <recordCreates>
        <name>Create_New_Stay</name>
        <label>Create New Stay</label>
        <locationX>680</locationX>
        <locationY>80</locationY>
        <assignRecordIdToReference>varNewStayId</assignRecordIdToReference>
        <connector>
            <targetReference>Run_Rollup_Subflow</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
${flowInputAssignmentXml('Animal_Episode__c', { elementReference: 'Episode_Id_Value' })}
${flowInputAssignmentXml('Housing_Unit__c', { elementReference: 'New_Housing_Unit_Id_Value' })}
${flowInputAssignmentXml('Start_DateTime__c', { elementReference: 'Move_DateTime_Value' })}
${flowInputAssignmentXml('Is_Current__c', { booleanValue: true })}
${flowInputAssignmentXml('Move_Reason__c', { elementReference: 'Move_Reason_Value' })}
        <object>Animal_Location_Stay__c</object>
    </recordCreates>
    <subflows>
        <name>Run_Rollup_Subflow</name>
        <label>Run Rollup Subflow</label>
        <locationX>880</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Success_Screen</targetReference>
        </connector>
        <flowName>A360_Animal_Current_State_Rollup_Flow</flowName>
${flowSubflowInputXml('episodeId', { elementReference: 'Episode_Id_Value' })}
    </subflows>
    <start>
        <locationX>40</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Enter_Move_Details</targetReference>
        </connector>
    </start>
    <status>Active</status>
    <variables>
        <name>varNewStayId</name>
        <dataType>String</dataType>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
    </variables>
</Flow>`;
}

function buildCloseFlowXml() {
  return `<Flow xmlns="${XMLNS}">
    <apiVersion>${API_VERSION}</apiVersion>
    <interviewLabel>Close Episode {!$Flow.CurrentDateTime}</interviewLabel>
    <label>Close Episode Flow</label>
    <processType>Flow</processType>
    <runInMode>SystemModeWithSharing</runInMode>
    <screens>
        <name>Enter_Close_Details</name>
        <label>Enter Close Details</label>
        <locationX>260</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <connector>
            <targetReference>Create_Outcome_Event</targetReference>
        </connector>
        ${screenFieldXml({
          name: 'Close_Instructions',
          fieldType: 'DisplayText',
          displayText:
            'Enter the episode Id and closeout details. Outcome Type must use one of the configured labels such as Adopted or Returned to Owner.',
        })}
        ${screenFieldXml({
          name: 'Episode_Id_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Episode Id',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Outcome_Type_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Outcome Type',
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Outcome_DateTime_Value',
          fieldType: 'InputField',
          dataType: 'DateTime',
          fieldText: 'Outcome Date Time',
          helpText: 'Defaults to the current org date and time. Update it if the outcome happened earlier.',
          defaultValue: { elementReference: '$Flow.CurrentDateTime' },
          isRequired: true,
        })}
        ${screenFieldXml({
          name: 'Outcome_Notes_Value',
          fieldType: 'InputField',
          dataType: 'String',
          fieldText: 'Outcome Notes',
          isRequired: false,
        })}
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
    </screens>
    <screens>
        <name>Success_Screen</name>
        <label>Close Complete</label>
        <locationX>1320</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
        ${screenFieldXml({
          name: 'Success_Message',
          fieldType: 'DisplayText',
          displayText:
            'Episode close completed successfully. Episode Id: {!Episode_Id_Value} Outcome Event Id: {!varOutcomeEventId}.',
        })}
    </screens>
    <screens>
        <name>Error_Screen</name>
        <label>Close Error</label>
        <locationX>1120</locationX>
        <locationY>80</locationY>
        <allowBack>false</allowBack>
        <allowPause>false</allowPause>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
        ${screenFieldXml({
          name: 'Error_Message',
          fieldType: 'DisplayText',
          displayText: 'The close flow could not complete. {!$Flow.FaultMessage}',
        })}
    </screens>
    <recordCreates>
        <name>Create_Outcome_Event</name>
        <label>Create Outcome Event</label>
        <locationX>480</locationX>
        <locationY>80</locationY>
        <assignRecordIdToReference>varOutcomeEventId</assignRecordIdToReference>
        <connector>
            <targetReference>Close_Current_Stay</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
${flowInputAssignmentXml('Animal_Episode__c', { elementReference: 'Episode_Id_Value' })}
${flowInputAssignmentXml('Outcome_Type__c', { elementReference: 'Outcome_Type_Value' })}
${flowInputAssignmentXml('Event_DateTime__c', { elementReference: 'Outcome_DateTime_Value' })}
${flowInputAssignmentXml('Notes__c', { elementReference: 'Outcome_Notes_Value' })}
        <object>Outcome_Event__c</object>
    </recordCreates>
    <recordUpdates>
        <name>Close_Current_Stay</name>
        <label>Close Current Stay</label>
        <locationX>680</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Close_Episode</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
        <filters>
            <field>Animal_Episode__c</field>
            <operator>EqualTo</operator>
            <value><elementReference>Episode_Id_Value</elementReference></value>
        </filters>
        <filters>
            <field>Is_Current__c</field>
            <operator>EqualTo</operator>
            <value><booleanValue>true</booleanValue></value>
        </filters>
${flowInputAssignmentXml('End_DateTime__c', { elementReference: 'Outcome_DateTime_Value' })}
${flowInputAssignmentXml('Is_Current__c', { booleanValue: false })}
        <object>Animal_Location_Stay__c</object>
    </recordUpdates>
    <recordUpdates>
        <name>Close_Episode</name>
        <label>Close Episode</label>
        <locationX>880</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Run_Rollup_Subflow</targetReference>
        </connector>
        <faultConnector>
            <targetReference>Error_Screen</targetReference>
        </faultConnector>
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
            <value><elementReference>Episode_Id_Value</elementReference></value>
        </filters>
${flowInputAssignmentXml('End_DateTime__c', { elementReference: 'Outcome_DateTime_Value' })}
${flowInputAssignmentXml('Episode_Status__c', { stringValue: 'Closed' })}
${flowInputAssignmentXml('Is_Current__c', { booleanValue: false })}
${flowInputAssignmentXml('Outcome_Type__c', { elementReference: 'Outcome_Type_Value' })}
        <object>Animal_Episode__c</object>
    </recordUpdates>
    <subflows>
        <name>Run_Rollup_Subflow</name>
        <label>Run Rollup Subflow</label>
        <locationX>1080</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Success_Screen</targetReference>
        </connector>
        <flowName>A360_Animal_Current_State_Rollup_Flow</flowName>
${flowSubflowInputXml('episodeId', { elementReference: 'Episode_Id_Value' })}
    </subflows>
    <start>
        <locationX>40</locationX>
        <locationY>80</locationY>
        <connector>
            <targetReference>Enter_Close_Details</targetReference>
        </connector>
    </start>
    <status>Active</status>
    <variables>
        <name>varOutcomeEventId</name>
        <dataType>String</dataType>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
    </variables>
</Flow>`;
}

function buildManifestXml() {
  const metadataTypes = [
    'ApexClass',
    'ApexTrigger',
    'CustomApplication',
    'CustomObject',
    'CustomTab',
    'Flow',
    'GlobalValueSet',
    'Layout',
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

function collectFieldPermissions() {
  const permissions = [];
  for (const objectDef of customObjects) {
    for (const field of objectDef.fields) {
      if (field.kind != 'MasterDetail' && field.required != true) {
        permissions.push(fieldPath(objectDef.apiName, field.apiName));
      }
    }
  }
  for (const [objectApiName, fields] of Object.entries(standardObjectFields)) {
    for (const field of fields) {
      permissions.push(fieldPath(objectApiName, field.apiName));
    }
  }
  return permissions;
}

function permissionSetConfigs() {
  const allFieldPaths = collectFieldPermissions();
  const customObjectApis = customObjects.map((item) => item.apiName);
  const standardObjectApis = Object.keys(standardObjectFields);
  const allObjects = [...customObjectApis, ...standardObjectApis];

  const adminFieldPermissions = allFieldPaths.map((field) => ({
    field,
    readable: true,
    editable: true,
  }));

  const careManagerFieldPermissions = allFieldPaths.map((field) => ({
    field,
    readable: true,
    editable: !systemManagedFieldPaths.has(field),
  }));

  const readOnlyFieldPermissions = allFieldPaths.map((field) => ({
    field,
    readable: true,
    editable: false,
  }));

  const adminObjectPermissions = allObjects.map((object) => ({
    object,
    allowCreate: true,
    allowDelete: true,
    allowEdit: true,
    allowRead: true,
    modifyAllRecords: customObjectApis.includes(object),
    viewAllRecords: true,
  }));

  const careManagerObjectPermissions = allObjects.map((object) => ({
    object,
    allowCreate: true,
    allowDelete: false,
    allowEdit: true,
    allowRead: true,
    modifyAllRecords: false,
    viewAllRecords: true,
  }));

  const readOnlyObjectPermissions = allObjects.map((object) => ({
    object,
    allowCreate: false,
    allowDelete: false,
    allowEdit: false,
    allowRead: true,
    modifyAllRecords: false,
    viewAllRecords: true,
  }));

  return [
    {
      apiName: 'Animal360_Admin',
      label: 'Animal360 Admin',
      description: 'Administrative access for Love 4 Animals operations.',
      applications: [customApp.apiName],
      classAccesses: classNames,
      fieldPermissions: adminFieldPermissions,
      flowAccesses: flowNames,
      objectPermissions: adminObjectPermissions,
      tabs: customTabs.map((item) => item.apiName),
      userPermissions: ['RunFlow', 'RunReports'],
    },
    {
      apiName: 'Animal360_Care_Manager',
      label: 'Animal360 Care Manager',
      description: 'Operational access for animal intake, movement, and closeout.',
      applications: [customApp.apiName],
      classAccesses: ['A360AnimalRollupService'],
      fieldPermissions: careManagerFieldPermissions,
      flowAccesses: ['A360_Intake_Flow', 'A360_Move_Animal_Flow', 'A360_Close_Episode_Flow'],
      objectPermissions: careManagerObjectPermissions,
      tabs: customTabs.map((item) => item.apiName),
      userPermissions: ['RunFlow', 'RunReports'],
    },
    {
      apiName: 'Animal360_Read_Only',
      label: 'Animal360 Read Only',
      description: 'Read-only reporting and lookup access for Love 4 Animals operations.',
      applications: [customApp.apiName],
      classAccesses: [],
      fieldPermissions: readOnlyFieldPermissions,
      flowAccesses: [],
      objectPermissions: readOnlyObjectPermissions,
      tabs: customTabs.map((item) => item.apiName),
      userPermissions: ['RunReports'],
    },
  ];
}

async function writeDocs() {
  const markdown = `# Core Operations Implementation Assumptions

## Delivery Defaults

- The repository remains a single-package Salesforce DX project rooted at \`force-app\`.
- The package has no namespace and continues to target API version ${API_VERSION}.
- Initial validation is expected against the authenticated org alias \`animal360\`, with scratch-org support remaining optional.
- Record types, packaged distribution, and additional welfare metadata-driven assessment work remain out of scope for this delivery.

## Data And Integrity Decisions

- \`Animal__c\`, \`Housing_Unit__c\`, and \`Animal_Relationship__c\` use public read/write sharing to avoid blocking early operational rollout.
- Child records that are lifecycle-dependent on a parent record use master-detail and inherit sharing from the parent.
- Cross-record integrity rules are enforced in Apex trigger handlers, not validation rules, when the rule spans multiple rows:
  - one primary identifier per animal
  - one current episode per animal
  - one current stay per episode
  - no overlapping location stays within an episode
- Current-state summary fields on \`Animal__c\` and \`Animal_Episode__c\` are system-maintained. Care Manager access keeps those fields read-only.

## Automation Decisions

- Guided operational capture is delivered with three simple screen flows:
  - \`A360_Intake_Flow\`
  - \`A360_Move_Animal_Flow\`
  - \`A360_Close_Episode_Flow\`
- The screen flows deliberately accept Salesforce record IDs for lookup inputs to keep the metadata bundle deployable without extra LWC work.
- A shared autolaunched flow, \`A360_Animal_Current_State_Rollup_Flow\`, wraps the Apex rollup service and is reused by operational flows and thin record-trigger wrappers.

## Reporting And Access

- Starter reporting is delivered with a public read-only \`Love 4 Animals\` report folder and three baseline reports over standard object report types.
- Custom report types are included for future joined reporting on animals, episodes, and housing utilisation.
- Operations personas are delivered as permission sets:
  - \`Animal360_Admin\`
  - \`Animal360_Care_Manager\`
  - \`Animal360_Read_Only\`
`;

  await writeText('docs/phase1-implementation-assumptions.md', `${markdown}\n`);
}

async function writeGlobalValueSets() {
  for (const valueSet of globalValueSets) {
    await writeXml(`force-app/main/default/globalValueSets/${valueSet.apiName}.globalValueSet-meta.xml`, buildGlobalValueSetXml(valueSet));
  }
}

async function writeObjectsAndFields() {
  for (const objectDef of customObjects) {
    await writeXml(`force-app/main/default/objects/${objectDef.apiName}/${objectDef.apiName}.object-meta.xml`, buildObjectXml(objectDef));

    for (const field of objectDef.fields) {
      await writeXml(
        `force-app/main/default/objects/${objectDef.apiName}/fields/${field.apiName}.field-meta.xml`,
        buildFieldXml(field),
      );
    }

    for (const rule of objectDef.validations) {
      await writeXml(
        `force-app/main/default/objects/${objectDef.apiName}/validationRules/${rule.apiName}.validationRule-meta.xml`,
        buildValidationRuleXml(rule),
      );
    }

    await writeXml(
      `force-app/main/default/layouts/${objectDef.apiName}-${objectDef.label} Layout.layout-meta.xml`,
      buildLayoutXml(objectDef),
    );
  }

  for (const [standardObjectApiName, fields] of Object.entries(standardObjectFields)) {
    for (const field of fields) {
      await writeXml(
        `force-app/main/default/objects/${standardObjectApiName}/fields/${field.apiName}.field-meta.xml`,
        buildFieldXml(field),
      );
    }
  }
}

async function writeTabsAndApp() {
  for (const tab of customTabs) {
    await writeXml(`force-app/main/default/tabs/${tab.apiName}.tab-meta.xml`, buildCustomTabXml(tab));
  }
  await writeXml(`force-app/main/default/applications/${customApp.apiName}.app-meta.xml`, buildCustomAppXml(customApp));
}

async function writeFlows() {
  await writeXml('force-app/main/default/flows/A360_Animal_Current_State_Rollup_Flow.flow-meta.xml', buildRollupFlowXml());
  await writeXml(
    'force-app/main/default/flows/A360_Episode_Current_State_Trigger_Flow.flow-meta.xml',
    buildEpisodeTriggerFlowXml(),
  );
  await writeXml(
    'force-app/main/default/flows/A360_Location_Stay_Current_State_Trigger_Flow.flow-meta.xml',
    buildLocationStayTriggerFlowXml(),
  );
  await writeXml('force-app/main/default/flows/A360_Intake_Flow.flow-meta.xml', buildIntakeFlowXml());
  await writeXml('force-app/main/default/flows/A360_Move_Animal_Flow.flow-meta.xml', buildMoveFlowXml());
  await writeXml('force-app/main/default/flows/A360_Close_Episode_Flow.flow-meta.xml', buildCloseFlowXml());
}

async function writePermissionSets() {
  for (const config of permissionSetConfigs()) {
    await writeXml(`force-app/main/default/permissionsets/${config.apiName}.permissionset-meta.xml`, buildPermissionSetXml(config));
  }
}

async function writeReports() {
  await writeXml(`force-app/main/default/reports/${reportFolder.apiName}.reportFolder-meta.xml`, buildReportFolderXml(reportFolder));

  for (const reportType of reportTypes) {
    await writeXml(`force-app/main/default/reportTypes/${reportType.apiName}.reportType-meta.xml`, buildReportTypeXml(reportType));
  }

  for (const reportDef of reports) {
    await writeXml(
      `force-app/main/default/reports/${reportFolder.apiName}/${reportDef.fileName}.report-meta.xml`,
      buildReportXml(reportDef),
    );
  }
}

async function writeManifest() {
  await writeXml('manifest/package.xml', buildManifestXml());
}

async function main() {
  await ensureDir(defaultDir);
  await writeDocs();
  await writeGlobalValueSets();
  await writeObjectsAndFields();
  await writeTabsAndApp();
  await writeFlows();
  await writePermissionSets();
  await writeReports();
  await writeManifest();
  process.stdout.write('Core operations metadata generated.\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
