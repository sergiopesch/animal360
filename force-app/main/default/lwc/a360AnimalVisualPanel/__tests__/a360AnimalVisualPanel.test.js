import { createElement } from "lwc";
import { getRecord } from "lightning/uiRecordApi";
import { registerLdsTestWireAdapter } from "@salesforce/sfdx-lwc-jest";
import A360AnimalVisualPanel from "c/a360AnimalVisualPanel";

const getRecordAdapter = registerLdsTestWireAdapter(getRecord);

const RECORD = {
  fields: {
    Name: { value: "AN-00740" },
    Display_Name__c: { value: "Clover" },
    Species__c: { value: "Rabbit", displayValue: "Rabbit" },
    Breed_Primary__c: { value: "Mini Lop" },
    Sex__c: { value: "Female", displayValue: "Female" },
    Estimated_Age_Months__c: { value: 14 },
    Primary_Image_URL__c: {
      value:
        "https://storm-c55da5b5b54501.my.salesforce.com/sfc/servlet.shepherd/version/download/068J600000JmZbvIAF"
    },
    Current_Welfare_Risk__c: { value: "High", displayValue: "High" },
    Current_Status__c: { value: "In Care", displayValue: "In Care" },
    Current_Care_Status__c: { value: "Open", displayValue: "Open" },
    Current_Housing_Unit__c: { value: "a10J60000000001IAA" }
  }
};

function flushPromises() {
  return Promise.resolve();
}

describe("c-a360-animal-visual-panel", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders a colorful animal snapshot from LDS data", async () => {
    const element = createElement("c-a360-animal-visual-panel", {
      is: A360AnimalVisualPanel
    });
    element.recordId = "a07J60000038p7QIAQ";
    document.body.appendChild(element);

    getRecordAdapter.emit(RECORD);
    await flushPromises();

    expect(element.shadowRoot.textContent).toContain("Clover");
    expect(element.shadowRoot.textContent).toContain("AN-00740");
    expect(element.shadowRoot.textContent).toContain("High Risk");
    expect(element.shadowRoot.textContent).toContain("★★★★");
    expect(element.shadowRoot.textContent).toContain("In Care");
    expect(element.shadowRoot.textContent).toContain("Open");
    expect(element.shadowRoot.textContent).toContain("1y 2m");
    expect(element.shadowRoot.querySelector(".panel").className).toContain(
      "risk-high"
    );
    expect(
      element.shadowRoot.querySelector(".hero-image").getAttribute("src")
    ).toContain("/sfc/servlet.shepherd/version/download/");
  });
});
