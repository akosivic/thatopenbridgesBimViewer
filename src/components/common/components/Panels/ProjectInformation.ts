import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";
import { FragmentIdMap } from "@thatopen/fragments";
import { Highlighter } from "@thatopen/components-front";

interface DataPointState {
  keys: string[];
  buttonStates: Record<string, boolean>;
  buttons: BUI.TemplateResult[];
}

interface DataPointKeysResponse {
  keys: string[];
}

export default async (components: OBC.Components, isDebug: boolean, world: OBC.SimpleWorld, highlighter: Highlighter) => {




  const viewpoints = components.get(OBC.Viewpoints);
  const viewpoint = viewpoints.create(world, { title: "My Viewpoint" }); // You can set an optional title for UI purposes

  viewpoint.selectionComponents.add(
    "3wdHiIt7H5Hw_1XOYvi1bW"
  );

  const [modelsList] = CUI.tables.modelsList({ components });
  const [relationsTree] = CUI.tables.relationsTree({
    components,
    models: [],
    hoverHighlighterName: "hover",
    selectHighlighterName: "select",
  });
  relationsTree.preserveStructureOnFilter = false;

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    relationsTree.queryString = input.value;
  };
  const getByQuery = (query: string) => {
    relationsTree.queryString = query;
  };

  // Centralized state for datapoints
  const dataPointState: DataPointState = {
    keys: [],
    buttonStates: {},
    buttons: [],
  };

  // Fetch all datapoint keys (memoized, refreshable)
  let keysFetched = false;
  const getAllDataPointKeys = async (forceRefresh = false): Promise<string[]> => {
    if (keysFetched && !forceRefresh) return dataPointState.keys;
    try {
      const response = await fetch("/api/getAllDataPointKeys");
      if (!response.ok) throw new Error("Failed to fetch datapoint keys");
      const data: DataPointKeysResponse = await response.json();
      if (Array.isArray(data.keys)) {
        dataPointState.keys = data.keys;
        dataPointState.buttonStates = {};
        data.keys.forEach((key) => {
          dataPointState.buttonStates[key] = false;
        });
        keysFetched = true;
        return data.keys;
      }
    } catch (error) {
      console.error("Error fetching datapoint keys:", error);
    }
    return [];
  };

  // const updateViewpointCamera = async () => {
  //   console.log("Position before updating", viewpoint.position);
  //   OBC.Zoom.to(viewpoint.position, world.camera.controls, 1.5);
  //   console.log("Position after updating", viewpoint.position);
  // };

  // const setWorldCamera = async () => {
  //   const initialPosition = new THREE.Vector3();
  //   world.camera.controls.getPosition(initialPosition);
  //   console.log("Camera position before updating", initialPosition);
  //   await viewpoint.go(world);
  //   const finalPosition = new THREE.Vector3();
  //   world.camera.controls.getPosition(finalPosition);
  //   console.log("Camera position before updating", finalPosition);
  // };

  // Update datapoint by key
  const updateDataPoint = async (key: string) => {
    try {
      dataPointState.buttonStates[key] = !dataPointState.buttonStates[key];
      const response = await fetch(`/api/getDataPoint?key=${key}`);
      if (!response.ok) throw new Error(`Failed to update datapoint for key: ${key}`);

      // Zoom to the selected key
      try {
        const test: FragmentIdMap = {
          "1a21fd45-7d11-4e53-99fa-e11a9cb26a07": new Set([28643]),
          "7f40df5e-9b70-4695-9601-5320b37ed2ef": new Set([28643]),
          "9b08e834-54bf-4d5c-b5b7-71b3edf41499": new Set([28643]),
          "a2f684b7-bc71-41bb-b924-6671f8167ab6": new Set([28643])
        };
        // const allowedfragmentIdMap = [
        //   "91ab8602-652d-4a72-97a2-e23b5cca4967",
        //   "750e5760-7185-437d-88d8-0d1937f771f8",
        //   "b1e23697-3c00-49ae-b293-e080a9faac7a",
        //   "161a1c76-2084-4c7a-b04b-61b4a21e319f"
        // ];
        highlighter.zoomToSelection = true;
        highlighter.highlightByID("select", test, true, true, highlighter.selection.select);
        // highlighter.highlight("select", true,;

        // updateViewpointCamera();
        // await viewpoint.go(world);
        // world.camera.controls.getPosition(finalPosition);

        // world.components.get(OBC.
        // const scene = components.scene;

        // // Find the object related to this key
        // const object = scene.getObjectByName(key);
        // if (object) {
        //   // Zoom to the object
        //   world.fitToObject(object, 1.5);
        // } else {
        //   console.log(`No object found for key: ${key}`);
        // }
      } catch (zoomError) {
        console.warn(`Could not zoom to key ${key}:`, zoomError);
      }

      await renderDataPointButtons();
      updateState({ ...dataPointState });
      console.log(`Updated datapoint for key: ${key}`);
    } catch (error) {
      console.error(`Error updating datapoint for key: ${key}:`, error);
      dataPointState.buttonStates[key] = !dataPointState.buttonStates[key]; // Revert state
    }
  };

  // Render datapoint buttons
  const renderDataPointButtons = async () => {
    await getAllDataPointKeys();
    dataPointState.buttons = dataPointState.keys.map((key) => {
      const isActive = dataPointState.buttonStates[key] || false;
      const buttonStyle = isActive
        ? "flex: 0; background-color: #4CAF50;"
        : "flex: 0; background-color: #f44336;";
      return BUI.html`
        <bim-button
          style="${buttonStyle}"
          @click=${() => updateDataPoint(key)}
          icon="solar:lamp-bold"
          label="${key + (isActive ? " (On)" : " (Off)")}">
        </bim-button>
      `;
    });
  };

  await renderDataPointButtons();

  const [panel, updateState] = BUI.Component.create<HTMLElement, DataPointState>((dpState) => {
    if (isDebug) {
      return BUI.html`
        <bim-panel>
          <bim-panel-section label="Loaded Models" icon="mage:box-3d-fill">
            ${modelsList}
          </bim-panel-section>
          <bim-panel-section label="Spatial Structures" icon="ph:tree-structure-fill">
            <div style="display: flex; gap: 0.375rem;">
              <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
              <bim-button style="flex: 0;" @click=${() => (relationsTree.expanded = !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
              <bim-button style="flex: 0;" @click=${() => getByQuery("")} icon="solar:refresh-bold"></bim-button>
            </div>
            ${relationsTree}
          </bim-panel-section>
          ${groupings(components)}
          <bim-panel-section label="Lights" icon="solar:lamp-bold">
            ${dpState.buttons}
          </bim-panel-section>
        </bim-panel>
      `;
    } else {
      return BUI.html`
        <bim-panel>
          <bim-panel-section label="Lights" icon="solar:lamp-bold">
            ${dpState.buttons}
          </bim-panel-section>
        </bim-panel>
      `;
    }
  }, dataPointState);

  return panel;
};
