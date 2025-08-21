import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import * as THREE from "three";
import groupings from "./Sections/Groupings";
import { Highlighter } from "@thatopen/components-front";
import { FragmentsGroup } from "@thatopen/fragments";
import i18n from "../../utils/i18n";

interface DataPointState {
  keys: string[];
  buttonStates: Record<string, boolean>;
  buttons: BUI.TemplateResult[];
}

interface DataPointKeysResponse {
  keys: string[];
}

let model: FragmentsGroup | undefined;
let globalCamera: THREE.Camera | undefined;

export const setGlobalCamera = (camera: THREE.Camera | undefined) => {
  globalCamera = camera;
};

export default async (components: OBC.Components, isDebug: boolean, highlighter: Highlighter) => {


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
      const response = await fetch("/api/GetDpsMapKeys");
      if (!response.ok) throw new Error("Failed to fetch datapoint keys");
      const data: DataPointKeysResponse = await response.json();
      const keys = Object.keys(data);
      if (keys) {
        dataPointState.keys = keys;
        dataPointState.buttonStates = {};
        keys.forEach((key) => {
          dataPointState.buttonStates[key] = false;
        });
        keysFetched = true;
        return dataPointState.keys;
      }
    } catch (error) {
      console.error("Error fetching datapoint keys:", error);
    }
    return [];
  };

  // // Update datapoint by key
  const updateDataPoint = async (key: string) => {
    try {
      highlighter.clear();
      dataPointState.buttonStates[key] = !dataPointState.buttonStates[key];
      if (!dataPointState.buttonStates[key]) {
        console.log(`Turning off datapoint for key: ${key}`);
      } else {
        console.log(`Turning on datapoint for key: ${key}`);
        const response = await fetch(`/api/getDataPoint?key=${key}`);
        if (!response.ok) throw new Error(`Failed to update datapoint for key: ${key}`);

        // Zoom to the selected key
        const data: [{ key: string; name: string }] = await response.json();

        data.forEach(element => {
          const targetKey = Object.keys(element)[0];
          getByQuery(targetKey);
          // attributesTable.queryString = targetKey;
          relationsTree.requestUpdate();
          relationsTree.updateComplete.then(async () => {
            relationsTree.expanded = true;
            console.log(`Zooming to key: ${targetKey}`);

            // Recursive function to find items in the tree with matching name
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const findItemsByName = (items: any[], name: string): any[] => {
              if (!items || !Array.isArray(items)) return [];

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            const foundItems = findItemsByName(relationsTree.data, targetKey);
            if (foundItems.length > 0) {
              console.log(`Found ${foundItems.length} items for key ${targetKey}:`, foundItems);
              if (model) {
                const fragmentIdMap = model.getFragmentMap([foundItems[0].data.expressID]);
                
                // Highlight the fragment
                highlighter.highlightByID("select", fragmentIdMap, false, false, undefined, undefined, false);
                
                // Custom FPS zoom: Move camera to look at the selected element
                try {
                  // Get the bounding box of the selected fragment
                  const fragmentMeshes = [];
                  // Iterate over the fragment map entries
                  for (const fragmentId of Object.keys(fragmentIdMap)) {
                    const fragment = model.items.find(f => f.id === fragmentId);
                    if (fragment && fragment.mesh) {
                      fragmentMeshes.push(fragment.mesh);
                    }
                  }
                  
                  if (fragmentMeshes.length > 0) {
                    // Calculate bounding box of selected elements
                    const bbox = new THREE.Box3();
                    fragmentMeshes.forEach(mesh => bbox.expandByObject(mesh));
                    
                    if (!bbox.isEmpty()) {
                      const center = bbox.getCenter(new THREE.Vector3());
                      const size = bbox.getSize(new THREE.Vector3());
                      
                      // Get current camera from the components or highlighter
                      const worlds = components.get(OBC.Worlds);
                      const worldsList = Array.from(worlds.list.values());
                      const mainWorld = worldsList[0]; // Get the first world (should be "Main")
                      let camera = mainWorld?.camera?.three;
                      
                      // Alternative: try to get camera from highlighter config
                      if (!camera && highlighter.config && highlighter.config.world) {
                        camera = highlighter.config.world.camera?.three;
                      }
                      
                      // Fallback: use global camera reference
                      if (!camera && globalCamera) {
                        camera = globalCamera;
                      }
                      
                      console.log('Worlds list:', worlds.list.size);
                      console.log('Main world found:', !!mainWorld);
                      console.log('Camera found:', !!camera);
                      console.log('Highlighter config world:', !!highlighter.config?.world);
                      console.log('Global camera fallback:', !!globalCamera);
                      
                      if (camera) {
                        // Calculate optimal distance based on object size
                        const maxDim = Math.max(size.x, size.y, size.z);
                        const distance = Math.max(maxDim * 2, 5); // Minimum 5 units away
                        
                        // Calculate direction from center to camera position
                        const direction = camera.position.clone().sub(center).normalize();
                        
                        // Position camera at optimal distance from the center
                        const newPosition = center.clone().add(direction.multiplyScalar(distance));
                        
                        // Keep Y locked to eye level (1.6m)
                        newPosition.y = 1.6;
                        
                        // Smoothly move camera to new position
                        camera.position.copy(newPosition);
                        
                        // Look at the center of the selected object
                        camera.lookAt(center);
                        
                        console.log(`FPS Camera moved to view selected element at:`, center);
                      } else {
                        console.warn('Camera not found - zoom functionality unavailable');
                      }
                    }
                  }
                } catch (zoomError) {
                  console.error('Error during FPS zoom:', zoomError);
                }
              }
            } else {
              console.log(`No items found for key ${targetKey} in relations tree`);
            }
          });
        });
      }
      console.log('relationsTree.data:', relationsTree.data);
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
    // await getDpsValues();
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
          label="${key + (isActive ? " (" + i18n.t('on') + ")" : " (" + i18n.t('off') + ")")}">
        </bim-button>
      `;
    });
  };

  await renderDataPointButtons();

  // Create a function to update the panel when language changes
  const updatePanelOnLanguageChange = async () => {
    await renderDataPointButtons();
    updateState({ ...dataPointState });
  };

  // Listen for language changes
  i18n.on('languageChanged', updatePanelOnLanguageChange);

  const [panel, updateState] = BUI.Component.create<HTMLElement, DataPointState>((dpState) => {
    const isVisible = !isDebug ? "display:none;" : "display:block;";
    const t = (key: string) => i18n.t(key);
    return BUI.html`
        <bim-panel>
          <bim-panel-section label="${t('loadedModels')}" icon="mage:box-3d-fill"  style="${isVisible}">
            ${modelsList}
          </bim-panel-section>
          <bim-panel-section label="${t('spatialStructures')}" icon="ph:tree-structure-fill" style="${isVisible}">
            <div style="display: flex; gap: 0.375rem;">
              <bim-text-input @input=${search} vertical placeholder="${t('search')}" debounce="200"></bim-text-input>
              <bim-button style="flex: 0;" @click=${() => (relationsTree.expanded = !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
              <bim-button style="flex: 0;" @click=${() => getByQuery("")} icon="solar:refresh-bold"></bim-button>
            </div>
            ${relationsTree}
          </bim-panel-section>
          ${groupings(components, isDebug)}
          <bim-panel-section label="${t('lights')}" icon="solar:lamp-bold">
            ${dpState.buttons}
          </bim-panel-section>
        </bim-panel>
      `;
  }, dataPointState);

  return panel;
};

export const setModel = (newModel: FragmentsGroup | undefined) => {
  model = newModel;
};