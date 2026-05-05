import { createElement } from "lwc";
import { registerApexTestWireAdapter } from "@salesforce/sfdx-lwc-jest";
import A360EstateMap from "c/a360EstateMap";
import getMapContext from "@salesforce/apex/A360EstateMapService.getMapContext";
import saveMapConfiguration from "@salesforce/apex/A360EstateMapService.saveMapConfiguration";
import publishMap from "@salesforce/apex/A360EstateMapService.publishMap";
import moveAnimal from "@salesforce/apex/A360EstateMapService.moveAnimal";
import searchAnimalsForArea from "@salesforce/apex/A360EstateMapService.searchAnimalsForArea";
import updateAreaStatus from "@salesforce/apex/A360EstateMapService.updateAreaStatus";

const getMapContextAdapter = registerApexTestWireAdapter(getMapContext);

jest.mock(
  "@salesforce/apex/A360EstateMapService.getMapContext",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/A360EstateMapService.saveMapConfiguration",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/A360EstateMapService.publishMap",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/A360EstateMapService.moveAnimal",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/A360EstateMapService.searchAnimalsForArea",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/A360EstateMapService.updateAreaStatus",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "lightning/platformShowToastEvent",
  () => ({
    ShowToastEvent: class ShowToastEvent extends CustomEvent {
      constructor(detail) {
        super("lightning__showtoast", { detail });
      }
    }
  }),
  { virtual: true }
);

const MAP_CONTEXT = {
  mapId: "a20J60000000001IAA",
  mapName: "North London Rescue Estate",
  mapCode: "UK_RESCUE_NORTH_LONDON",
  status: "Published",
  backgroundStyle: "Whiteboard",
  canvasWidth: 1200,
  canvasHeight: 720,
  canEdit: true,
  canMove: true,
  areas: [
    {
      id: "a21J60000000001IAA",
      areaCode: "KEN-A1",
      label: "Kennel A1",
      zone: "Kennels",
      shape: "Rounded Rectangle",
      x: 10,
      y: 20,
      width: 18,
      height: 18,
      rotation: 0,
      fillColor: "#d8e6fe",
      housingUnitId: "a10J60000000001IAA",
      housingUnitName: "Kennel A1",
      housingType: "Kennel",
      capacity: 2,
      currentOccupancy: 1,
      operationalStatus: "Ready",
      displayOrder: 10
    },
    {
      id: "a21J60000000002IAA",
      areaCode: "CAT-BLUE",
      label: "Cattery Blue",
      zone: "Cattery",
      shape: "Rounded Rectangle",
      x: 44,
      y: 22,
      width: 20,
      height: 16,
      rotation: 0,
      fillColor: "#dcfae6",
      housingUnitId: "a10J60000000002IAA",
      housingUnitName: "Cattery Blue",
      housingType: "Cattery",
      capacity: 3,
      currentOccupancy: 0,
      operationalStatus: "Ready",
      displayOrder: 20
    }
  ],
  connections: [],
  animals: [
    {
      animalId: "a00J60000000001IAA",
      animalRecordName: "AN-00001",
      animalName: "Biscuit",
      species: "Dog",
      breed: "Labrador",
      primaryImageUrl: "https://example.com/animal360/biscuit.jpg",
      sex: "Female",
      estimatedAgeMonths: 30,
      welfareRisk: "High",
      currentStatus: "In Care",
      careStatus: "Open",
      housingUnitId: "a10J60000000001IAA",
      housingUnitName: "Kennel A1",
      episodeType: "Rescue",
      intakeDateTime: "2026-05-01T09:00:00.000Z",
      nextReviewDate: "2026-05-12",
      areaId: "a21J60000000001IAA",
      slotIndex: 0
    },
    {
      animalId: "a00J60000000002IAA",
      animalRecordName: "AN-00002",
      animalName: "Maple",
      species: "Dog",
      breed: "Collie",
      sex: "Male",
      estimatedAgeMonths: 18,
      welfareRisk: "Low",
      currentStatus: "In Care",
      careStatus: "Open",
      housingUnitId: "a10J60000000001IAA",
      housingUnitName: "Kennel A1",
      episodeType: "Boarding",
      areaId: "a21J60000000001IAA",
      slotIndex: 1
    }
  ],
  housingOptions: [
    {
      id: "a10J60000000001IAA",
      label: "Kennel A1",
      housingType: "Kennel",
      capacity: 2
    },
    {
      id: "a10J60000000002IAA",
      label: "Cattery Blue",
      housingType: "Cattery",
      capacity: 3
    }
  ]
};

