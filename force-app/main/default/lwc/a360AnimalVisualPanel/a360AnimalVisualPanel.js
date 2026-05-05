import { LightningElement, api, wire } from "lwc";
import {
  getFieldDisplayValue,
  getFieldValue,
  getRecord
} from "lightning/uiRecordApi";

import ANIMAL_NUMBER from "@salesforce/schema/Animal__c.Name";
import DISPLAY_NAME from "@salesforce/schema/Animal__c.Display_Name__c";
import SPECIES from "@salesforce/schema/Animal__c.Species__c";
import BREED from "@salesforce/schema/Animal__c.Breed_Primary__c";
import SEX from "@salesforce/schema/Animal__c.Sex__c";
import AGE_MONTHS from "@salesforce/schema/Animal__c.Estimated_Age_Months__c";
import PRIMARY_IMAGE_URL from "@salesforce/schema/Animal__c.Primary_Image_URL__c";
import WELFARE_RISK from "@salesforce/schema/Animal__c.Current_Welfare_Risk__c";
import CURRENT_STATUS from "@salesforce/schema/Animal__c.Current_Status__c";
import CARE_STATUS from "@salesforce/schema/Animal__c.Current_Care_Status__c";
import CURRENT_HOUSING from "@salesforce/schema/Animal__c.Current_Housing_Unit__c";

const FIELDS = [
  ANIMAL_NUMBER,
  DISPLAY_NAME,
  SPECIES,
  BREED,
  SEX,
  AGE_MONTHS,
  PRIMARY_IMAGE_URL,
  WELFARE_RISK,
  CURRENT_STATUS,
  CARE_STATUS,
  CURRENT_HOUSING
];

const RISK_PROFILES = {
  Critical: {
    className: "panel risk-critical",
    label: "Critical Risk",
    stars: "★★★★★",
    score: 100
  },
  High: {
    className: "panel risk-high",
    label: "High Risk",
    stars: "★★★★",
    score: 82
  },
  Moderate: {
    className: "panel risk-moderate",
    label: "Moderate Risk",
    stars: "★★★",
    score: 58
  },
  Low: {
    className: "panel risk-low",
    label: "Low Risk",
    stars: "★",
    score: 22
  }
};

export default class A360AnimalVisualPanel extends LightningElement {
  @api recordId;

  record;
  error;

  @wire(getRecord, { recordId: "$recordId", fields: FIELDS })
  wiredRecord({ data, error }) {
    this.record = data;
    this.error = error;
  }

  get hasRecord() {
    return Boolean(this.record);
  }

  get panelClass() {
    return this.riskProfile.className;
  }

  get animalName() {
    return (
      this.fieldValue(DISPLAY_NAME) ||
      this.fieldValue(ANIMAL_NUMBER) ||
      "Animal"
    );
  }

  get animalNumber() {
    return this.fieldValue(ANIMAL_NUMBER) || "Not assigned";
  }

  get imageUrl() {
    return this.fieldValue(PRIMARY_IMAGE_URL);
  }

  get hasImage() {
    return Boolean(this.imageUrl);
  }

  get imageAlt() {
    return `${this.animalName} profile image`;
  }

  get species() {
    return this.fieldDisplayValue(SPECIES) || "Unknown species";
  }

  get breed() {
    return this.fieldValue(BREED) || "Breed not set";
  }

  get sex() {
    return this.fieldDisplayValue(SEX) || "Sex not set";
  }

  get ageLabel() {
    const months = this.fieldValue(AGE_MONTHS);
    if (months === undefined || months === null || months === "") {
      return "Age not set";
    }
    const numeric = Number(months);
    if (Number.isNaN(numeric)) {
      return "Age not set";
    }
    if (numeric < 12) {
      return `${numeric} months`;
    }
    const years = Math.floor(numeric / 12);
    const remainingMonths = numeric % 12;
    return remainingMonths ? `${years}y ${remainingMonths}m` : `${years} years`;
  }

  get risk() {
    return this.fieldDisplayValue(WELFARE_RISK) || "Not rated";
  }

  get riskProfile() {
    return (
      RISK_PROFILES[this.risk] || {
        className: "panel risk-none",
        label: "Not Rated",
        stars: "-",
        score: 0
      }
    );
  }

  get riskLabel() {
    return this.riskProfile.label;
  }

  get riskStars() {
    return this.riskProfile.stars;
  }

  get riskScoreStyle() {
    return `width:${this.riskProfile.score}%`;
  }

  get statusLabel() {
    return this.fieldDisplayValue(CURRENT_STATUS) || "Status not set";
  }

  get careLabel() {
    return this.fieldDisplayValue(CARE_STATUS) || "Care not set";
  }

  get statusClass() {
    return `chip ${this.statusToken(this.statusLabel)}`;
  }

  get careClass() {
    return `chip ${this.statusToken(this.careLabel)}`;
  }

  get housingLabel() {
    const value = this.fieldValue(CURRENT_HOUSING);
    return value ? "Housing assigned" : "Housing not assigned";
  }

  get quickFacts() {
    return [
      { label: "Species", value: this.species },
      { label: "Breed", value: this.breed },
      { label: "Sex", value: this.sex },
      { label: "Age", value: this.ageLabel }
    ];
  }

  fieldValue(field) {
    return getFieldValue(this.record, field);
  }

  fieldDisplayValue(field) {
    return (
      getFieldDisplayValue(this.record, field) ||
      getFieldValue(this.record, field)
    );
  }

  statusToken(value = "") {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
}
