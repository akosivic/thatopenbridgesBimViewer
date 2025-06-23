import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";
import { Highlighter } from "@thatopen/components-front";
import { FragmentsGroup } from "@thatopen/fragments";

interface DataPointState {
  keys: string[];
  buttonStates: Record<string, boolean>;
  buttons: BUI.TemplateResult[];
}

interface DataPointKeysResponse {
  keys: string[];
}

export default async (components: OBC.Components, isDebug: boolean, world: OBC.SimpleWorld, highlighter: Highlighter, model: FragmentsGroup) => {
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

  // Update datapoint by key
  const updateDataPoint = async (key: string) => {
    try {
      dataPointState.buttonStates[key] = !dataPointState.buttonStates[key];
      const response = await fetch(`/api/getDataPoint?key=${key}`);
      if (!response.ok) throw new Error(`Failed to update datapoint for key: ${key}`);

      // Zoom to the selected key
      const data: [{ key: string; name: string }] = await response.json();

      data.forEach(element => {
        const targetKey = Object.keys(element)[0];
        getByQuery(targetKey);
        // attributesTable.queryString = targetKey;
        relationsTree.requestUpdate();
        relationsTree.updateComplete.then(() => {
          relationsTree.expanded = true;
          console.log(`Zooming to key: ${targetKey}`);

          // Recursive function to find items in the tree with matching name
          const findItemsByName = (items: any[], name: string): any[] => {
            if (!items || !Array.isArray(items)) return [];

            let results: any[] = [];

            for (const item of items) {
              if (!item || !item.data) continue;
              if ((item.data.Tag === name) || (item.data?.Name && typeof item.data.Name === 'string' && item.data.Name.includes(name))) {
                results.push(item);
              }

              if (item.children) {
                // Handle children recursively whether they're an array or just a boolean flag
                if (Array.isArray(item.children)) {
                  results = [...results, ...findItemsByName(item.children, name)];
                }
              }
            }
            return results;
          };

          const foundItems = findItemsByName(relationsTree.data, '467695');// targetKey);
          if (foundItems.length > 0) {
            console.log(`Found ${foundItems.length} items for key ${targetKey}:`, foundItems);
            // Highlight the found items
            foundItems.forEach(async item => {
              if (item.data) {
                const fragmentIdMap = model.getFragmentMap(item.data.expressID);
                // await highlighter.highlight(item.data.Name, true, true);
                await highlighter.highlightByID("select", fragmentIdMap, false, true, undefined, undefined, true);
              }
            });
          } else {
            console.log(`No items found for key ${targetKey} in relations tree`);
          }
        });
      });
      console.log('relationsTree.data:', relationsTree.data);
      // const allowedfragmentIdMap = [
      //   "91ab8602-652d-4a72-97a2-e23b5cca4967",
      //   "750e5760-7185-437d-88d8-0d1937f771f8",
      //   "b1e23697-3c00-49ae-b293-e080a9faac7a",
      //   "161a1c76-2084-4c7a-b04b-61b4a21e319f"
      // ];
      highlighter.zoomToSelection = true;

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
    const isVisible = isDebug ? "visibility:Collapsed" : "visibility:Visible";
    return BUI.html`
        <bim-panel>
          <bim-panel-section label="Loaded Models" icon="mage:box-3d-fill"  style="${isVisible}">
            ${modelsList}
          </bim-panel-section>
          <bim-panel-section label="Spatial Structures" icon="ph:tree-structure-fill" style="${isVisible}">
            <div style="display: flex; gap: 0.375rem;">
              <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
              <bim-button style="flex: 0;" @click=${() => (relationsTree.expanded = !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
              <bim-button style="flex: 0;" @click=${() => getByQuery("")} icon="solar:refresh-bold"></bim-button>
            </div>
            ${relationsTree}
          </bim-panel-section>
          ${groupings(components, isDebug)}
          <bim-panel-section label="Lights" icon="solar:lamp-bold" style="${isVisible}">
            ${dpState.buttons}
          </bim-panel-section>
        </bim-panel>
      `;
  }, dataPointState);

  return panel;
};