const SPECIES_CONTEXT = {
  ...MAP_CONTEXT,
  animals: [
    {
      ...MAP_CONTEXT.animals[0],
      animalId: "a00J60000000003IAA",
      animalName: "Miso",
      species: "Cat",
      welfareRisk: "Low",
      areaId: MAP_CONTEXT.areas[1].id
    },
    {
      ...MAP_CONTEXT.animals[0],
      animalId: "a00J60000000004IAA",
      animalName: "Pip",
      species: "Rabbit",
      welfareRisk: "Moderate",
      areaId: MAP_CONTEXT.areas[0].id
    },
    {
      ...MAP_CONTEXT.animals[0],
      animalId: "a00J60000000005IAA",
      animalName: "Kiwi",
      species: "Bird",
      welfareRisk: "High",
      areaId: MAP_CONTEXT.areas[1].id
    }
  ]
};

function flushPromises() {
  return Promise.resolve();
}

function findButton(element, label) {
  return [...element.shadowRoot.querySelectorAll("lightning-button")].find(
    (button) => button.label === label || button.getAttribute("label") === label
  );
}

function pointerEvent(type, clientX, clientY) {
  const event = new CustomEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientX", { value: clientX });
  Object.defineProperty(event, "clientY", { value: clientY });
  return event;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function percentStyleValue(element, property) {
  return Number(
    element.getAttribute("style").match(new RegExp(`${property}:([0-9.]+)%`))[1]
  );
}

describe("c-a360-estate-map", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders the published estate map with animated animal tokens", async () => {
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    expect(element.shadowRoot.textContent).toContain(
      "North London Rescue Estate"
    );
    expect(element.shadowRoot.textContent).toContain("Kennel A1");
    expect(element.shadowRoot.textContent).toContain("Biscuit");
    expect(element.shadowRoot.textContent).toContain("Ready");
    expect(element.shadowRoot.querySelector(".animal-token")).not.toBeNull();
    expect(element.shadowRoot.querySelector(".pet-avatar")).not.toBeNull();
    expect(element.shadowRoot.querySelector(".area-scene")).not.toBeNull();
    const areas = [...element.shadowRoot.querySelectorAll(".map-area")];
    expect(areas[0].className).toContain("theme-kennel");
    expect(areas[1].className).toContain("theme-cattery");
    const tokens = element.shadowRoot.querySelectorAll(".animal-token");
    expect(tokens).toHaveLength(2);
    expect(tokens[0].getAttribute("style")).not.toEqual(
      tokens[1].getAttribute("style")
    );
    expect(
      Number(tokens[0].getAttribute("style").match(/top:([0-9.]+)%/)[1])
    ).toBeGreaterThan(28);
    expect(tokens[0].getAttribute("style")).toContain("outline:0");
    expect(
      element.shadowRoot.querySelector(".area-status.status-ready").style
        .display
    ).toBe("none");
  });

  it("opens animal details in the sidebar with a record link", async () => {
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    const token = element.shadowRoot.querySelector(".animal-token");
    token.getBoundingClientRect = jest.fn(() => ({
      left: 20,
      top: 20,
      right: 100,
      bottom: 70,
      width: 80,
      height: 50
    }));
    element.shadowRoot.querySelector(".map-canvas").getBoundingClientRect =
      jest.fn(() => ({
        left: 0,
        top: 0,
        right: 240,
        bottom: 160,
        width: 240,
        height: 160
      }));

    token.dispatchEvent(pointerEvent("pointerdown", 25, 25));
    window.dispatchEvent(pointerEvent("pointerup", 25, 25));
    await flushPromises();

    expect(element.shadowRoot.textContent).toContain("Animal Tag");
    expect(element.shadowRoot.textContent).toContain("Biscuit");
    expect(element.shadowRoot.textContent).toContain("AN-00001");
    expect(element.shadowRoot.textContent).toContain("Labrador");
    expect(element.shadowRoot.textContent).toContain("Dog / Labrador");
    expect(element.shadowRoot.textContent).toContain("Kennel A1");
    expect(element.shadowRoot.querySelector(".area-roster")).not.toBeNull();
    expect(element.shadowRoot.querySelector(".animal-tag")).not.toBeNull();
    expect(
      element.shadowRoot.querySelector(".animal-tag-image")
    ).not.toBeNull();
    const tagImageLink = element.shadowRoot.querySelector(".animal-tag-image");
    expect(tagImageLink.getAttribute("href")).toBe(
      `/lightning/r/Animal__c/${MAP_CONTEXT.animals[0].animalId}/view`
    );
    const tagPhoto = element.shadowRoot.querySelector(".animal-tag-photo");
    expect(tagPhoto.getAttribute("src")).toBe(
      "https://example.com/animal360/biscuit.jpg"
    );
    expect(tagPhoto.getAttribute("alt")).toContain("Biscuit");
    expect(element.shadowRoot.querySelector(".animal-tag-avatar")).toBeNull();
    expect(element.shadowRoot.querySelector(".record-link")).toBeNull();
    expect(element.shadowRoot.querySelector(".animal-photo-card")).toBeNull();
    const panelChildren = [
      ...element.shadowRoot.querySelector(".operations-panel").children
    ];
    expect(
      panelChildren.indexOf(element.shadowRoot.querySelector(".area-roster"))
    ).toBeLessThan(
      panelChildren.indexOf(element.shadowRoot.querySelector(".animal-tag"))
    );

    findButton(element, "View Details").click();
    await flushPromises();

    expect(
      element.shadowRoot.querySelector(".animal-photo-card")
    ).not.toBeNull();
    const photo = element.shadowRoot.querySelector(".animal-photo");
    expect(photo.getAttribute("src")).toBe(
      "https://example.com/animal360/biscuit.jpg"
    );
    expect(photo.getAttribute("alt")).toContain("Biscuit");
    expect(element.shadowRoot.textContent).toContain("Primary animal image");
  });

  it("applies video-game scene themes from area names and housing types", async () => {
    const themedContext = {
      ...MAP_CONTEXT,
      areas: [
        {
          ...MAP_CONTEXT.areas[0],
          id: "a21J60000000011IAA",
          label: "Intake Reception",
          zone: "Front of House",
          housingType: "Reception"
        },
        {
          ...MAP_CONTEXT.areas[0],
          id: "a21J60000000012IAA",
          label: "North Yard",
          zone: "Outdoor"
        },
        {
          ...MAP_CONTEXT.areas[0],
          id: "a21J60000000013IAA",
          label: "Rabbit Barn",
          housingType: "Rabbit"
        },
        {
          ...MAP_CONTEXT.areas[0],
          id: "a21J60000000014IAA",
          label: "Isolation Suite",
          housingType: "Protected"
        },
        {
          ...MAP_CONTEXT.areas[0],
          id: "a21J60000000015IAA",
          label: "Clinical Ward",
          housingType: "Clinical"
        }
      ],
      animals: []
    };
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(themedContext);
    await flushPromises();

    const classNames = [
      ...element.shadowRoot.querySelectorAll(".map-area")
    ].map((area) => area.className);
    expect(classNames).toEqual(
      expect.arrayContaining([
        expect.stringContaining("theme-intake"),
        expect.stringContaining("theme-yard"),
        expect.stringContaining("theme-rabbit"),
        expect.stringContaining("theme-isolation"),
        expect.stringContaining("theme-clinical")
      ])
    );
  });

  it("renders compact species-specific animal markers without always-visible move text", async () => {
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(SPECIES_CONTEXT);
    await flushPromises();

    const tokens = [...element.shadowRoot.querySelectorAll(".animal-token")];
    expect(tokens).toHaveLength(3);
    expect(tokens.map((token) => token.className)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("pet-cat"),
        expect.stringContaining("pet-rabbit"),
        expect.stringContaining("pet-bird")
      ])
    );
    expect(tokens[0].getAttribute("style")).toContain("flex-direction:column");
    expect(tokens[0].getAttribute("style")).toContain("width:3.85rem");
    element.shadowRoot.querySelectorAll(".move-label").forEach((label) => {
      expect(label.textContent).toBe("");
    });
    expect(element.shadowRoot.querySelector(".pet-whisker")).not.toBeNull();
    expect(element.shadowRoot.querySelector(".pet-beak")).not.toBeNull();
    expect(element.shadowRoot.querySelector(".pet-wing")).not.toBeNull();
  });

  it("saves edited area layout from edit mode", async () => {
    saveMapConfiguration.mockResolvedValue(MAP_CONTEXT);
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    findButton(element, "Edit").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    const labelInput = element.shadowRoot.querySelector(
      "lightning-input[data-field='label']"
    );
    labelInput.value = "Kennel A1 Resized";
    labelInput.dispatchEvent(
      new CustomEvent("change", { detail: { value: "Kennel A1 Resized" } })
    );

    findButton(element, "Save Layout").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    expect(saveMapConfiguration).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId,
      settings: expect.objectContaining({
        mapName: "North London Rescue Estate",
        backgroundStyle: "Whiteboard"
      }),
      areas: expect.any(Array)
    });
    expect(saveMapConfiguration.mock.calls[0][0].areas[0]).toMatchObject({
      label: "Kennel A1 Resized"
    });
  });

  it("splits a selected area and saves the new section", async () => {
    const splitContext = {
      ...MAP_CONTEXT,
      areas: [
        MAP_CONTEXT.areas[0],
        MAP_CONTEXT.areas[1],
        {
          ...MAP_CONTEXT.areas[0],
          id: "a21J60000000003IAA",
          areaCode: "KEN-A1-B",
          label: "Kennel A1 B",
          housingUnitId: "",
          x: 19,
          width: 9,
          displayOrder: 30
        }
      ]
    };
    saveMapConfiguration.mockResolvedValue(splitContext);
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    findButton(element, "Edit").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    findButton(element, "Split Vertical").dispatchEvent(
      new CustomEvent("click")
    );
    await flushPromises();
    findButton(element, "Save Layout").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    expect(saveMapConfiguration.mock.calls[0][0].areas).toHaveLength(3);
    expect(saveMapConfiguration.mock.calls[0][0].areas[2]).toMatchObject({
      id: null,
      label: "Kennel A1 B",
      housingUnitId: null
    });
  });

  it("resizes an area directly on the canvas", async () => {
    saveMapConfiguration.mockResolvedValue(MAP_CONTEXT);
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    findButton(element, "Edit").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    element.shadowRoot.querySelector(".map-canvas").getBoundingClientRect =
      jest.fn(() => ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 200,
        width: 300,
        height: 200
      }));

    const handle = element.shadowRoot.querySelector(".resize-handle");
    handle.dispatchEvent(pointerEvent("pointerdown", 100, 100));
    window.dispatchEvent(pointerEvent("pointermove", 160, 140));
    window.dispatchEvent(pointerEvent("pointerup", 160, 140));
    await flushPromises();

    findButton(element, "Save Layout").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    expect(
      saveMapConfiguration.mock.calls[0][0].areas[0].width
    ).toBeGreaterThan(18);
    expect(
      saveMapConfiguration.mock.calls[0][0].areas[0].height
    ).toBeGreaterThan(18);
  });

  it("updates the selected area cleaning status", async () => {
    const cleaningContext = {
      ...MAP_CONTEXT,
      areas: [
        {
          ...MAP_CONTEXT.areas[0],
          operationalStatus: "Cleaning"
        },
        MAP_CONTEXT.areas[1]
      ]
    };
    updateAreaStatus.mockResolvedValue(cleaningContext);
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    const statusInput = element.shadowRoot.querySelector(
      ".operations-panel lightning-combobox"
    );
    statusInput.dispatchEvent(
      new CustomEvent("change", { detail: { value: "Cleaning" } })
    );
    await flushPromises();

    expect(updateAreaStatus).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId,
      areaId: MAP_CONTEXT.areas[0].id,
      operationalStatus: "Cleaning"
    });
  });

  it("publishes the current map", async () => {
    publishMap.mockResolvedValue(MAP_CONTEXT);
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    findButton(element, "Edit").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    findButton(element, "Publish").dispatchEvent(new CustomEvent("click"));
    await flushPromises();

    expect(publishMap).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId
    });
  });

  it("moves an animal to a target map area", async () => {
    const moveRequest = deferred();
    const movedContext = {
      ...MAP_CONTEXT,
      animals: [
        {
          ...MAP_CONTEXT.animals[0],
          housingUnitId: "a10J60000000002IAA",
          housingUnitName: "Cattery Blue",
          areaId: "a21J60000000002IAA"
        }
      ]
    };
    moveAnimal.mockReturnValue(moveRequest.promise);

    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    const areas = element.shadowRoot.querySelectorAll(".map-area");
    element.shadowRoot.querySelector(".map-canvas").getBoundingClientRect =
      jest.fn(() => ({
        left: 0,
        top: 0,
        right: 240,
        bottom: 160,
        width: 240,
        height: 160
      }));
    areas[0].getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100
    }));
    areas[1].getBoundingClientRect = jest.fn(() => ({
      left: 120,
      top: 0,
      right: 220,
      bottom: 100
    }));
    const token = element.shadowRoot.querySelector(".animal-token");
    token.getBoundingClientRect = jest.fn(() => ({
      left: 20,
      top: 20,
      right: 100,
      bottom: 70,
      width: 80,
      height: 50
    }));

    token.dispatchEvent(pointerEvent("pointerdown", 25, 25));
    window.dispatchEvent(pointerEvent("pointermove", 150, 40));
    await flushPromises();
    expect(token.className).toContain("is-dragging");
    expect(token.getAttribute("style")).toContain("left:");

    window.dispatchEvent(pointerEvent("pointerup", 150, 40));
    await flushPromises();

    expect(element.shadowRoot.textContent).toContain("Syncing Biscuit");
    expect(element.shadowRoot.textContent).toContain("Animal Tag");
    expect(element.shadowRoot.textContent).toContain("Cattery Blue");

    moveRequest.resolve(movedContext);
    await flushPromises();
    await flushPromises();

    expect(moveAnimal).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId,
      animalId: MAP_CONTEXT.animals[0].animalId,
      targetAreaId: "a21J60000000002IAA"
    });
  });

  it("adds an off-board animal to the selected area from the picker", async () => {
    const candidate = {
      animalId: "a00J60000000009IAA",
      animalRecordName: "AN-00009",
      animalName: "Scout",
      species: "Rabbit",
      breed: "Mini Lop",
      primaryImageUrl: "https://example.com/animal360/scout.jpg",
      welfareRisk: "Low",
      currentStatus: "In Care",
      careStatus: "Open",
      isOnBoard: false
    };
    const movedContext = {
      ...MAP_CONTEXT,
      animals: [
        ...MAP_CONTEXT.animals,
        {
          ...MAP_CONTEXT.animals[0],
          animalId: candidate.animalId,
          animalRecordName: candidate.animalRecordName,
          animalName: candidate.animalName,
          species: candidate.species,
          breed: candidate.breed,
          primaryImageUrl: candidate.primaryImageUrl,
          welfareRisk: candidate.welfareRisk,
          areaId: MAP_CONTEXT.areas[0].id,
          housingUnitId: MAP_CONTEXT.areas[0].housingUnitId,
          housingUnitName: MAP_CONTEXT.areas[0].housingUnitName
        }
      ]
    };
    searchAnimalsForArea
      .mockResolvedValueOnce([candidate])
      .mockResolvedValueOnce([]);
    moveAnimal.mockResolvedValue(movedContext);

    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit(MAP_CONTEXT);
    await flushPromises();

    findButton(element, "Add Animal").dispatchEvent(new CustomEvent("click"));
    await flushPromises();
    await flushPromises();

    expect(searchAnimalsForArea).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId,
      targetAreaId: MAP_CONTEXT.areas[0].id,
      searchTerm: ""
    });
    expect(element.shadowRoot.textContent).toContain("Scout");
    expect(element.shadowRoot.textContent).toContain("Not on this board");

    element.shadowRoot
      .querySelector(".animal-add-card")
      .dispatchEvent(new CustomEvent("click"));
    findButton(element, "Add to Area").dispatchEvent(new CustomEvent("click"));
    await flushPromises();
    await flushPromises();

    expect(moveAnimal).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId,
      animalId: candidate.animalId,
      targetAreaId: MAP_CONTEXT.areas[0].id
    });
    expect(searchAnimalsForArea).toHaveBeenCalledTimes(2);
    expect(element.shadowRoot.textContent).toContain("Scout");
  });

  it("packs high-volume animal groups and grows crowded areas", async () => {
    const crowdedAnimals = Array.from({ length: 140 }, (_, index) => ({
      ...MAP_CONTEXT.animals[0],
      animalId: `a00J60000001${String(index).padStart(3, "0")}IAA`,
      animalRecordName: `AN-${String(index + 10).padStart(5, "0")}`,
      animalName: `Dog ${index + 1}`,
      areaId: MAP_CONTEXT.areas[0].id,
      slotIndex: index
    }));
    const element = createElement("c-a360-estate-map", {
      is: A360EstateMap
    });
    document.body.appendChild(element);

    getMapContextAdapter.emit({
      ...MAP_CONTEXT,
      animals: crowdedAnimals
    });
    await flushPromises();

    const tokens = [...element.shadowRoot.querySelectorAll(".animal-token")];
    expect(tokens).toHaveLength(140);
    expect(tokens[0].className).toContain("is-micro");
    expect(
      tokens.every((token) => !token.getAttribute("style").includes("NaN"))
    ).toBe(true);
    const uniquePositions = new Set(
      tokens.map((token) => token.getAttribute("style").match(/left:[^;]+/)[0])
    );
    expect(uniquePositions.size).toBeGreaterThan(8);

    const kennelArea = element.shadowRoot.querySelector(".map-area");
    expect(kennelArea.className).toContain("density-overflow");
    const areaLeft = percentStyleValue(kennelArea, "left");
    const areaTop = percentStyleValue(kennelArea, "top");
    const areaWidth = percentStyleValue(kennelArea, "width");
    const areaHeight = percentStyleValue(kennelArea, "height");
    expect(areaWidth).toBeGreaterThan(MAP_CONTEXT.areas[0].width);
    expect(areaHeight).toBeGreaterThan(MAP_CONTEXT.areas[0].height);

    tokens.forEach((token) => {
      const left = percentStyleValue(token, "left");
      const top = percentStyleValue(token, "top");
      expect(left).toBeGreaterThanOrEqual(areaLeft);
      expect(left).toBeLessThanOrEqual(areaLeft + areaWidth);
      expect(top).toBeGreaterThan(areaTop + 4);
      expect(top).toBeLessThanOrEqual(areaTop + areaHeight);
    });
  });
});
