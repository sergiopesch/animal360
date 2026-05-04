import { LightningElement, track, wire } from "lwc";
import getMapContext from "@salesforce/apex/A360EstateMapService.getMapContext";
import saveMapConfiguration from "@salesforce/apex/A360EstateMapService.saveMapConfiguration";
import publishMap from "@salesforce/apex/A360EstateMapService.publishMap";
import moveAnimal from "@salesforce/apex/A360EstateMapService.moveAnimal";
import updateAreaStatus from "@salesforce/apex/A360EstateMapService.updateAreaStatus";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

const GRID_SIZE = 1;

export default class A360EstateMap extends LightningElement {
  @track context;
  @track draftAreas = [];
  @track mapSettings = {};
  @track selectedAreaId;

  editMode = false;
  isSaving = false;
  riskFilter = "All";
  speciesFilter = "All";
  dragState;
  resizeState;
  animalDragState;
  movingAnimalId;
  dropTargetAreaId;
  dragPosition;

  @wire(getMapContext, { mapId: null })
  wiredMapContext(value) {
    const { data, error } = value;
    if (data) {
      this.context = data;
      this.draftAreas = this.cloneAreas(data.areas);
      this.mapSettings = this.cloneMapSettings(data);
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

  get canMove() {
    return Boolean(this.context?.canMove || this.context?.canEdit);
  }

  get workspaceClass() {
    return [
      "workspace",
      this.editMode || this.showOperationsPanel ? "has-editor" : "",
      this.isSaving ? "is-updating" : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  get mapTitle() {
    return (
      this.mapSettings?.mapName ||
      this.context?.mapName ||
      "Animal360 Estate Map"
    );
  }

  get mapStatusLabel() {
    return this.context?.status || "No map";
  }

  get mapCanvasClass() {
    return `map-canvas background-${this.backgroundClassToken(
      this.mapSettings?.backgroundStyle || this.context?.backgroundStyle
    )}`;
  }

  get mapCanvasStyle() {
    const width = Number(
      this.mapSettings?.canvasWidth || this.context?.canvasWidth || 1200
    );
    const height = Number(
      this.mapSettings?.canvasHeight || this.context?.canvasHeight || 720
    );
    const minHeight = this.clamp(height / 18, 28, 46);
    return [
      `--canvas-ratio:${width}/${height}`,
      `--canvas-min-height:${minHeight}rem`
    ].join(";");
  }

  get modeLabel() {
    if (this.editMode) {
      return "Editing layout";
    }
    return this.canMove ? "Move animals" : "Live";
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
      const dropTarget = area.id === this.dropTargetAreaId;
      const operationalStatus = area.operationalStatus || "Ready";
      return {
        ...area,
        className: `map-area ${this.shapeClass(area.shape)} ${
          selected ? "is-selected" : ""
        } ${
          this.editMode ? "is-editable" : ""
        } ${dropTarget ? "is-drop-target" : ""} ${this.areaStatusClass(
          operationalStatus
        )}`,
        style: [
          `left:${area.x}%`,
          `top:${area.y}%`,
          `width:${area.width}%`,
          `height:${area.height}%`,
          `--area-fill:${area.fillColor || "#d8e6fe"}`,
          `transform:rotate(${area.rotation || 0}deg)`
        ].join(";"),
        statusClass: `area-status ${this.areaStatusClass(operationalStatus)}`,
        statusLabel: operationalStatus,
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

  get showOperationsPanel() {
    return this.canMove && !this.editMode;
  }

  get selectedAreaStatus() {
    return this.selectedArea?.operationalStatus || "Ready";
  }

  get selectedAreaAnimals() {
    if (!this.selectedAreaId) {
      return [];
    }
    return (this.context?.animals || [])
      .filter((animal) => animal.areaId === this.selectedAreaId)
      .map((animal) => ({
        id: animal.animalId,
        label: `${animal.animalName} (${animal.species || "Unknown"})`
      }));
  }

  get selectedAreaAnimalCount() {
    return `${this.selectedAreaAnimals.length} animals`;
  }

  get areaStatusOptions() {
    return [
      { label: "Ready", value: "Ready" },
      { label: "Cleaning", value: "Cleaning" },
      { label: "Closed", value: "Closed" }
    ];
  }

  get areaShapeOptions() {
    return [
      { label: "Rounded", value: "Rounded Rectangle" },
      { label: "Rectangle", value: "Rectangle" },
      { label: "Ellipse", value: "Ellipse" }
    ];
  }

  get backgroundOptions() {
    return [
      { label: "Whiteboard", value: "Whiteboard" },
      { label: "Blueprint", value: "Blueprint" },
      { label: "Garden", value: "Garden" },
      { label: "Clinical", value: "Clinical" }
    ];
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

        const areaWidth = Number(area.width);
        const areaHeight = Number(area.height);
        const compact = areaWidth < 12 || areaHeight < 12;
        const columns = Math.max(1, Math.min(4, Math.floor(areaWidth / 7)));
        const column = slot % columns;
        const row = Math.floor(slot / columns);
        const tokenWidth = compact ? 4.6 : 6.2;
        const tokenHeight = compact ? 5.2 : 8.1;
        const labelBand = compact ? 5 : 8.2;
        const left =
          Number(area.x) +
          this.clamp(
            1.1 + column * (tokenWidth + 0.65),
            0,
            areaWidth - tokenWidth
          );
        const top =
          Number(area.y) +
          this.clamp(
            labelBand + row * (tokenHeight + 0.9),
            0,
            areaHeight - tokenHeight
          );
        const isMoving = animal.animalId === this.movingAnimalId;

        return {
          ...animal,
          key: `${animal.animalId}-${slot}`,
          className: [
            "animal-token",
            "pet-token",
            this.speciesClass(animal.species),
            this.petVariantClass(animal),
            this.riskClass(animal.welfareRisk),
            this.canMove && !this.editMode ? "is-draggable" : "",
            compact ? "is-compact" : "",
            isMoving ? "is-dragging" : ""
          ]
            .filter(Boolean)
            .join(" "),
          style: this.animalStyle(animal, isMoving ? this.dragPosition : null, {
            left,
            top
          }),
          title: `${animal.animalName || "Animal"} - ${animal.species || "Unknown"}`,
          moveLabel: ""
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

  handleAreaResizePointerDown(event) {
    if (!this.editMode) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const areaId = event.currentTarget.dataset.id;
    const area = this.draftAreas.find((candidate) => candidate.id === areaId);
    const mapElement = this.template.querySelector(".map-canvas");
    if (!area || !mapElement) {
      return;
    }
    this.selectedAreaId = areaId;
    this.resizeState = {
      areaId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: Number(area.width),
      startHeight: Number(area.height),
      bounds: mapElement.getBoundingClientRect()
    };
    window.addEventListener("pointermove", this.handleAreaResizePointerMove);
    window.addEventListener("pointerup", this.handleAreaResizePointerUp);
  }

  handleAreaResizePointerMove = (event) => {
    if (!this.resizeState) {
      return;
    }
    const dx =
      ((event.clientX - this.resizeState.startClientX) /
        this.resizeState.bounds.width) *
      100;
    const dy =
      ((event.clientY - this.resizeState.startClientY) /
        this.resizeState.bounds.height) *
      100;
    this.updateArea(this.resizeState.areaId, {
      width: this.snap(this.resizeState.startWidth + dx),
      height: this.snap(this.resizeState.startHeight + dy)
    });
  };

  handleAreaResizePointerUp = () => {
    window.removeEventListener("pointermove", this.handleAreaResizePointerMove);
    window.removeEventListener("pointerup", this.handleAreaResizePointerUp);
    this.resizeState = null;
  };

  handleAnimalPointerDown(event) {
    if (!this.canMove || this.editMode || this.isSaving) {
      return;
    }

    const animalId = event.currentTarget.dataset.animalId;
    const animal = this.filteredAnimals.find(
      (candidate) => candidate.animalId === animalId
    );
    if (!animal) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const mapElement = this.template.querySelector(".map-canvas");
    const tokenBounds = event.currentTarget.getBoundingClientRect();
    const mapBounds = mapElement?.getBoundingClientRect();
    if (!mapBounds) {
      return;
    }

    const startLeft =
      ((tokenBounds.left - mapBounds.left) / mapBounds.width) * 100;
    const startTop =
      ((tokenBounds.top - mapBounds.top) / mapBounds.height) * 100;
    const offsetX =
      ((event.clientX - tokenBounds.left) / mapBounds.width) * 100;
    const offsetY =
      ((event.clientY - tokenBounds.top) / mapBounds.height) * 100;

    this.movingAnimalId = animalId;
    this.animalDragState = {
      animalId,
      sourceAreaId: animal.areaId,
      mapBounds,
      offsetX,
      offsetY
    };
    this.dragPosition = {
      left: this.clamp(startLeft, 0, 98),
      top: this.clamp(startTop, 0, 98)
    };
    window.addEventListener("pointermove", this.handleAnimalPointerMove);
    window.addEventListener("pointerup", this.handleAnimalPointerUp);
  }

  handleAnimalPointerMove = (event) => {
    if (!this.animalDragState) {
      return;
    }
    this.dragPosition = this.positionFromPointer(event);
    this.dropTargetAreaId = this.findAreaIdAtPoint(
      event.clientX,
      event.clientY
    );
  };

  handleAnimalPointerUp = async (event) => {
    window.removeEventListener("pointermove", this.handleAnimalPointerMove);
    window.removeEventListener("pointerup", this.handleAnimalPointerUp);

    const dragState = this.animalDragState;
    const targetAreaId = this.findAreaIdAtPoint(event.clientX, event.clientY);
    this.animalDragState = null;
    this.dropTargetAreaId = null;

    if (
      !dragState ||
      !targetAreaId ||
      targetAreaId === dragState.sourceAreaId
    ) {
      this.movingAnimalId = null;
      this.dragPosition = null;
      return;
    }

    this.isSaving = true;
    try {
      const movedContext = await moveAnimal({
        mapId: this.context.mapId,
        animalId: dragState.animalId,
        targetAreaId
      });
      this.context = movedContext;
      this.draftAreas = this.cloneAreas(movedContext.areas);
      this.mapSettings = this.cloneMapSettings(movedContext);
      this.selectedAreaId = targetAreaId;
      this.showToast(
        "Animal moved",
        "The live location stay was updated.",
        "success"
      );
    } catch (error) {
      this.showToast("Move failed", this.reduceError(error), "error");
    } finally {
      this.isSaving = false;
      this.movingAnimalId = null;
      this.dragPosition = null;
    }
  };

  async handleAreaStatusChange(event) {
    if (!this.selectedAreaId || this.isSaving) {
      return;
    }

    this.isSaving = true;
    try {
      const updatedContext = await updateAreaStatus({
        mapId: this.context.mapId,
        areaId: this.selectedAreaId,
        operationalStatus: event.detail.value
      });
      this.context = updatedContext;
      this.draftAreas = this.cloneAreas(updatedContext.areas);
      this.showToast("Area updated", "The area status was updated.", "success");
    } catch (error) {
      this.showToast("Status update failed", this.reduceError(error), "error");
    } finally {
      this.isSaving = false;
    }
  }

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

  handleMapSettingChange(event) {
    const field = event.currentTarget.dataset.field;
    let value = event.detail?.value ?? event.target.value;
    if (["canvasWidth", "canvasHeight"].includes(field)) {
      value = Number(value);
    }
    this.mapSettings = {
      ...this.mapSettings,
      [field]: value
    };
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
        operationalStatus: "Ready",
        housingUnitId: "",
        displayOrder: nextNumber * 10
      }
    ];
    this.selectedAreaId = this.draftAreas[this.draftAreas.length - 1].id;
  }

  handleRemoveArea() {
    if (!this.selectedAreaId || this.draftAreas.length <= 1) {
      return;
    }
    if (this.selectedAreaAnimals.length > 0) {
      this.showToast(
        "Area still occupied",
        "Move animals out before removing this area.",
        "warning"
      );
      return;
    }
    const removedIndex = this.draftAreas.findIndex(
      (area) => area.id === this.selectedAreaId
    );
    this.draftAreas = this.draftAreas.filter(
      (area) => area.id !== this.selectedAreaId
    );
    const nextIndex = Math.min(removedIndex, this.draftAreas.length - 1);
    this.selectedAreaId = this.draftAreas[nextIndex]?.id;
  }

  handleSplitVertical() {
    this.splitSelectedArea("vertical");
  }

  handleSplitHorizontal() {
    this.splitSelectedArea("horizontal");
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
        operationalStatus: area.operationalStatus || "Ready",
        x: Number(area.x),
        y: Number(area.y),
        width: Number(area.width),
        height: Number(area.height),
        rotation: Number(area.rotation || 0),
        fillColor: area.fillColor,
        housingUnitId: area.housingUnitId || null,
        displayOrder: area.displayOrder || (index + 1) * 10
      }));
      const savedContext = await saveMapConfiguration({
        mapId: this.context.mapId,
        settings: this.mapSettings,
        areas: request
      });
      this.context = savedContext;
      this.draftAreas = this.cloneAreas(savedContext.areas);
      this.mapSettings = this.cloneMapSettings(savedContext);
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
      this.mapSettings = this.cloneMapSettings(publishedContext);
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

  splitSelectedArea(direction) {
    const area = this.selectedArea;
    if (!area) {
      return;
    }

    const isVertical = direction === "vertical";
    const newArea = {
      ...area,
      id: `draft-${Date.now()}`,
      areaCode: `${area.areaCode || "AREA"}-${isVertical ? "B" : "S"}`.slice(
        0,
        60
      ),
      label: `${area.label || "Area"} ${isVertical ? "B" : "South"}`.slice(
        0,
        80
      ),
      housingUnitId: "",
      housingUnitName: "",
      currentOccupancy: 0,
      capacity: null,
      displayOrder: (this.draftAreas.length + 1) * 10
    };

    const updates = {};
    if (isVertical) {
      const splitWidth = this.snap(Number(area.width) / 2);
      updates.width = this.clamp(splitWidth, 3, Number(area.width) - 3);
      newArea.x = this.clamp(Number(area.x) + updates.width, 0, 97);
      newArea.width = this.clamp(
        Number(area.width) - updates.width,
        3,
        100 - newArea.x
      );
    } else {
      const splitHeight = this.snap(Number(area.height) / 2);
      updates.height = this.clamp(splitHeight, 3, Number(area.height) - 3);
      newArea.y = this.clamp(Number(area.y) + updates.height, 0, 97);
      newArea.height = this.clamp(
        Number(area.height) - updates.height,
        3,
        100 - newArea.y
      );
    }

    this.updateArea(area.id, updates);
    this.draftAreas = [...this.draftAreas, newArea];
    this.selectedAreaId = newArea.id;
  }

  updateArea(areaId, changes) {
    this.draftAreas = this.draftAreas.map((area) => {
      if (area.id !== areaId) {
        return area;
      }
      const requestedWidth = changes.width ?? area.width;
      const requestedHeight = changes.height ?? area.height;
      const width = this.clamp(requestedWidth, 3, 100 - Number(area.x));
      const height = this.clamp(requestedHeight, 3, 100 - Number(area.y));
      const x = this.clamp(changes.x ?? area.x, 0, 100 - width);
      const y = this.clamp(changes.y ?? area.y, 0, 100 - height);
      return {
        ...area,
        ...changes,
        x,
        y,
        width,
        height
      };
    });
  }

  cloneAreas(areas) {
    return (areas || []).map((area) => ({ ...area }));
  }

  cloneMapSettings(context) {
    return {
      mapName: context?.mapName || "Animal360 Estate Whiteboard",
      canvasWidth: context?.canvasWidth || 1200,
      canvasHeight: context?.canvasHeight || 720,
      backgroundStyle: context?.backgroundStyle || "Whiteboard"
    };
  }

  speciesClass(species) {
    return `pet-${this.normalizedSpecies(species)}`;
  }

  petVariantClass(animal) {
    return `pet-variant-${this.hashAnimal(animal) % 12}`;
  }

  animalStyle(animal, dragPosition, homePosition) {
    const hash = this.hashAnimal(animal);
    const profile = this.petProfile(animal?.species, hash);
    const hue = profile.hue;
    const accentHue = profile.accentHue;
    const speed = 2.2 + (hash % 7) / 10;
    const markSize = 0.16 + (hash % 4) * 0.05;
    const position = dragPosition || homePosition;
    return [
      `left:${position.left}%`,
      `top:${position.top}%`,
      "display:inline-flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:flex-start",
      "min-width:4.55rem",
      "max-width:5.2rem",
      "gap:0",
      "padding:0.14rem 0.18rem 0.2rem",
      `--pet-main:hsl(${hue} ${profile.mainSaturation}% ${profile.mainLightness}%)`,
      `--pet-dark:hsl(${hue} ${profile.darkSaturation}% ${profile.darkLightness}%)`,
      `--pet-light:hsl(${accentHue} ${profile.lightSaturation}% ${profile.lightLightness}%)`,
      `--pet-speed:${speed}s`,
      `--pet-body-width:${profile.bodyWidth}rem`,
      `--pet-body-height:${profile.bodyHeight}rem`,
      `--pet-head-width:${profile.headWidth}rem`,
      `--pet-head-height:${profile.headHeight}rem`,
      `--pet-ear-height:${profile.earHeight}rem`,
      `--pet-tail-width:${profile.tailWidth}rem`,
      `--pet-mark-size:${markSize}rem`
    ].join(";");
  }

  normalizedSpecies(species) {
    return (species || "Other").toLowerCase().replace(/\s+/g, "-");
  }

  petProfile(species, hash) {
    const speciesKey = this.normalizedSpecies(species);
    const variation = ((hash % 9) - 4) * 4;
    const profiles = {
      dog: {
        hue: 28,
        accentHue: 42,
        mainSaturation: 48,
        mainLightness: 54,
        darkSaturation: 54,
        darkLightness: 27,
        lightSaturation: 80,
        lightLightness: 80,
        bodyWidth: 1.76,
        bodyHeight: 1.02,
        headWidth: 1.08,
        headHeight: 1.06,
        earHeight: 0.58,
        tailWidth: 0.72
      },
      cat: {
        hue: 30,
        accentHue: 16,
        mainSaturation: 18,
        mainLightness: 52,
        darkSaturation: 26,
        darkLightness: 24,
        lightSaturation: 82,
        lightLightness: 84,
        bodyWidth: 1.58,
        bodyHeight: 0.94,
        headWidth: 1.02,
        headHeight: 1.02,
        earHeight: 0.52,
        tailWidth: 0.86
      },
      rabbit: {
        hue: 338,
        accentHue: 20,
        mainSaturation: 58,
        mainLightness: 60,
        darkSaturation: 48,
        darkLightness: 30,
        lightSaturation: 84,
        lightLightness: 86,
        bodyWidth: 1.7,
        bodyHeight: 1.02,
        headWidth: 0.94,
        headHeight: 0.96,
        earHeight: 1.1,
        tailWidth: 0.42
      },
      bird: {
        hue: 154,
        accentHue: 42,
        mainSaturation: 58,
        mainLightness: 48,
        darkSaturation: 62,
        darkLightness: 24,
        lightSaturation: 86,
        lightLightness: 78,
        bodyWidth: 1.4,
        bodyHeight: 1.24,
        headWidth: 0.86,
        headHeight: 0.86,
        earHeight: 0,
        tailWidth: 0.64
      },
      "small-mammal": {
        hue: 38,
        accentHue: 28,
        mainSaturation: 44,
        mainLightness: 54,
        darkSaturation: 48,
        darkLightness: 25,
        lightSaturation: 82,
        lightLightness: 82,
        bodyWidth: 1.44,
        bodyHeight: 1.08,
        headWidth: 0.9,
        headHeight: 0.9,
        earHeight: 0.36,
        tailWidth: 0.24
      },
      other: {
        hue: 266,
        accentHue: 290,
        mainSaturation: 48,
        mainLightness: 54,
        darkSaturation: 44,
        darkLightness: 28,
        lightSaturation: 80,
        lightLightness: 84,
        bodyWidth: 1.54,
        bodyHeight: 1,
        headWidth: 0.98,
        headHeight: 0.98,
        earHeight: 0.5,
        tailWidth: 0.54
      }
    };
    const profile = profiles[speciesKey] || profiles.other;
    return {
      ...profile,
      hue: (profile.hue + variation + 360) % 360,
      accentHue: (profile.accentHue + variation + 360) % 360
    };
  }

  hashAnimal(animal) {
    const value = `${animal?.animalId || ""}${animal?.animalName || ""}`;
    return [...value].reduce(
      (total, character) => total + character.charCodeAt(0),
      0
    );
  }

  areaStatusClass(status) {
    return `status-${(status || "Ready").toLowerCase()}`;
  }

  shapeClass(shape) {
    return `shape-${(shape || "Rounded Rectangle")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  }

  backgroundClassToken(backgroundStyle) {
    return (backgroundStyle || "Whiteboard").toLowerCase().replace(/\s+/g, "-");
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

  findAreaIdAtPoint(clientX, clientY) {
    const areas = [...this.template.querySelectorAll(".map-area")];
    const target = areas.find((area) => {
      const bounds = area.getBoundingClientRect();
      return (
        clientX >= bounds.left &&
        clientX <= bounds.right &&
        clientY >= bounds.top &&
        clientY <= bounds.bottom
      );
    });
    return target?.dataset.id;
  }

  positionFromPointer(event) {
    const dragState = this.animalDragState;
    const left =
      ((event.clientX - dragState.mapBounds.left) / dragState.mapBounds.width) *
        100 -
      dragState.offsetX;
    const top =
      ((event.clientY - dragState.mapBounds.top) / dragState.mapBounds.height) *
        100 -
      dragState.offsetY;
    return {
      left: this.clamp(left, 0, 98),
      top: this.clamp(top, 0, 96)
    };
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
