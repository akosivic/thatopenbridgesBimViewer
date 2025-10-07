import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
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
    buttons: []
  };

  // Fetch all datapoint keys with debugging
  let keysFetched = false;
  const getAllDataPointKeys = async (forceRefresh = false): Promise<string[]> => {
    if (keysFetched && !forceRefresh) return dataPointState.keys;
    try {
      console.log("🔍 Fetching datapoint keys from server...");
      const response = await fetch("/ws/node/api/GetDpsMapKeys");
      console.log("📡 API Response status:", response.status);
      if (!response.ok) throw new Error(`Failed to fetch datapoint keys: ${response.status}`);
      const data: DataPointKeysResponse = await response.json();
      console.log("📊 Raw API data:", data);
      const keys = Object.keys(data);
      console.log("🔑 Extracted keys:", keys);
      if (keys && keys.length > 0) {
        dataPointState.keys = keys;
        
        // Initialize button states from backend instead of defaulting to false
        console.log("🔄 Fetching initial button states from loytec-datapoints.json...");
        try {
          const statesResponse = await fetch("/ws/node/api/getInitialButtonStates");
          if (statesResponse.ok) {
            const buttonStates = await statesResponse.json();
            console.log("📊 Backend button states from JSON:", buttonStates);
            dataPointState.buttonStates = buttonStates;
            console.log("✅ Button states synchronized with loytec-datapoints.json");
          } else {
            console.warn("⚠️ Failed to fetch button states, using defaults");
            dataPointState.buttonStates = {};
            keys.forEach((key) => {
              dataPointState.buttonStates[key] = false;
            });
          }
        } catch (stateError) {
          console.error("❌ Error fetching button states:", stateError);
          dataPointState.buttonStates = {};
          keys.forEach((key) => {
            dataPointState.buttonStates[key] = false;
          });
        }
        
        keysFetched = true;
        console.log("✅ Successfully loaded", keys.length, "light groups:", keys);
        console.log("🎯 Final button states:", dataPointState.buttonStates);
        return dataPointState.keys;
      } else {
        console.warn("⚠️ No keys found in API response");
      }
    } catch (error) {
      console.error("❌ Error fetching datapoint keys:", error);
    }
    return [];
  };

  // Helper function to re-highlight all currently ON groups
  const reHighlightAllOnGroups = async () => {
    try {
      // Get current button states
      const statesResponse = await fetch("/ws/node/api/getInitialButtonStates");
      if (!statesResponse.ok) return;
      
      const buttonStates = await statesResponse.json();
      
      // Highlight each group that is ON
      for (const [groupKey, isOn] of Object.entries(buttonStates)) {
        if (isOn) {
          console.log(`� Re-highlighting ON group: ${groupKey}`);
          await highlightGroup(groupKey);
        }
      }
    } catch (error) {
      console.error('❌ Error re-highlighting groups:', error);
    }
  };

  // Helper function to highlight a specific group
  const highlightGroup = async (groupKey: string) => {
    try {
      const lightDataResponse = await fetch(`/ws/node/api/getDataPoint?key=${groupKey}`);
      if (lightDataResponse.ok) {
        const lightData: [{ key: string; name: string }] = await lightDataResponse.json();
        
        for (const element of lightData) {
          const targetKey = Object.keys(element)[0];
          getByQuery(targetKey);
          await relationsTree.requestUpdate();
          await relationsTree.updateComplete;
          
          relationsTree.expanded = true;
          
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
                if (Array.isArray(item.children)) {
                  results = [...results, ...findItemsByName(item.children, name)];
                }
              }
            }
            return results;
          };

          const foundItems = findItemsByName(relationsTree.data, targetKey);
          if (foundItems.length > 0 && model) {
            const fragmentIdMap = model.getFragmentMap([foundItems[0].data.expressID]);
            highlighter.highlightByID("select", fragmentIdMap, false, false, undefined, undefined, false);
            console.log(`🎨 Highlighted elements for ${targetKey}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error highlighting group ${groupKey}:`, error);
    }
  };

  // Update datapoint by key - writes to loytec-datapoints.json
  const updateDataPoint = async (key: string) => {
    try {
      console.log(`🔄 Toggling light group: ${key}`);
      
      // Call the backend to actually toggle the light group and update JSON file
      const response = await fetch('/ws/node/api/toggleLightGroup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lightGroup: key })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to toggle light group ${key}: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Light group ${key} toggled successfully in loytec-datapoints.json:`, result);

      // Update local button state based on the backend response
      const newState = result.newState === 'ON';
      dataPointState.buttonStates[key] = newState;
      
      // Handle highlighting based on new state - selective approach
      if (!newState) {
        console.log(`� Light group ${key} turned OFF - removing only its highlights`);
        // Clear all highlights and re-highlight only the groups that should remain ON
        highlighter.clear();
        await reHighlightAllOnGroups();
      } else {
        console.log(`💡 Light group ${key} turned ON - adding its highlights`);
        // Just add highlights for this group (other groups remain highlighted)
        await highlightGroup(key);
      }
      
      // Re-fetch button states to ensure perfect sync with JSON file
      console.log("🔄 Re-syncing all button states from loytec-datapoints.json...");
      try {
        const statesResponse = await fetch("/ws/node/api/getInitialButtonStates");
        if (statesResponse.ok) {
          const buttonStates = await statesResponse.json();
          console.log("📊 Updated backend button states from JSON:", buttonStates);
          Object.assign(dataPointState.buttonStates, buttonStates);
          console.log("✅ All button states re-synchronized with JSON file");
        }
      } catch (syncError) {
        console.warn("⚠️ Failed to re-sync button states:", syncError);
      }
      
      await renderDataPointButtons();
      updateState({ ...dataPointState });
      console.log(`Updated datapoint for key: ${key}`);
    } catch (error) {
      console.error(`Error updating datapoint for key: ${key}:`, error);
      // Don't revert state since we're syncing with backend
    }
  };

  // Render datapoint buttons with proper JSON state sync
  const renderDataPointButtons = async () => {
    console.log("🎨 Starting renderDataPointButtons...");
    await getAllDataPointKeys();
    console.log("🔢 Number of keys to render:", dataPointState.keys.length);
    console.log("🎛️ Current button states from JSON:", dataPointState.buttonStates);
    
    dataPointState.buttons = dataPointState.keys.map((key) => {
      const isActive = dataPointState.buttonStates[key] || false;
      console.log(`🎯 Creating button for key: ${key}, active: ${isActive}, style: ${isActive ? 'GREEN' : 'RED'}`);
      return BUI.html`
        <bim-button
          class="datapoint-button${isActive ? ' active' : ''}"
          @click=${() => updateDataPoint(key)}
          icon="solar:lamp-bold"
          label="${key + (isActive ? " (" + i18n.t('on') + ")" : " (" + i18n.t('off') + ")")}">
        </bim-button>
      `;
    });
    console.log("✨ Buttons created:", dataPointState.buttons.length);
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
          <bim-panel-section label="${t('lights')}" icon="solar:lamp-bold" fixed>
            ${dpState.buttons}
          </bim-panel-section>
        </bim-panel>
      `;
  }, dataPointState);

  // Add triggerInitialHighlighting function to the panel for WorldViewer to call
  (panel as any).triggerInitialHighlighting = async () => {
    console.log('🔥 Starting initial highlighting based on Loytec datapoint states...');
    
    if (!model) {
      console.log('⚠️ Model not available yet for initial highlighting');
      return;
    }

    // Clear any existing highlights first
    highlighter.clear();
    
    // Get current button states from the server
    try {
      const statesResponse = await fetch("/ws/node/api/getInitialButtonStates");
      if (!statesResponse.ok) {
        console.error('❌ Failed to fetch initial button states for highlighting');
        return;
      }
      
      const buttonStates = await statesResponse.json();
      console.log('📊 Button states for initial highlighting:', buttonStates);
      
      // For each group that is ON, highlight its lights
      for (const [groupKey, isOn] of Object.entries(buttonStates)) {
        if (isOn) {
          console.log(`💡 Group ${groupKey} is ON - highlighting its lights...`);
          
          try {
            // Get the individual lights for this group
            const lightDataResponse = await fetch(`/ws/node/api/getDataPoint?key=${groupKey}`);
            if (lightDataResponse.ok) {
              const lightData: [{ key: string; name: string }] = await lightDataResponse.json();
              
              // Highlight each light in the group
              for (const element of lightData) {
                const targetKey = Object.keys(element)[0];
                
                // Use the search functionality to find and highlight the element
                getByQuery(targetKey);
                await relationsTree.requestUpdate();
                await relationsTree.updateComplete;
                
                relationsTree.expanded = true;
                console.log(`🎯 Searching for element with key: ${targetKey}`);

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
                      if (Array.isArray(item.children)) {
                        results = [...results, ...findItemsByName(item.children, name)];
                      }
                    }
                  }
                  return results;
                };

                const foundItems = findItemsByName(relationsTree.data, targetKey);
                if (foundItems.length > 0) {
                  console.log(`✅ Found ${foundItems.length} items for key ${targetKey} - highlighting...`);
                  const fragmentIdMap = model.getFragmentMap([foundItems[0].data.expressID]);
                  highlighter.highlightByID("select", fragmentIdMap, false, false, undefined, undefined, false);
                  console.log(`🎨 Highlighted elements for ${targetKey}`);
                } else {
                  console.log(`⚠️ No items found for key ${targetKey} in relations tree`);
                }
              }
            } else {
              console.error(`❌ Failed to fetch light data for group ${groupKey}`);
            }
          } catch (error) {
            console.error(`❌ Error highlighting group ${groupKey}:`, error);
          }
        } else {
          console.log(`💡 Group ${groupKey} is OFF - skipping highlighting`);
        }
      }
      
      console.log('✅ Initial highlighting complete based on Loytec datapoint states');
      
    } catch (error) {
      console.error('❌ Error during initial highlighting:', error);
    }
  };

  // Listen for the modelLoadedForLighting event as a fallback
  const handleModelLoadedForLighting = () => {
    console.log('📡 Received modelLoadedForLighting event');
    if ((panel as any).triggerInitialHighlighting) {
      (panel as any).triggerInitialHighlighting();
    }
  };
  
  window.addEventListener('modelLoadedForLighting', handleModelLoadedForLighting);

  return panel;
};

export const setModel = (newModel: FragmentsGroup | undefined) => {
  model = newModel;
};