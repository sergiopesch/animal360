import { LightningElement, track, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import getMapContext from "@salesforce/apex/A360EstateMapService.getMapContext";
import saveAreas from "@salesforce/apex/A360EstateMapService.saveAreas";
import publishMap from "@salesforce/apex/A360EstateMapService.publishMap";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

const GRID_SIZE = 1;

export default class A360EstateMap extends LightningElement {
  @track context;
  @track draftAreas = [];
  @track selectedAreaId;

  wiredContext;
  editMode = false;
  isSaving = false;
  riskFilter = "All";
  speciesFilter = "All";
  dragState;

  @wire(getMapContext, { mapId: null })
  wiredMapContext(value) {
    this.wiredContext = value;
    const { data, error } = value;
    if (data) {
      this.context = data;
      this.draftAreas = this.cloneAreas(data.areas);
      this.selectedAreaId = this.draftAreas[0]?.id;
    } else if (error) {
      this.showToast("Map unavailable", this.reduceError(error), "error");
    }
  }

  get hasMap() {
    return Boolean(this.context?.mapId);
  }

  get canEdit() {
    return Boolean(this.context?.canEdit);
  }

  get mapTitle() {
    return this.context?.mapName || "Animal360 Estate Map";
  }

  get mapStatusLabel() {
    return this.context?.status || "No map";
  }

  get modeLabel() {
    return this.editMode ? "Editing" : "Live";
  }

  get modeVariant() {
    return this.editMode ? "warning" : "success";
  }

  get toggleEditLabel() {
    return this.editMode ? "Done" : "Edit";
  }

  get mapAreas() {
    const animalCounts = this.filteredAnimals.reduce((counts, animal) => {
      counts[animal.areaId] = (counts[animal.areaId] || 0) + 1;
      return counts;
    }, {});

    return this.draftAreas.map((area) => {
      const occupancy = animalCounts[area.id] || 0;
      const capacity = Number(area.capacity || 0);
      const selected = area.id === this.selectedAreaId;
      return {
        ...area,
        className: `map-area ${selected ? "is-selected" : ""} ${
          this.editMode ? "is-editable" : ""
        }`,
        style: [
          `left:${area.x}%`,
          `top:${area.y}%`,
          `width:${area.width}%`,
          `height:${area.height}%`,
          `--area-fill:${area.fillColor || "#d8e6fe"}`,
          `transform:rotate(${area.rotation || 0}deg)`
        ].join(";"),
        occupancyLabel: `${occupancy}/${capacity || "?"}`,
        occupancyClass:
          capacity && occupancy >= capacity ? "occupancy is-full" : "occupancy"
      };
    });
  }

  get selectedArea() {
    return this.draftAreas.find((area) => area.id === this.selectedAreaId);
  }

  get selectedAreaName() {
    return this.selectedArea?.label || "Select an area";
  }

  get hasSelectedArea() {
    return Boolean(this.selectedArea);
  }

  get housingOptions() {
    return [
      { label: "Unlinked area", value: "" },
      ...(this.context?.housingOptions || []).map((option) => ({
        label: `${option.label} (${option.housingType || "Unit"})`,
        value: option.id
      }))
    ];
  }

  get speciesOptions() {
    return [
      { label: "All species", value: "All" },
      { label: "Dogs", value: "Dog" },
      { label: "Cats", value: "Cat" },
      { label: "Rabbits", value: "Rabbit" },
      { label: "Birds", value: "Bird" },
      { label: "Small mammals", value: "Small Mammal" },
      { label: "Other", value: "Other" }
    ];
  }

  get riskOptions() {
    return [
      { label: "All risks", value: "All" },
      { label: "Critical", value: "Critical" },
      { label: "High", value: "High" },
      { label: "Moderate", value: "Moderate" },
      { label: "Low", value: "Low" }
    ];
  }

  get filteredAnimals() {
    return (this.context?.animals || []).filter((animal) => {
      const speciesMatches =
        this.speciesFilter === "All" || animal.species === this.speciesFilter;
      const riskMatches =
        this.riskFilter === "All" || animal.welfareRisk === this.riskFilter;
      return speciesMatches && riskMatches;
    });
  }

  get animalTokens() {
    const areasById = new Map(this.draftAreas.map((area) => [area.id, area]));
    const areaSlots = {};

    return this.filteredAnimals
      .map((animal) => {
        const area = areasById.get(animal.areaId);
        if (!area) {
          return null;
        }
        const slot = areaSlots[animal.areaId] || 0;
        areaSlots[animal.areaId] = slot + 1;

        const column = slot % 4;
        const row = Math.floor(slot / 4);
        const left =
          Number(area.x) + Math.min(Number(area.width) - 5, 2 + column * 5);
        const top =
          Number(area.y) + Math.min(Number(area.height) - 7, 35 + row * 8);

        return {
          ...animal,
          key: `${animal.animalId}-${slot}`,
          icon: this.speciesIcon(animal.species),
          className: `animal-token ${this.riskClass(animal.welfareRisk)}`,
          style: `left:${left}%;top:${top}%`,
          title: `${animal.animalName || "Animal"} - ${animal.species || "Unknown"}`
        };
      })
      .filter(Boolean);
  }

  get connectionLines() {
    const areasById = new Map(this.draftAreas.map((area) => [area.id, area]));
    return (this.context?.connections || [])
      .map((connection) => {
        const fromArea = areasById.get(connection.fromAreaId);
        const toArea = areasById.get(connection.toAreaId);
        if (!fromArea || !toArea) {
          return null;
        }
        return {
          ...connection,
          x1: Number(fromArea.x) + Number(fromArea.width) / 2,
          y1: Number(fromArea.y) + Number(fromArea.height) / 2,
          x2: Number(toArea.x) + Number(toArea.width) / 2,
          y2: Number(toArea.y) + Number(toArea.height) / 2,
          stroke: connection.strokeColor || "#667085"
        };
      })
      .filter(Boolean);
  }

  get totalsLabel() {
    return `${this.filteredAnimals.length} visible animals`;
  }

  handleToggleEdit() {
    if (!this.canEdit) {
      return;
    }
    this.editMode = !this.editMode;
  }

  handleRiskFilter(event) {
    this.riskFilter = event.detail.value;
  }

  handleSpeciesFilter(event) {
    this.speciesFilter = event.detail.value;
  }

  handleAreaPointerDown(event) {
    const areaId = event.currentTarget.dataset.id;
    this.selectedAreaId = areaId;
    if (!this.editMode) {
      return;
    }
    const area = this.draftAreas.find((candidate) => candidate.id === areaId);
    const mapElement = this.template.querySelector(".map-canvas");
    if (!area || !mapElement) {
      return;
    }
    event.preventDefault();
    this.dragState = {
      areaId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: Number(area.x),
      startY: Number(area.y),
      bounds: mapElement.getBoundingClientRect()
    };
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
  }

  handlePointerMove = (event) => {
    if (!this.dragState) {
      return;
    }
    const dx =
      ((event.clientX - this.dragState.startClientX) /
        this.dragState.bounds.width) *
      100;
    const dy =
      ((event.clientY - this.dragState.startClientY) /
        this.dragState.bounds.height) *
      100;
    this.updateArea(this.dragState.areaId, {
      x: this.snap(this.dragState.startX + dx),
      y: this.snap(this.dragState.startY + dy)
    });
  };

  handlePointerUp = () => {
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.dragState = null;
  };

  handleFieldChange(event) {
    if (!this.selectedArea) {
      return;
    }
    const field = event.currentTarget.dataset.field;
    let value = event.detail?.value ?? event.target.value;
    if (["x", "y", "width", "height", "rotation"].includes(field)) {
      value = Number(value);
    }
    this.updateArea(this.selectedAreaId, { [field]: value });
  }

  handleAddArea() {
    const nextNumber = this.draftAreas.length + 1;
    this.draftAreas = [
      ...this.draftAreas,
      {
        id: `draft-${Date.now()}`,
        areaCode: `AREA-${nextNumber}`,
        label: `New Area ${nextNumber}`,
        zone: "Estate",
        shape: "Rounded Rectangle",
        x: 8,
        y: 8,
        width: 18,
        height: 14,
        rotation: 0,
        fillColor: "#e8f5e9",
        housingUnitId: "",
        displayOrder: nextNumber * 10
      }
    ];
    this.selectedAreaId = this.draftAreas[this.draftAreas.length - 1].id;
  }

  async handleSave() {
    this.isSaving = true;
    try {
      const request = this.draftAreas.map((area, index) => ({
        id: area.id?.startsWith("draft-") ? null : area.id,
        areaCode: area.areaCode,
        label: area.label,
        zone: area.zone,
        shape: area.shape,
        x: Number(area.x),
        y: Number(area.y),
        width: Number(area.width),
        height: Number(area.height),
        rotation: Number(area.rotation || 0),
        fillColor: area.fillColor,
        housingUnitId: area.housingUnitId || null,
        displayOrder: area.displayOrder || (index + 1) * 10
      }));
      const savedContext = await saveAreas({
        mapId: this.context.mapId,
        areas: request
      });
      this.context = savedContext;
      this.draftAreas = this.cloneAreas(savedContext.areas);
      await refreshApex(this.wiredContext);
      this.showToast("Map saved", "Estate layout changes are live.", "success");
    } catch (error) {
      this.showToast("Save failed", this.reduceError(error), "error");
    } finally {
      this.isSaving = false;
    }
  }

  async handlePublish() {
    this.isSaving = true;
    try {
      const publishedContext = await publishMap({ mapId: this.context.mapId });
      this.context = publishedContext;
      this.draftAreas = this.cloneAreas(publishedContext.areas);
      await refreshApex(this.wiredContext);
      this.showToast(
        "Map published",
        "This map is now the default home-page map.",
        "success"
      );
    } catch (error) {
      this.showToast("Publish failed", this.reduceError(error), "error");
    } finally {
      this.isSaving = false;
    }
  }

  updateArea(areaId, changes) {
    this.draftAreas = this.draftAreas.map((area) => {
      if (area.id !== areaId) {
        return area;
      }
      return {
        ...area,
        ...changes,
        x: this.clamp(changes.x ?? area.x, 0, 98),
        y: this.clamp(changes.y ?? area.y, 0, 98),
        width: this.clamp(changes.width ?? area.width, 3, 100),
        height: this.clamp(changes.height ?? area.height, 3, 100)
      };
    });
  }

  cloneAreas(areas) {
    return (areas || []).map((area) => ({ ...area }));
  }

  speciesIcon(species) {
    const icons = {
      Dog: "🐶",
      Cat: "🐱",
      Rabbit: "🐰",
      Bird: "🐦",
      "Small Mammal": "🐹"
    };
    return icons[species] || "🐾";
  }

  riskClass(risk) {
    return risk ? `risk-${risk.toLowerCase()}` : "risk-low";
  }

  snap(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  clamp(value, min, max) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return min;
    }
    return Math.min(max, Math.max(min, numeric));
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }

  reduceError(error) {
    if (Array.isArray(error?.body)) {
      return error.body.map((item) => item.message).join(", ");
    }
    return error?.body?.message || error?.message || "Unknown error";
  }
}
