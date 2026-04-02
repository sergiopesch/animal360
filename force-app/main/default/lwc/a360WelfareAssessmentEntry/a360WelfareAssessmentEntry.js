import { LightningElement, api } from "lwc";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";
import getAssessmentEntryContext from "@salesforce/apex/A360AssessmentTemplateService.getAssessmentEntryContext";

const ASSESSMENT_TYPE_OPTIONS = [
  { label: "Baseline", value: "Baseline" },
  { label: "Reassessment", value: "Reassessment" },
  { label: "Spot Check", value: "Spot Check" },
  { label: "Triggered Review", value: "Triggered Review" }
];

const ASSESSMENT_CONTEXT_OPTIONS = [
  { label: "Intake", value: "Intake" },
  { label: "Routine", value: "Routine" },
  { label: "Housing", value: "Housing" },
  { label: "Clinical", value: "Clinical" },
  { label: "Outcome", value: "Outcome" }
];

const ASSESSMENT_STATUS_OPTIONS = [
  { label: "Draft", value: "Draft" },
  { label: "Completed", value: "Completed" },
  { label: "Voided", value: "Voided" }
];

const GRADE_OPTIONS = [
  { label: "A", value: "A" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "D", value: "D" },
  { label: "E", value: "E" }
];

const CONFIDENCE_OPTIONS = [
  { label: "Low", value: "Low" },
  { label: "Moderate", value: "Moderate" },
  { label: "High", value: "High" }
];

const WELFARE_CONCERN_OPTIONS = [
  { label: "Low", value: "Low" },
  { label: "Moderate", value: "Moderate" },
  { label: "High", value: "High" },
  { label: "Critical", value: "Critical" }
];

