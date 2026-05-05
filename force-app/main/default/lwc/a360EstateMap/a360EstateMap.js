import { LightningElement, track, wire } from "lwc";
import getMapContext from "@salesforce/apex/A360EstateMapService.getMapContext";
import saveMapConfiguration from "@salesforce/apex/A360EstateMapService.saveMapConfiguration";
import publishMap from "@salesforce/apex/A360EstateMapService.publishMap";
import moveAnimal from "@salesforce/apex/A360EstateMapService.moveAnimal";
import searchAnimalsForArea from "@salesforce/apex/A360EstateMapService.searchAnimalsForArea";
import updateAreaStatus from "@salesforce/apex/A360EstateMapService.updateAreaStatus";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

const GRID_SIZE = 1;

export default class A360EstateMap extends LightningElement {
  @track context;
  @track draftAreas = [];
  @track mapSettings = {};
  @track selectedAreaId;
  @track selectedAnimalId;
  @track selectedAnimalDetailsOpen = false;

  editMode = false;
  isSaving = false;
  syncingAnimalId;
  riskFilter = "All";
  speciesFilter = "All";
  dragState;
  resizeState;
  animalDragState;
  movingAnimalId;
  dropTargetAreaId;
  dragPosition;
  addAnimalPanelOpen = false;
  animalSearchTerm = "";
  animalSearchResults = [];
  selectedAddAnimalId;
  isSearchingAnimals = false;
  addAnimalError;

