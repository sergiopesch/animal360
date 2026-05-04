import { createElement } from "lwc";
import { registerApexTestWireAdapter } from "@salesforce/sfdx-lwc-jest";
import A360EstateMap from "c/a360EstateMap";
import getMapContext from "@salesforce/apex/A360EstateMapService.getMapContext";
import saveAreas from "@salesforce/apex/A360EstateMapService.saveAreas";
import publishMap from "@salesforce/apex/A360EstateMapService.publishMap";

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
  "@salesforce/apex/A360EstateMapService.publishMap",
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
  mapName: "North London Demo Estate",
  mapCode: "UK_DEMO_NORTH_LONDON",
  status: "Published",
  canEdit: true,
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
      displayOrder: 10
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
    }
  ],
  housingOptions: [
    {
      id: "a10J60000000001IAA",
      label: "Kennel A1",
      housingType: "Kennel",
      capacity: 2
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
      "North London Demo Estate"
    );
    expect(element.shadowRoot.textContent).toContain("Kennel A1");
    expect(element.shadowRoot.textContent).toContain("Biscuit");
    expect(element.shadowRoot.querySelector(".animal-token")).not.toBeNull();
  });

  it("saves edited area layout from edit mode", async () => {
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
    expect(saveAreas.mock.calls[0][0].areas[0]).toMatchObject({
      label: "Kennel A1 Resized"
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
});
