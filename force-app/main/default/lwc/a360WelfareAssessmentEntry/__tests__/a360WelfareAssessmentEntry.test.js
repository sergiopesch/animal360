import { createElement } from "lwc";
import A360WelfareAssessmentEntry from "c/a360WelfareAssessmentEntry";
import getAssessmentEntryContext from "@salesforce/apex/A360AssessmentTemplateService.getAssessmentEntryContext";

jest.mock(
  "lightning/flowSupport",
  () => ({
    FlowAttributeChangeEvent: class FlowAttributeChangeEvent extends CustomEvent {
      constructor(attributeName, value) {
        super("flowattributechange", {
          detail: {
            attributeName,
            value
          }
        });
      }
    }
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/A360AssessmentTemplateService.getAssessmentEntryContext",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

const CONTEXT_RESPONSE = {
  selectedEpisodeId: "a00J60000000001IAA",
  selectedTemplateId: "a01J60000000001IAA",
  assessmentContext: "Routine",
  episodeOptions: [
    {
      label: "EP-0001 - Luna",
      value: "a00J60000000001IAA"
    }
  ],
  templateOptions: [
    {
      label: "Companion Routine | Dog | Routine | v1",
      value: "a01J60000000001IAA"
    }
  ],
  template: {
    templateId: "a01J60000000001IAA",
    templateName: "Companion Routine",
    templateCode: "COMPANION_ROUTINE",
    metadataTemplateKey: "COMPANION_ROUTINE_V1",
    version: "1",
    species: "Dog",
    context: "Routine",
    domains: [
      {
        domainCode: "D1_Nutrition",
        domainLabel: "Nutrition",
        guidanceText: "Capture intake and hydration evidence.",
        defaultConfidence: "High",
        isRequired: true,
        displayOrder: 1,
        indicators: [
          {
            indicatorKey: "APPETITE",
            indicatorLabel: "Appetite",
            domainCode: "D1_Nutrition",
            valueType: "Picklist",
            isRequired: true,
            defaultSeverityScale: "Negative",
            helpText: "Assess appetite change.",
            options: [
              { label: "Normal", value: "Normal" },
              { label: "Reduced", value: "Reduced" }
            ]
          }
        ]
      }
    ]
  }
};

function flushPromises() {
  return Promise.resolve();
}

describe("c-a360-welfare-assessment-entry", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("loads assessment context and blocks progress until required observations are captured", async () => {
    getAssessmentEntryContext.mockResolvedValue(CONTEXT_RESPONSE);
    const element = createElement("c-a360-welfare-assessment-entry", {
      is: A360WelfareAssessmentEntry
    });

    document.body.appendChild(element);
    await flushPromises();
    await flushPromises();

    expect(getAssessmentEntryContext).toHaveBeenCalledWith({
      episodeId: null,
      templateId: null,
      assessmentContext: "Routine"
    });
    expect(element.shadowRoot.querySelector(".kpi-value").textContent).toBe(
      "1"
    );

    let validationResult = element.validate();
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errorMessage).toContain("Appetite is required.");

    const observedValue = [
      ...element.shadowRoot.querySelectorAll("lightning-combobox")
    ].find(
      (combobox) =>
        combobox.name === "observedPicklistValue" ||
        combobox.getAttribute("name") === "observedPicklistValue"
    );
    expect(observedValue).not.toBeUndefined();
    observedValue.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: "Normal" }
      })
    );

    validationResult = element.validate();
    expect(validationResult.isValid).toBe(true);

    const payload = JSON.parse(element.payloadJson);
    expect(payload.observations).toHaveLength(1);
    expect(payload.observations[0]).toMatchObject({
      indicatorKey: "APPETITE",
      observedPicklistValue: "Normal"
    });
  });

  it("surfaces Apex load failures as validation errors", async () => {
    getAssessmentEntryContext.mockRejectedValue({
      body: { message: "No active assessment template found." }
    });
    const element = createElement("c-a360-welfare-assessment-entry", {
      is: A360WelfareAssessmentEntry
    });

    document.body.appendChild(element);
    await flushPromises();
    await flushPromises();

    const validationResult = element.validate();
    expect(validationResult.isValid).toBe(false);
    expect(element.shadowRoot.textContent).toContain(
      "No active assessment template found."
    );
  });
});