const BOOLEAN_OPTIONS = [
  { label: "Select...", value: "" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" }
];

const SEVERITY_OPTIONS = [
  { label: "Low", value: "Low" },
  { label: "Moderate", value: "Moderate" },
  { label: "High", value: "High" },
  { label: "Critical", value: "Critical" }
];

const ENHANCEMENT_OPTIONS = [
  { label: "Low", value: "Low" },
  { label: "Moderate", value: "Moderate" },
  { label: "High", value: "High" }
];

const DURATION_OPTIONS = [
  { label: "Acute", value: "Acute" },
  { label: "Short Term", value: "Short Term" },
  { label: "Ongoing", value: "Ongoing" },
  { label: "Unknown", value: "Unknown" }
];

const FREQUENCY_OPTIONS = [
  { label: "Once", value: "Once" },
  { label: "Occasional", value: "Occasional" },
  { label: "Repeated", value: "Repeated" },
  { label: "Continuous", value: "Continuous" },
  { label: "Unknown", value: "Unknown" }
];

const EVIDENCE_SOURCE_OPTIONS = [
  { label: "Direct Observation", value: "Direct Observation" },
  { label: "Clinical Examination", value: "Clinical Examination" },
  { label: "Carer Report", value: "Carer Report" },
  { label: "Historical Record", value: "Historical Record" },
  { label: "Other", value: "Other" }
];

function normalizeLabel(label) {
  return (label || "").replaceAll("&#124;", "|");
}

function toLocalDateTimeValue(dateValue) {
  const localDate = new Date(
    dateValue.getTime() - dateValue.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(localValue) {
  if (!localValue) {
    return null;
  }
  return new Date(localValue).toISOString();
}

function sanitizeString(value) {
  return value === undefined || value === null ? "" : String(value);
}

function normalizeValueType(valueType) {
  if (valueType === "Boolean") {
    return "Boolean";
  }
  if (valueType === "Number" || valueType === "Numeric") {
    return "Number";
  }
  if (valueType === "DateTime") {
    return "DateTime";
  }
  if (valueType === "Text") {
    return "Text";
  }
  return "Picklist";
}

function buildIndicatorState(
  indicator,
  existingIndicator,
  domainCode,
  defaultConfidence
) {
  const valueType = normalizeValueType(indicator.valueType);
  const severityScale = indicator.defaultSeverityScale || "Negative";
  const prior = existingIndicator || {};

  return {
    indicatorKey: indicator.indicatorKey,
    indicatorLabel: indicator.indicatorLabel,
    domainCode,
    helpText: indicator.helpText,
    visibleWhenRule: indicator.visibleWhenRule,
    isRequired: indicator.isRequired === true,
    defaultSeverityScale: severityScale,
    valueType,
    isPicklist: valueType === "Picklist",
    isBoolean: valueType === "Boolean",
    isNumber: valueType === "Number",
    isText: valueType === "Text",
    isDateTime: valueType === "DateTime",
    showSeverity: severityScale === "Negative" || severityScale === "Both",
    showEnhancement: severityScale === "Positive" || severityScale === "Both",
    options: (indicator.options || []).map((option) => ({
      label: normalizeLabel(option.label),
      value: option.value
    })),
    observedBooleanValue: sanitizeString(prior.observedBooleanValue),
    observedPicklistValue: sanitizeString(prior.observedPicklistValue),
    observedNumericValue: sanitizeString(prior.observedNumericValue),
    observedText: sanitizeString(prior.observedText),
    observedDateTime: sanitizeString(prior.observedDateTime),
    severityLevel: sanitizeString(prior.severityLevel),
    enhancementLevel: sanitizeString(prior.enhancementLevel),
    duration: sanitizeString(prior.duration),
    frequency: sanitizeString(prior.frequency),
    evidenceSource: sanitizeString(prior.evidenceSource),
    confidenceLevel: sanitizeString(prior.confidenceLevel || defaultConfidence),
    requiresIntervention: prior.requiresIntervention === true,
    interventionNotes: sanitizeString(prior.interventionNotes),
    isVisible: true
  };
}

function buildDomainState(domain, existingDomain) {
  const prior = existingDomain || {};
  const priorIndicatorsByKey = new Map(
    (prior.indicators || []).map((indicator) => [
      indicator.indicatorKey,
      indicator
    ])
  );

  return {
    domainCode: domain.domainCode,
    domainLabel: domain.domainLabel,
    guidanceText: domain.guidanceText,
    defaultConfidence: sanitizeString(domain.defaultConfidence),
    displayOrder: domain.displayOrder,
    isRequired: domain.isRequired === true,
    isMentalStateDomain: domain.domainCode === "D5_Mental_State",
    negativeGrade: sanitizeString(prior.negativeGrade),
    positiveGrade: sanitizeString(prior.positiveGrade),
    keyFindings: sanitizeString(prior.keyFindings),
    inferredAffects: sanitizeString(prior.inferredAffects),
    actionRequired: prior.actionRequired === true,
    actionSummary: sanitizeString(prior.actionSummary),
    confidenceLevel: sanitizeString(
      prior.confidenceLevel || domain.defaultConfidence
    ),
    indicators: (domain.indicators || []).map((indicator) =>
      buildIndicatorState(
        indicator,
        priorIndicatorsByKey.get(indicator.indicatorKey),
        domain.domainCode,
        domain.defaultConfidence
      )
    )
  };
}

function buildFormState(template, existingState, assessmentContext) {
  const prior = existingState || {};
  const priorDomainsByCode = new Map(
    (prior.domains || []).map((domain) => [domain.domainCode, domain])
  );

  return {
    assessmentDateTime:
      sanitizeString(prior.assessmentDateTime) ||
      toLocalDateTimeValue(new Date()),
    assessmentType: sanitizeString(prior.assessmentType) || "Baseline",
    assessmentContext: sanitizeString(assessmentContext) || "Routine",
    assessmentStatus: sanitizeString(prior.assessmentStatus) || "Completed",
    confidenceLevel: sanitizeString(prior.confidenceLevel) || "High",
    immediateActionRequired: prior.immediateActionRequired === true,
    nextReviewDate: sanitizeString(prior.nextReviewDate),
    overallNegativeGrade: sanitizeString(prior.overallNegativeGrade),
    overallPositiveGrade: sanitizeString(prior.overallPositiveGrade),
    overallWelfareConcern: sanitizeString(prior.overallWelfareConcern),
    domain5MentalStateSummary: sanitizeString(prior.domain5MentalStateSummary),
    domains: (template?.domains || []).map((domain) =>
      buildDomainState(domain, priorDomainsByCode.get(domain.domainCode))
    )
  };
}

function readInputValue(event) {
  if (event.target.type === "checkbox") {
    return event.target.checked;
  }
  return event.detail?.value ?? event.target.value;
}

export default class A360WelfareAssessmentEntry extends LightningElement {
  _episodeId = "";
  _templateId = "";
  _assessmentContext = "Routine";
  _payloadJson = "";

  isLoading = false;
  loadError = "";
  validationMessage = "";

  episodeOptions = [];
  templateOptions = [];
  template = null;
  formState = buildFormState(null, null, "Routine");

  @api
  get episodeId() {
    return this._episodeId;
  }

  set episodeId(value) {
    this._episodeId = sanitizeString(value);
  }

  @api
  get templateId() {
    return this._templateId;
  }

  set templateId(value) {
    this._templateId = sanitizeString(value);
  }

  @api
  get assessmentContext() {
    return this._assessmentContext || "Routine";
  }

  set assessmentContext(value) {
    this._assessmentContext = sanitizeString(value) || "Routine";
    if (this.formState) {
      this.formState = {
        ...this.formState,
        assessmentContext: this._assessmentContext
      };
    }
  }

  @api
  get payloadJson() {
    return this._payloadJson;
  }

  set payloadJson(value) {
    this._payloadJson = sanitizeString(value);
  }

  connectedCallback() {
    this.loadContext();
  }

  get hasTemplate() {
    return this.template !== null;
  }

  get hasError() {
    return Boolean(this.loadError || this.validationMessage);
  }

  get errorMessage() {
    return this.validationMessage || this.loadError;
  }

  get assessmentTypeOptions() {
    return ASSESSMENT_TYPE_OPTIONS;
  }

  get assessmentContextOptions() {
    return ASSESSMENT_CONTEXT_OPTIONS;
  }

  get assessmentStatusOptions() {
    return ASSESSMENT_STATUS_OPTIONS;
  }

  get gradeOptions() {
    return GRADE_OPTIONS;
  }

  get confidenceOptions() {
    return CONFIDENCE_OPTIONS;
  }

  get welfareConcernOptions() {
    return WELFARE_CONCERN_OPTIONS;
  }

  get booleanOptions() {
    return BOOLEAN_OPTIONS;
  }

  get severityOptions() {
    return SEVERITY_OPTIONS;
  }

  get enhancementOptions() {
    return ENHANCEMENT_OPTIONS;
  }

  get durationOptions() {
    return DURATION_OPTIONS;
  }

  get frequencyOptions() {
    return FREQUENCY_OPTIONS;
  }

  get evidenceSourceOptions() {
    return EVIDENCE_SOURCE_OPTIONS;
  }

  get renderedDomains() {
    return this.formState.domains || [];
  }

  async loadContext() {
    this.isLoading = true;
    this.loadError = "";

    try {
      const context = await getAssessmentEntryContext({
        episodeId: this.episodeId || null,
        templateId: this.templateId || null,
        assessmentContext: this.assessmentContext || "Routine"
      });

      this._episodeId = sanitizeString(context?.selectedEpisodeId);
      this._templateId = sanitizeString(context?.selectedTemplateId);
      this._assessmentContext =
        sanitizeString(context?.assessmentContext) ||
        this.assessmentContext ||
        "Routine";
      this.template = context?.template || null;
      this.episodeOptions = (context?.episodeOptions || []).map((option) => ({
        label: normalizeLabel(option.label),
        value: option.value
      }));
      this.templateOptions = (context?.templateOptions || []).map((option) => ({
        label: normalizeLabel(option.label),
        value: option.value
      }));

      this.formState = this.applyVisibilityRules(
        buildFormState(this.template, this.formState, this.assessmentContext)
      );
      this.validationMessage = "";
      this.syncFlowOutputs();
    } catch (error) {
      this.loadError = this.reduceError(error);
    } finally {
      this.isLoading = false;
    }
  }

  async handleEpisodeChange(event) {
    this._episodeId = event.detail.value;
    await this.loadContext();
  }

  async handleTemplateChange(event) {
    this._templateId = event.detail.value;
    await this.loadContext();
  }

  async handleAssessmentContextChange(event) {
    this._assessmentContext = event.detail.value;
    this.formState = {
      ...this.formState,
      assessmentContext: this._assessmentContext
    };
    await this.loadContext();
  }

  handleHeaderChange(event) {
    const fieldName = event.target.name;
    this.formState = {
      ...this.formState,
      [fieldName]: readInputValue(event)
    };
    this.validationMessage = "";
    this.syncFlowOutputs();
  }

  handleMentalStateSummaryChange(event) {
    this.formState = {
      ...this.formState,
      domain5MentalStateSummary: event.detail.value
    };
    this.validationMessage = "";
    this.syncFlowOutputs();
  }

  handleDomainFieldChange(event) {
    const domainCode = event.target.dataset.domainCode;
    const fieldName = event.target.name;
    const nextDomains = this.renderedDomains.map((domain) => {
      if (domain.domainCode !== domainCode) {
        return domain;
      }

      return {
        ...domain,
        [fieldName]: readInputValue(event)
      };
    });

    this.formState = {
      ...this.formState,
      domains: nextDomains
    };
    this.validationMessage = "";
    this.syncFlowOutputs();
  }

  handleIndicatorFieldChange(event) {
    const domainCode = event.target.dataset.domainCode;
    const indicatorKey = event.target.dataset.indicatorKey;
    const fieldName = event.target.name;

    const nextDomains = this.renderedDomains.map((domain) => {
      if (domain.domainCode !== domainCode) {
        return domain;
      }

      return {
        ...domain,
        indicators: domain.indicators.map((indicator) => {
          if (indicator.indicatorKey !== indicatorKey) {
            return indicator;
          }

          return {
            ...indicator,
            [fieldName]: readInputValue(event)
          };
        })
      };
    });

    this.formState = this.applyVisibilityRules({
      ...this.formState,
      domains: nextDomains
    });
    this.validationMessage = "";
    this.syncFlowOutputs();
  }

  @api
  validate() {
    const messages = [];

    if (this.isLoading) {
      messages.push("Assessment entry is still loading.");
    }
    if (!this.episodeId) {
      messages.push("Select an episode before continuing.");
    }
    if (!this.templateId) {
      messages.push("Select an assessment template before continuing.");
    }
    if (!this.formState.assessmentDateTime) {
      messages.push("Assessment date and time are required.");
    }
    if (!this.formState.assessmentStatus) {
      messages.push("Assessment status is required.");
    }
    if (!this.formState.assessmentType) {
      messages.push("Assessment type is required.");
    }
    if (!this.formState.assessmentContext) {
      messages.push("Assessment context is required.");
    }

    for (const domain of this.renderedDomains) {
      if (
        domain.isMentalStateDomain &&
        domain.isRequired &&
        !this.formState.domain5MentalStateSummary
      ) {
        messages.push("Mental state summary is required.");
      }

      for (const indicator of domain.indicators) {
        if (!indicator.isVisible || !indicator.isRequired) {
          continue;
        }
        if (!this.hasPrimaryObservationValue(indicator)) {
          messages.push(`${indicator.indicatorLabel} is required.`);
        }
      }
    }

    this.validationMessage = messages.slice(0, 6).join(" ");
    this.syncFlowOutputs();

    return {
      isValid: messages.length === 0,
      errorMessage: this.validationMessage
    };
  }

  applyVisibilityRules(formState) {
    const domains = (formState.domains || []).map((domain) => ({
      ...domain,
      indicators: domain.indicators.map((indicator) => ({
        ...indicator,
        isVisible: this.evaluateVisibleWhenRule(
          indicator.visibleWhenRule,
          formState.domains || [],
          indicator
        )
      }))
    }));

    return {
      ...formState,
      domains
    };
  }

  evaluateVisibleWhenRule(rule, domains, currentIndicator) {
    if (!rule) {
      return true;
    }

    const match = rule
      .trim()
      .match(/^([A-Z0-9_]+)\s*(==|=|!=)\s*["']?([^"']+)["']?$/i);
    if (!match) {
      return true;
    }

    const [, indicatorKey, operator, expectedValue] = match;
    const referencedIndicator = (domains || [])
      .flatMap((domain) => domain.indicators || [])
      .find((indicator) => indicator.indicatorKey === indicatorKey);

    if (!referencedIndicator || referencedIndicator === currentIndicator) {
      return true;
    }

    const actualValue = sanitizeString(
      this.getComparableIndicatorValue(referencedIndicator)
    );
    return operator === "!="
      ? actualValue !== expectedValue
      : actualValue === expectedValue;
  }

  getComparableIndicatorValue(indicator) {
    if (indicator.isBoolean) {
      return indicator.observedBooleanValue;
    }
    if (indicator.isPicklist) {
      return indicator.observedPicklistValue;
    }
    if (indicator.isNumber) {
      return indicator.observedNumericValue;
    }
    if (indicator.isDateTime) {
      return indicator.observedDateTime;
    }
    return indicator.observedText;
  }

  hasPrimaryObservationValue(indicator) {
    if (indicator.isBoolean) {
      return indicator.observedBooleanValue !== "";
    }
    if (indicator.isPicklist) {
      return indicator.observedPicklistValue !== "";
    }
    if (indicator.isNumber) {
      return indicator.observedNumericValue !== "";
    }
    if (indicator.isDateTime) {
      return indicator.observedDateTime !== "";
    }
    return indicator.observedText.trim() !== "";
  }

  hasObservationData(indicator) {
    return (
      this.hasPrimaryObservationValue(indicator) ||
      indicator.severityLevel !== "" ||
      indicator.enhancementLevel !== "" ||
      indicator.duration !== "" ||
      indicator.frequency !== "" ||
      indicator.evidenceSource !== "" ||
      indicator.confidenceLevel !== "" ||
      indicator.requiresIntervention === true ||
      indicator.interventionNotes.trim() !== ""
    );
  }

  buildPayload() {
    const observations = [];
    const domainSummaries = [];

    for (const domain of this.renderedDomains) {
      const keyFindings = domain.isMentalStateDomain
        ? this.formState.domain5MentalStateSummary
        : domain.keyFindings;

      if (
        keyFindings ||
        domain.negativeGrade ||
        domain.positiveGrade ||
        domain.inferredAffects ||
        domain.actionRequired ||
        domain.actionSummary ||
        domain.confidenceLevel ||
        domain.isRequired
      ) {
        domainSummaries.push({
          domainCode: domain.domainCode,
          negativeGrade: domain.negativeGrade || null,
          positiveGrade: domain.positiveGrade || null,
          keyFindings: keyFindings || null,
          inferredAffects: domain.inferredAffects || null,
          actionRequired: domain.actionRequired === true,
          actionSummary: domain.actionSummary || null,
          confidenceLevel: domain.confidenceLevel || null
        });
      }

      for (const indicator of domain.indicators) {
        if (!indicator.isVisible || !this.hasObservationData(indicator)) {
          continue;
        }

        observations.push({
          indicatorKey: indicator.indicatorKey,
          indicatorLabel: indicator.indicatorLabel,
          domainCode: indicator.domainCode,
          observationValueType: indicator.valueType,
          observedBoolean:
            indicator.isBoolean && indicator.observedBooleanValue !== ""
              ? indicator.observedBooleanValue === "true"
              : null,
          observedPicklistValue: indicator.isPicklist
            ? indicator.observedPicklistValue || null
            : null,
          observedNumericValue:
            indicator.isNumber && indicator.observedNumericValue !== ""
              ? Number(indicator.observedNumericValue)
              : null,
          observedText: indicator.isText
            ? indicator.observedText || null
            : null,
          observedDateTime: indicator.isDateTime
            ? toIsoDateTime(indicator.observedDateTime)
            : null,
          severityLevel: indicator.severityLevel || null,
          enhancementLevel: indicator.enhancementLevel || null,
          duration: indicator.duration || null,
          frequency: indicator.frequency || null,
          evidenceSource: indicator.evidenceSource || null,
          confidenceLevel: indicator.confidenceLevel || null,
          requiresIntervention: indicator.requiresIntervention === true,
          interventionNotes: indicator.interventionNotes || null
        });
      }
    }

    return {
      assessmentDateTime: toIsoDateTime(this.formState.assessmentDateTime),
      assessmentType: this.formState.assessmentType || null,
      assessmentContext: this.formState.assessmentContext || null,
      assessmentStatus: this.formState.assessmentStatus || null,
      overallNegativeGrade: this.formState.overallNegativeGrade || null,
      overallPositiveGrade: this.formState.overallPositiveGrade || null,
      overallWelfareConcern: this.formState.overallWelfareConcern || null,
      domain5MentalStateSummary:
        this.formState.domain5MentalStateSummary || null,
      confidenceLevel: this.formState.confidenceLevel || null,
      immediateActionRequired: this.formState.immediateActionRequired === true,
      nextReviewDate: this.formState.nextReviewDate || null,
      domainSummaries,
      observations
    };
  }

  syncFlowOutputs() {
    this._payloadJson = JSON.stringify(this.buildPayload());
    this.dispatchFlowAttributeChange("episodeId", this.episodeId || "");
    this.dispatchFlowAttributeChange("templateId", this.templateId || "");
    this.dispatchFlowAttributeChange(
      "assessmentContext",
      this.assessmentContext || "Routine"
    );
    this.dispatchFlowAttributeChange("payloadJson", this.payloadJson);
  }

  dispatchFlowAttributeChange(attributeName, value) {
    this.dispatchEvent(new FlowAttributeChangeEvent(attributeName, value));
  }

  reduceError(error) {
    if (Array.isArray(error?.body)) {
      return error.body.map((item) => item.message).join(", ");
    }
    if (error?.body?.message) {
      return error.body.message;
    }
    if (error?.message) {
      return error.message;
    }
    return "Unable to load the assessment entry template.";
  }
}