  @wire(getMapContext, { mapId: null })
  wiredMapContext(value) {
    const { data, error } = value;
    if (data) {
      this.context = data;
      this.draftAreas = this.cloneAreas(data.areas);
      this.mapSettings = this.cloneMapSettings(data);
      this.selectedAreaId = this.draftAreas[0]?.id;
      if (
        this.selectedAnimalId &&
        !data.animals?.some(
          (animal) => animal.animalId === this.selectedAnimalId
        )
      ) {
        this.selectedAnimalId = null;
        this.selectedAnimalDetailsOpen = false;
      }
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

  get isCanvasUpdating() {
    return this.isSaving || Boolean(this.syncingAnimalId);
  }

  get canvasSavingLabel() {
    return this.syncingAnimalId ? this.syncingAnimalLabel : "Updating";
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
      const themeClass = this.areaThemeClass(area);
      const geometry = this.displayAreaGeometry(area, occupancy);
      return {
        ...area,
        className: `map-area ${this.shapeClass(area.shape)} ${
          selected ? "is-selected" : ""
        } ${
          this.editMode ? "is-editable" : ""
        } ${dropTarget ? "is-drop-target" : ""} ${this.areaStatusClass(
          operationalStatus
        )} ${themeClass} ${this.areaDensityClass(occupancy)}`,
        style: [
          `left:${geometry.x}%`,
          `top:${geometry.y}%`,
          `width:${geometry.width}%`,
          `height:${geometry.height}%`,
          `--area-fill:${area.fillColor || "#d8e6fe"}`,
          `transform:rotate(${area.rotation || 0}deg)`
        ].join(";"),
        sceneClass: `area-scene ${themeClass}-scene`,
        statusClass: `area-status ${this.areaStatusClass(operationalStatus)}`,
        statusLabel: operationalStatus,
        statusStyle: operationalStatus === "Ready" ? "display:none" : "",
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

  get selectedAreaCanAddAnimals() {
    return Boolean(
      this.canMove &&
      this.hasSelectedArea &&
      this.selectedArea?.housingUnitId &&
      this.selectedAreaStatus === "Ready"
    );
  }

  get addAnimalToggleLabel() {
    return this.addAnimalPanelOpen ? "Close Add" : "Add Animal";
  }

  get addAnimalToggleDisabled() {
    return !this.selectedAreaCanAddAnimals || this.isSaving;
  }

  get addAnimalSearchDisabled() {
    return !this.selectedAreaCanAddAnimals || this.isSearchingAnimals;
  }

  get hasAnimalSearchResults() {
    return this.animalSearchResults.length > 0;
  }

  get addAnimalActionDisabled() {
    return (
      !this.selectedAddAnimalId ||
      this.isSaving ||
      Boolean(this.syncingAnimalId)
    );
  }

  get addAnimalPanelMessage() {
    if (this.addAnimalError) {
      return this.addAnimalError;
    }
    if (!this.selectedArea?.housingUnitId) {
      return "Map a housing unit to this area before adding animals.";
    }
    if (this.selectedAreaStatus !== "Ready") {
      return "Only ready areas can receive animals.";
    }
    if (!this.hasAnimalSearchResults && !this.isSearchingAnimals) {
      return "Search current care animals that are not already in this area.";
    }
    return "";
  }

  get addAnimalResults() {
    return this.animalSearchResults.map((animal) => {
      const selected = animal.animalId === this.selectedAddAnimalId;
      return {
        ...animal,
        className: `animal-add-card ${selected ? "is-selected" : ""}`,
        locationLabel: animal.isOnBoard
          ? `On board: ${animal.areaLabel || animal.housingUnitName || "mapped area"}`
          : animal.housingUnitName
            ? `In ${animal.housingUnitName}`
            : "Not on this board",
        detailLabel: [
          animal.animalRecordName,
          animal.species,
          animal.breed,
          animal.welfareRisk
        ]
          .filter(Boolean)
          .join(" / "),
        imageAlt: `${animal.animalName || "Animal"} profile image`
      };
    });
  }

  get selectedAnimal() {
    if (!this.selectedAnimalId) {
      return null;
    }
    return (this.context?.animals || []).find(
      (animal) => animal.animalId === this.selectedAnimalId
    );
  }

  get hasSelectedAnimal() {
    return Boolean(this.selectedAnimal);
  }

  get selectedAnimalName() {
    return this.selectedAnimal?.animalName || "Select an animal";
  }

  get selectedAnimalRecordUrl() {
    return this.selectedAnimalId
      ? `/lightning/r/Animal__c/${this.selectedAnimalId}/view`
      : "";
  }

  get selectedAnimalRecordLabel() {
    return this.selectedAnimal
      ? `Open ${this.selectedAnimalName} animal record`
      : "Open animal record";
  }

  get selectedAnimalTagLabel() {
    return this.selectedAnimal
      ? `${this.selectedAnimalName} animal tag`
      : "Animal tag";
  }

  get selectedAnimalImageLabel() {
    return this.selectedAnimal
      ? `${this.selectedAnimalName} ${this.selectedAnimal.species || "animal"} image`
      : "Animal image";
  }

  get selectedAnimalImageUrl() {
    return this.selectedAnimal?.primaryImageUrl || "";
  }

  get hasSelectedAnimalImage() {
    return Boolean(this.selectedAnimalImageUrl);
  }

  get selectedAnimalDetailsToggleLabel() {
    return this.selectedAnimalDetailsOpen ? "Hide Details" : "View Details";
  }

  get selectedAnimalTagPetClass() {
    const animal = this.selectedAnimal;
    if (!animal) {
      return "pet-avatar animal-tag-avatar pet-other";
    }
    return [
      "pet-avatar",
      "animal-tag-avatar",
      this.speciesClass(animal.species),
      this.petVariantClass(animal)
    ]
      .filter(Boolean)
      .join(" ");
  }

  get selectedAnimalAvatarStyle() {
    if (!this.selectedAnimal) {
      return "";
    }
    return [
      this.petVariableStyle(this.selectedAnimal),
      "width:4.4rem",
      "height:3.35rem",
      "transform:scale(1.08)",
      "transform-origin:center bottom",
      "filter:drop-shadow(0 0.32rem 0.24rem rgba(16,24,40,0.2))"
    ].join(";");
  }

  get selectedAnimalBodyStyle() {
    return this.selectedAnimal
      ? this.petInlineStyles(this.selectedAnimal).bodyStyle
      : "";
  }

  get selectedAnimalHeadStyle() {
    return this.selectedAnimal
      ? this.petInlineStyles(this.selectedAnimal).headStyle
      : "";
  }

  get selectedAnimalRiskClass() {
    return `animal-tag-risk ${this.riskClass(this.selectedAnimal?.welfareRisk)}`;
  }

  get selectedAnimalPrimaryLine() {
    const animal = this.selectedAnimal;
    if (!animal) {
      return "";
    }
    return [
      animal.species,
      animal.breed,
      animal.sex,
      this.formatAge(animal.estimatedAgeMonths)
    ]
      .filter(Boolean)
      .join(" / ");
  }

  get selectedAnimalImageCaption() {
    return this.hasSelectedAnimalImage
      ? "Primary animal image"
      : "No primary image URL on record";
  }

  get selectedAnimalAreaName() {
    const area = this.draftAreas.find(
      (candidate) => candidate.id === this.selectedAnimal?.areaId
    );
    return area?.label || this.selectedAnimal?.housingUnitName || "Not mapped";
  }

  get selectedAnimalFacts() {
    const animal = this.selectedAnimal;
    if (!animal) {
      return [];
    }
    return [
      { label: "Animal #", value: animal.animalRecordName },
      { label: "Species", value: animal.species },
      { label: "Breed", value: animal.breed },
      { label: "Sex", value: animal.sex },
      { label: "Age", value: this.formatAge(animal.estimatedAgeMonths) },
      { label: "Welfare Risk", value: animal.welfareRisk },
      { label: "Care Status", value: animal.careStatus },
      { label: "Current Status", value: animal.currentStatus },
      { label: "Housing", value: animal.housingUnitName },
      { label: "Area", value: this.selectedAnimalAreaName },
      { label: "Episode", value: animal.episodeType },
      { label: "Intake", value: this.formatDateTime(animal.intakeDateTime) },
      { label: "Next Review", value: this.formatDate(animal.nextReviewDate) }
    ]
      .filter((item) => item.value !== undefined && item.value !== null)
      .map((item) => ({
        ...item,
        value: String(item.value || "Not set")
      }));
  }

  get syncingAnimalLabel() {
    const animal = (this.context?.animals || []).find(
      (candidate) => candidate.animalId === this.syncingAnimalId
    );
    return animal?.animalName ? `Syncing ${animal.animalName}` : "Updating";
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
    const animalCountsByArea = this.filteredAnimals.reduce((counts, animal) => {
      counts[animal.areaId] = (counts[animal.areaId] || 0) + 1;
      return counts;
    }, {});
    const areaSlots = {};

    return this.filteredAnimals
      .map((animal) => {
        const area = areasById.get(animal.areaId);
        if (!area) {
          return null;
        }
        const slot = areaSlots[animal.areaId] || 0;
        areaSlots[animal.areaId] = slot + 1;

        const count = animalCountsByArea[animal.areaId] || 1;
        const geometry = this.displayAreaGeometry(area, count);
        const density = this.animalDensity(count, geometry);
        const position = this.animalSlotPosition(
          geometry,
          slot,
          count,
          density
        );
        const isMoving = animal.animalId === this.movingAnimalId;
        const isSelected = animal.animalId === this.selectedAnimalId;

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
            density !== "full" ? `is-${density}` : "",
            isMoving ? "is-dragging" : "",
            isSelected ? "is-selected" : "",
            animal.animalId === this.syncingAnimalId ? "is-syncing" : ""
          ]
            .filter(Boolean)
            .join(" "),
          style: this.animalStyle(
            animal,
            isMoving ? this.dragPosition : null,
            position,
            density
          ),
          ...this.petInlineStyles(animal, density),
          title: `${animal.animalName || "Animal"} - ${animal.species || "Unknown"}`,
          recordUrl: `/lightning/r/Animal__c/${animal.animalId}/view`,
          isSelected,
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
    this.selectedAnimalId = null;
    this.selectedAnimalDetailsOpen = false;
    this.resetAddAnimalSelection();
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
    if (this.selectedAnimalId !== animalId) {
      this.selectedAnimalDetailsOpen = false;
    }
    this.resetAddAnimalSelection();
    this.selectedAnimalId = animalId;
    this.selectedAreaId = animal.areaId;
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
      startClientX: event.clientX,
      startClientY: event.clientY,
      hasMoved: false,
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
    const dx = event.clientX - this.animalDragState.startClientX;
    const dy = event.clientY - this.animalDragState.startClientY;
    this.animalDragState.hasMoved =
      this.animalDragState.hasMoved || Math.hypot(dx, dy) > 6;
    this.dragPosition = this.positionFromPointer(event);
    this.dropTargetAreaId = this.findAreaIdAtPoint(
      event.clientX,
      event.clientY
    );
  };

  handleToggleAnimalDetails() {
    this.selectedAnimalDetailsOpen = !this.selectedAnimalDetailsOpen;
  }

  handleAnimalPointerUp = async (event) => {
    window.removeEventListener("pointermove", this.handleAnimalPointerMove);
    window.removeEventListener("pointerup", this.handleAnimalPointerUp);

    const dragState = this.animalDragState;
    const targetAreaId = this.findAreaIdAtPoint(event.clientX, event.clientY);
    this.animalDragState = null;
    this.dropTargetAreaId = null;

    if (
      !dragState ||
      !dragState.hasMoved ||
      !targetAreaId ||
      targetAreaId === dragState.sourceAreaId
    ) {
      if (dragState?.animalId) {
        this.selectedAnimalId = dragState.animalId;
        this.selectedAreaId = dragState.sourceAreaId;
      }
      this.movingAnimalId = null;
      this.dragPosition = null;
      return;
    }

    const previousContext = this.cloneContext(this.context);
    const optimisticContext = this.contextWithMovedAnimal(
      this.context,
      dragState.animalId,
      targetAreaId
    );
    this.context = optimisticContext;
    this.selectedAnimalId = dragState.animalId;
    this.selectedAreaId = targetAreaId;
    this.syncingAnimalId = dragState.animalId;
    this.movingAnimalId = null;
    this.dragPosition = null;
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
      this.selectedAnimalId = dragState.animalId;
      this.showToast(
        "Animal moved",
        "The live location stay was updated.",
        "success"
      );
    } catch (error) {
      this.context = previousContext;
      this.draftAreas = this.cloneAreas(previousContext?.areas);
      this.mapSettings = this.cloneMapSettings(previousContext);
      this.selectedAreaId = dragState.sourceAreaId;
      this.selectedAnimalId = dragState.animalId;
      this.showToast("Move failed", this.reduceError(error), "error");
    } finally {
      this.syncingAnimalId = null;
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

  handleToggleAddAnimal = async () => {
    this.addAnimalPanelOpen = !this.addAnimalPanelOpen;
    this.selectedAnimalId = null;
    this.selectedAnimalDetailsOpen = false;
    if (this.addAnimalPanelOpen && this.selectedAreaCanAddAnimals) {
      await this.searchAnimalsForSelectedArea();
    }
  };

  handleAnimalSearchTermChange(event) {
    this.animalSearchTerm = event.detail?.value ?? event.target.value;
  }

  handleAnimalSearchKeyUp(event) {
    if (event.key === "Enter") {
      this.searchAnimalsForSelectedArea();
    }
  }

  handleAnimalSearch = () => {
    this.searchAnimalsForSelectedArea();
  };

  handleSelectAddAnimal(event) {
    this.selectedAddAnimalId = event.currentTarget.dataset.animalId;
  }

  handleAddAnimalToArea = async () => {
    if (!this.selectedAddAnimalId || !this.selectedAreaId) {
      return;
    }
    const animalId = this.selectedAddAnimalId;
    const previousContext = this.cloneContext(this.context);
    this.syncingAnimalId = animalId;
    this.isSaving = true;
    try {
      const movedContext = await moveAnimal({
        mapId: this.context.mapId,
        animalId,
        targetAreaId: this.selectedAreaId
      });
      this.context = movedContext;
      this.draftAreas = this.cloneAreas(movedContext.areas);
      this.mapSettings = this.cloneMapSettings(movedContext);
      this.selectedAnimalId = animalId;
      this.selectedAnimalDetailsOpen = false;
      this.selectedAddAnimalId = null;
      await this.searchAnimalsForSelectedArea();
      this.showToast(
        "Animal added",
        "The animal was added to this area.",
        "success"
      );
    } catch (error) {
      this.context = previousContext;
      this.showToast("Add failed", this.reduceError(error), "error");
    } finally {
      this.syncingAnimalId = null;
      this.isSaving = false;
    }
  };

  async searchAnimalsForSelectedArea() {
    if (!this.selectedAreaCanAddAnimals || !this.selectedAreaId) {
      this.animalSearchResults = [];
      return;
    }
    this.isSearchingAnimals = true;
    this.addAnimalError = null;
    try {
      this.animalSearchResults = await searchAnimalsForArea({
        mapId: this.context.mapId,
        targetAreaId: this.selectedAreaId,
        searchTerm: this.animalSearchTerm
      });
      this.selectedAddAnimalId = null;
    } catch (error) {
      this.animalSearchResults = [];
      this.addAnimalError = this.reduceError(error);
    } finally {
      this.isSearchingAnimals = false;
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

  resetAddAnimalSelection() {
    this.addAnimalPanelOpen = false;
    this.animalSearchResults = [];
    this.selectedAddAnimalId = null;
    this.addAnimalError = null;
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

  animalStyle(animal, dragPosition, homePosition, density = "full") {
    const hash = this.hashAnimal(animal);
    const profile = this.petProfile(animal?.species, hash);
    const densityProfile = this.densityProfile(density);
    const speed = 2.2 + (hash % 7) / 10;
    const position = dragPosition || homePosition;
    return [
      `left:${position.left}%`,
      `top:${position.top}%`,
      "display:inline-flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:flex-start",
      `width:${densityProfile.widthRem}rem`,
      `min-width:${densityProfile.widthRem}rem`,
      `max-width:${densityProfile.widthRem}rem`,
      "border:0",
      "outline:0",
      "background:transparent",
      "box-shadow:none",
      "gap:0",
      "padding:0",
      this.petVariableStyle(animal, profile),
      `--pet-speed:${speed}s`
    ].join(";");
  }

  petVariableStyle(animal, providedProfile) {
    const hash = this.hashAnimal(animal);
    const profile = providedProfile || this.petProfile(animal?.species, hash);
    const hue = profile.hue;
    const accentHue = profile.accentHue;
    const markSize = 0.16 + (hash % 4) * 0.05;
    return [
      `--pet-main:hsl(${hue} ${profile.mainSaturation}% ${profile.mainLightness}%)`,
      `--pet-dark:hsl(${hue} ${profile.darkSaturation}% ${profile.darkLightness}%)`,
      `--pet-light:hsl(${accentHue} ${profile.lightSaturation}% ${profile.lightLightness}%)`,
      `--pet-body-width:${profile.bodyWidth}rem`,
      `--pet-body-height:${profile.bodyHeight}rem`,
      `--pet-head-width:${profile.headWidth}rem`,
      `--pet-head-height:${profile.headHeight}rem`,
      `--pet-ear-height:${profile.earHeight}rem`,
      `--pet-tail-width:${profile.tailWidth}rem`,
      `--pet-mark-size:${markSize}rem`
    ].join(";");
  }

  petInlineStyles(animal, density = "full") {
    const profile = this.petProfile(animal?.species, this.hashAnimal(animal));
    const speciesKey = this.normalizedSpecies(animal?.species);
    const densityProfile = this.densityProfile(density);
    const avatarScale = densityProfile.avatarScale;
    const bodyRadius = {
      dog: "0.65rem 0.78rem 0.58rem 0.62rem",
      cat: "0.82rem 0.6rem 0.58rem 0.82rem",
      rabbit: "999px",
      bird: "68% 56% 62% 70%",
      "small-mammal": "999px",
      other: "999px"
    };
    const headRadius = {
      dog: "999px",
      cat: "999px",
      rabbit: "999px",
      bird: "999px",
      "small-mammal": "999px",
      other: "999px"
    };

    return {
      avatarStyle: [
        "width:3.38rem",
        "height:2.58rem",
        `transform:scale(${avatarScale})`,
        "transform-origin:center bottom",
        "filter:drop-shadow(0 0.22rem 0.18rem rgba(16, 24, 40, 0.16))"
      ].join(";"),
      bodyStyle: [
        "left:0.58rem",
        speciesKey === "bird" ? "bottom:0.48rem" : "bottom:0.42rem",
        `width:${profile.bodyWidth}rem`,
        `height:${profile.bodyHeight}rem`,
        "border:0.09rem solid var(--pet-dark)",
        `border-radius:${bodyRadius[speciesKey] || bodyRadius.other}`,
        "box-shadow:inset 0 0.16rem 0 rgba(255,255,255,0.28)"
      ].join(";"),
      headStyle: [
        speciesKey === "bird" ? "right:0.34rem" : "right:0.44rem",
        speciesKey === "bird" ? "bottom:1.2rem" : "bottom:0.94rem",
        `width:${profile.headWidth}rem`,
        `height:${profile.headHeight}rem`,
        "border:0.09rem solid var(--pet-dark)",
        `border-radius:${headRadius[speciesKey] || headRadius.other}`,
        "box-shadow:inset 0 0.16rem 0 rgba(255,255,255,0.3)"
      ].join(";"),
      nameStyle: [
        `max-width:${densityProfile.nameWidthRem}rem`,
        `font-size:${densityProfile.nameFontRem}rem`,
        "background:rgba(255,255,255,0.9)",
        "box-shadow:0 0.12rem 0.3rem rgba(16,24,40,0.12)"
      ].join(";")
    };
  }

  displayAreaGeometry(area, occupancy = 0) {
    const base = {
      x: Number(area.x || 0),
      y: Number(area.y || 0),
      width: Number(area.width || 10),
      height: Number(area.height || 10)
    };
    if (this.editMode || occupancy <= 6) {
      return base;
    }

    const crowdFactor = Math.max(0, Math.sqrt(occupancy) - 2);
    const widthLimit = occupancy > 90 ? 58 : occupancy > 40 ? 50 : 42;
    const heightLimit = occupancy > 90 ? 48 : occupancy > 40 ? 42 : 36;
    const width = this.clamp(
      base.width + crowdFactor * 2.25,
      base.width,
      widthLimit
    );
    const height = this.clamp(
      base.height + crowdFactor * 1.8,
      base.height,
      heightLimit
    );
    return {
      width: this.clamp(width, 3, 100),
      height: this.clamp(height, 3, 100),
      x: this.clamp(base.x - (width - base.width) / 2, 0, 100 - width),
      y: this.clamp(base.y - (height - base.height) / 2, 0, 100 - height)
    };
  }

  areaDensityClass(occupancy = 0) {
    if (occupancy > 40) {
      return "density-overflow";
    }
    if (occupancy > 16) {
      return "density-high";
    }
    if (occupancy > 6) {
      return "density-medium";
    }
    return "density-normal";
  }

  animalDensity(count, area) {
    if (count > 40 || area.width < 10 || area.height < 9) {
      return "micro";
    }
    if (count > 16 || area.width < 14 || area.height < 12) {
      return "dense";
    }
    if (count > 3 || area.width < 18 || area.height < 16) {
      return "compact";
    }
    return "full";
  }

  densityProfile(density = "full") {
    const profiles = {
      full: {
        footprint: 4.8,
        widthRem: 3.85,
        avatarScale: 1,
        nameWidthRem: 3.65,
        nameFontRem: 0.62
      },
      compact: {
        footprint: 3.7,
        widthRem: 3.35,
        avatarScale: 0.86,
        nameWidthRem: 3.05,
        nameFontRem: 0.58
      },
      dense: {
        footprint: 2.05,
        widthRem: 1.72,
        avatarScale: 0.5,
        nameWidthRem: 1.6,
        nameFontRem: 0.48
      },
      micro: {
        footprint: 1.25,
        widthRem: 1.18,
        avatarScale: 0.34,
        nameWidthRem: 1.1,
        nameFontRem: 0.44
      }
    };
    return profiles[density] || profiles.full;
  }

  areaAnimalBounds(area, count, density) {
    const profile = this.densityProfile(density);
    const paddingByDensity = {
      full: 1.18,
      compact: 0.84,
      dense: 0.52,
      micro: 0.34
    };
    const reserveByDensity = {
      full: 7.9,
      compact: 6.25,
      dense: 4.85,
      micro: 4.15
    };
    const padding = paddingByDensity[density] || paddingByDensity.full;
    const requestedReserve =
      (reserveByDensity[density] || reserveByDensity.full) +
      Math.min(2.4, count / 26);
    const maxReserve = Math.max(
      2.35,
      area.height - profile.footprint - padding * 2
    );
    const labelReserve = this.clamp(requestedReserve, 2.35, maxReserve);

    return {
      x: area.x + padding,
      y: area.y + labelReserve,
      width: Math.max(profile.footprint, area.width - padding * 2),
      height: Math.max(profile.footprint, area.height - labelReserve - padding)
    };
  }

  animalSlotPosition(area, slot, count, density) {
    const profile = this.densityProfile(density);
    const bounds = this.areaAnimalBounds(area, count, density);
    const aspect = bounds.width / Math.max(bounds.height, 1);
    const densityBias =
      density === "micro" ? 1.18 : density === "dense" ? 1.1 : 1;
    const columns = this.clamp(
      Math.ceil(Math.sqrt(count * aspect * densityBias)),
      1,
      count
    );
    const rows = Math.ceil(count / columns);
    const column = slot % columns;
    const row = Math.floor(slot / columns);
    const cellWidth = bounds.width / columns;
    const cellHeight = bounds.height / rows;
    const footprint = Math.min(profile.footprint, bounds.width, bounds.height);
    const jitter = density === "full" || density === "compact" ? 0.1 : 0.025;
    const jitterOffset = ((slot % 3) - 1) * Math.min(jitter, cellWidth / 8);

    return {
      left:
        bounds.x +
        this.clamp(
          column * cellWidth + (cellWidth - footprint) / 2 + jitterOffset,
          0,
          Math.max(0, bounds.width - footprint)
        ),
      top:
        bounds.y +
        this.clamp(
          row * cellHeight + (cellHeight - footprint) / 2,
          0,
          Math.max(0, bounds.height - footprint)
        )
    };
  }

  contextWithMovedAnimal(context, animalId, targetAreaId) {
    const targetArea = this.draftAreas.find((area) => area.id === targetAreaId);
    return {
      ...context,
      animals: (context?.animals || []).map((animal) => {
        if (animal.animalId !== animalId) {
          return animal;
        }
        return {
          ...animal,
          areaId: targetAreaId,
          housingUnitId: targetArea?.housingUnitId || animal.housingUnitId,
          housingUnitName: targetArea?.housingUnitName || animal.housingUnitName
        };
      })
    };
  }

  cloneContext(context) {
    if (!context) {
      return context;
    }
    return {
      ...context,
      areas: this.cloneAreas(context.areas),
      connections: (context.connections || []).map((connection) => ({
        ...connection
      })),
      animals: (context.animals || []).map((animal) => ({ ...animal })),
      housingOptions: (context.housingOptions || []).map((option) => ({
        ...option
      }))
    };
  }

  formatAge(months) {
    if (months === undefined || months === null || months === "") {
      return null;
    }
    const numeric = Number(months);
    if (Number.isNaN(numeric)) {
      return null;
    }
    if (numeric < 12) {
      return `${numeric} months`;
    }
    const years = Math.floor(numeric / 12);
    const remainingMonths = numeric % 12;
    return remainingMonths ? `${years}y ${remainingMonths}m` : `${years} years`;
  }

  formatDate(value) {
    return value || null;
  }

  formatDateTime(value) {
    if (!value) {
      return null;
    }
    return String(value).replace("T", " ").replace(".000Z", "");
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

  areaThemeClass(area) {
    const value = `${area?.label || ""} ${area?.zone || ""} ${
      area?.housingType || ""
    } ${area?.housingUnitName || ""}`.toLowerCase();
    if (
      value.includes("yard") ||
      value.includes("garden") ||
      value.includes("outdoor")
    ) {
      return "theme-yard";
    }
    if (
      value.includes("intake") ||
      value.includes("reception") ||
      value.includes("front of house")
    ) {
      return "theme-intake";
    }
    if (
      value.includes("rabbit") ||
      value.includes("small animal") ||
      value.includes("barn")
    ) {
      return "theme-rabbit";
    }
    if (value.includes("isolation") || value.includes("protected")) {
      return "theme-isolation";
    }
    if (
      value.includes("clinical") ||
      value.includes("clinic") ||
      value.includes("ward")
    ) {
      return "theme-clinical";
    }
    if (value.includes("kennel") || value.includes("dog")) {
      return "theme-kennel";
    }
    if (value.includes("cattery") || value.includes("cat")) {
      return "theme-cattery";
    }
    return "theme-default";
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
