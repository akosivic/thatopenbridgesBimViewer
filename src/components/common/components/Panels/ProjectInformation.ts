import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";

export default async (components: OBC.Components, isDebug: boolean) => {
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

  // State to store datapoint keys and button states
  const dataPointKeys: string[] = [];
  const buttonStates: Record<string, boolean> = {};

  // Function to fetch all datapoint keys
  const getAllDataPointKeys = async () => {
    try {
      const response = await fetch('/api/getAllDataPointKeys');
      if (!response.ok) {
        throw new Error('Failed to fetch datapoint keys');
      }
      const data = await response.json();
      if (data.keys && Array.isArray(data.keys)) {
        dataPointKeys.length = 0;
        data.keys.forEach((key: string) => {
          dataPointKeys.push(key);
          buttonStates[key] = false; // Initialize all buttons to off
        });
        return dataPointKeys;
      }
    } catch (error) {
      console.error('Error fetching datapoint keys:', error);
    }
    return [];
  };
  interface datapointButtonState { buttons: BUI.TemplateResult[] }
  const dataPointButtonsResult: datapointButtonState = { buttons: [] };
  // Function to update datapoint by key
  const updateDataPoint = async (key: string) => {
    try {
      buttonStates[key] = !buttonStates[key]; // Toggle button state
      const response = await fetch(`/api/getDataPoint?key=${key}`);
      if (!response.ok) {
        throw new Error(`Failed to update datapoint for key: ${key}`);
      }
      dataPointButtonsResult.buttons = await renderDataPointButtons();
      updateState(dataPointButtonsResult); // Update the component state
      console.log(`Updated datapoint for key: ${key}`);
    } catch (error) {
      console.error(`Error updating datapoint for key: ${key}:`, error);
      buttonStates[key] = !buttonStates[key]; // Revert state on error
    }
  };

  // Function to render datapoint buttons
  const renderDataPointButtons = async () => {
    // Fetch datapoint keys when component is created
    await getAllDataPointKeys();
    return dataPointKeys.map(key => {
      const isActive = buttonStates[key] || false;
      const buttonStyle = isActive ?
        "flex: 0; background-color: #4CAF50;" :
        "flex: 0; background-color: #f44336;";

      return BUI.html`
        <bim-button 
          style="${buttonStyle}" 
          @click=${() => updateDataPoint(key)} 
          icon="solar:lamp-bold" 
          label="${key + (isActive ? ' (On)' : ' (Off)')}">
        </bim-button>
      `;
    });
  };

  dataPointButtonsResult.buttons = await renderDataPointButtons();
  const [panel, updateState] = BUI.Component.create<HTMLElement, datapointButtonState>((dpresult) => {
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
        <bim-panel-section label="Lights" icon="ph:tree-structure-fill">
          ${dpresult.buttons}
        </bim-panel-section>
      </bim-panel> 
    `;
    }
    else {
      return BUI.html`
      <bim-panel> 
        <bim-panel-section label="Spatial Structures" icon="ph:tree-structure-fill">
          <div style="display: flex; gap: 0.375rem;">
            <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
            <bim-button style="flex: 0;" @click=${() => (relationsTree.expanded = !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
             <bim-button style="flex: 0;" @click=${() => getByQuery("")} icon="solar:refresh-bold"></bim-button>
          </div>
          ${relationsTree}
        </bim-panel-section>
        <bim-panel-section label="Lights" icon="ph:tree-structure-fill">
          ${dpresult.buttons}
        </bim-panel-section>
      </bim-panel> 
    `;
    }
  }, dataPointButtonsResult);

  return panel;
};
