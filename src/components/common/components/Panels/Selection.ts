import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as CUI from "@thatopen/ui-obc";
import { AppManager } from "../bim-components";
import { label } from "three/src/nodes/TSL.js";

export default (components: OBC.Components) => {
  const fragments = components.get(OBC.FragmentsManager);
  const highlighter = components.get(OBF.Highlighter);
  const appManager = components.get(AppManager);
  const viewportGrid = appManager.grids.get("viewport");

  const [propsTable, updatePropsTable] = CUI.tables.elementProperties({
    components,
    fragmentIdMap: {},
  });

  let lightStatus = "off";
  let isFromAPI = false;
  const statusButton: { label: string; icon: string, click: () => void } = {
    label: "Light: off",
    icon: "solar:lamp-bold",
    click: () => { },
  };

  propsTable.preserveStructureOnFilter = true;

  const fetchLightStatus = async () => {
    try {
      // Use getDpsValues endpoint instead since getDpValue is having issues
      const response = await fetch('/api/getDpsValues?dps=Favorites.Light.Lounge.01.ST');
      const data = await response.json();
      // Adjust how we extract the value based on the response structure
      lightStatus = data?.test?.["Favorites.Light.Lounge.01.ST"] === true ? "on" : "off";
      if (statusButton) {
        statusButton.label = `Light: ${lightStatus}`;
        statusButton.icon = lightStatus === "on" ? "solar:lamp-on-bold" : "solar:lamp-bold";
        statusButton.click = toggleLight;
        isFromAPI = true
      }
      else {
        isFromAPI = false;
      }
    } catch (error) {
      console.error('Error fetching light status:', error);
    }
  };

  const toggleLight = async () => {
    try {
      // Toggle the light state via API using the working endpoint
      const newState = lightStatus === "on" ? false : true;
      // Use the getDpsValues endpoint with PUT method to update the value
      await fetch('/api/getDpsValues', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "Favorites.Light.Lounge.01.ST": newState
        })
      });
      await fetchLightStatus();
    } catch (error) {
      console.error('Error toggling light:', error);
    }
  };

  fragments.onFragmentsDisposed.add(() => {
    updatePropsTable();
  });

  highlighter.events.select.onHighlight.add((fragmentIdMap) => {
    if (!viewportGrid) return;
    viewportGrid.layout = "second";
    propsTable.expanded = false;
    updatePropsTable({ fragmentIdMap });

    propsTable.dataAsync.then((data) => {
      const hasAttributesWithTag = (data as BUI.TableGroupData).some(group =>
        group.children.some(p =>
          p.data.Name === "Attributes" &&
          p.children?.some((attr: { data: { Name: string, Value: string } }) =>
            attr.data.Name === "Tag" && attr.data.Value === "315866"
          )
        )
      );

      if (hasAttributesWithTag) {
        fetchLightStatus();
      }
      else {
        isFromAPI = false;
      }

      panel.requestUpdate();
      panel.updateComplete.then(() => {
        console.log("Panel updated");
      });
    });
  });

  const isVisible = () => {
    return isFromAPI ? "visible" : "hidden";
  };
  // Create the panel reference so we can call requestUpdate
  const panel = BUI.Component.create<BUI.Panel>(() => {

    return BUI.html`
      <bim-panel visibiliy="${isVisible}" >
        <bim-panel-section name="selection" label="Selection Information" icon="solar:document-bold" fixed>
             <bim-button @click="" icon="${statusButton.icon}" style="flex: 0" label="${statusButton.label}"></bim-button>
        </bim-panel-section>
      </bim-panel> 
    `;
  });

  highlighter.events.select.onClear.add(() => {
    updatePropsTable({ fragmentIdMap: {} });
    if (!viewportGrid) return;
    viewportGrid.layout = "main";
  });
  return panel;
};