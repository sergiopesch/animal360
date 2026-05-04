import { createElement } from "lwc";
import { registerApexTestWireAdapter } from "@salesforce/sfdx-lwc-jest";
import A360EstateMap from "c/a360EstateMap";
import getMapContext from "@salesforce/apex/A360EstateMapService.getMapContext";
import saveAreas from "@salesforce/apex/A360EstateMapService.saveAreas";
import saveMapSettings from "@salesforce/apex/A360EstateMapService.saveMapSettings";
import publishMap from "@salesforce/apex/A360EstateMapService.publishMap";
import moveAnimal from "@salesforce/apex/A360EstateMapService.moveAnimal";
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
  "@salesforce/apex/A360EstateMapService.saveAreas",
  () => ({
    default: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/A360EstateMapService.saveMapSettings",
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
      animalName: "Biscuit",
      species: "Dog",
      welfareRisk: "High",
      careStatus: "Open",
      housingUnitId: "a10J60000000001IAA",
      areaId: "a21J60000000001IAA",
      slotIndex: 0
    },
    {
      animalId: "a00J60000000002IAA",
      animalName: "Maple",
      species: "Dog",
      welfareRisk: "Low",
      careStatus: "Open",
      housingUnitId: "a10J60000000001IAA",
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
    const tokens = element.shadowRoot.querySelectorAll(".animal-token");
    expect(tokens).toHaveLength(2);
    expect(tokens[0].getAttribute("style")).not.toEqual(
      tokens[1].getAttribute("style")
    );
  });

  it("saves edited area layout from edit mode", async () => {
    saveMapSettings.mockResolvedValue(MAP_CONTEXT);
    saveAreas.mockResolvedValue(MAP_CONTEXT);
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

    expect(saveAreas).toHaveBeenCalled();
    expect(saveMapSettings).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId,
      settings: expect.objectContaining({
        mapName: "North London Rescue Estate",
        backgroundStyle: "Whiteboard"
      })
    });
    expect(saveAreas.mock.calls[0][0].areas[0]).toMatchObject({
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
    saveMapSettings.mockResolvedValue(MAP_CONTEXT);
    saveAreas.mockResolvedValue(splitContext);
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

    expect(saveAreas.mock.calls[0][0].areas).toHaveLength(3);
    expect(saveAreas.mock.calls[0][0].areas[2]).toMatchObject({
      id: null,
      label: "Kennel A1 B",
      housingUnitId: null
    });
  });

  it("resizes an area directly on the canvas", async () => {
    saveMapSettings.mockResolvedValue(MAP_CONTEXT);
    saveAreas.mockResolvedValue(MAP_CONTEXT);
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

    expect(saveAreas.mock.calls[0][0].areas[0].width).toBeGreaterThan(18);
    expect(saveAreas.mock.calls[0][0].areas[0].height).toBeGreaterThan(18);
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
    const movedContext = {
      ...MAP_CONTEXT,
      animals: [
        {
          ...MAP_CONTEXT.animals[0],
          housingUnitId: "a10J60000000002IAA",
          areaId: "a21J60000000002IAA"
        }
      ]
    };
    moveAnimal.mockResolvedValue(movedContext);

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
    await flushPromises();

    expect(moveAnimal).toHaveBeenCalledWith({
      mapId: MAP_CONTEXT.mapId,
      animalId: MAP_CONTEXT.animals[0].animalId,
      targetAreaId: "a21J60000000002IAA"
    });
  });
});
