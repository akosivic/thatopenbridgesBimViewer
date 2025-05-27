import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as CUI from "@thatopen/ui-obc";
import { AppManager } from "../bim-components";


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
  interface statusButtonState { label: string; icon: string, visibility: string, click: () => void }
  const statusButton: statusButtonState = {
    label: `Light:${lightStatus}`,
    icon: "solar:lamp-bold",
    visibility: "hidden",
    click: () => toggleLight(null)
  };

  propsTable.preserveStructureOnFilter = true;

  // const fetchLightStatus = async () => {
  //   try {
  //     // Use getDpsValues endpoint instead since getDpValue is having issues
  //     const response = await fetch('/api/getDpsValues?dps=Favorites.Light.Lounge.01.ST');
  //     const data = await response.json();
  //     // Adjust how we extract the value based on the response structure
  //     lightStatus = data?.test?.["Favorites.Light.Lounge.01.ST"] === true ? "on" : "off";
  //     if (statusButton) {
  //       statusButton.label = `Light: ${lightStatus}`;
  //       statusButton.icon = lightStatus === "on" ? "solar:lamp-on-bold" : "solar:lamp-bold";
  //       statusButton.click = toggleLight;
  //       statusButton.visibility = "visible";
  //       updateState(statusButton);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching light status:', error);
  //   }
  // };

  // const toggleLight = async () => {
  //   try {
  //     // Toggle the light state via API using the working endpoint
  //     const newState = lightStatus === "on" ? false : true;
  //     // Use the getDpsValues endpoint with PUT method to update the value
  //     await fetch('/api/getDpsValues', {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         "Favorites.Light.Lounge.01.ST": newState
  //       })
  //     });
  //     await fetchLightStatus();
  //   } catch (error) {
  //     console.error('Error toggling light:', error);
  //   }
  // };
  const [panel, updateState] = BUI.Component.create<HTMLElement, statusButtonState>(
    (statusButtonState) => {
      const pane = BUI.html`
      <bim-panel ?hidden="${statusButtonState.visibility === 'hidden'}">
        <bim-panel-section name="selection" label="Selection Information" icon="solar:document-bold" fixed>
        <bim-button @click="${() => statusButton.click()}" icon="${statusButtonState.icon}" style="flex: 0" label="${statusButtonState.label}"></bim-button>
        </bim-panel-section>
      </bim-panel> 
      `
      return pane;
    },
    statusButton
  );
  const toggleLight = (Tag: string | null) => {
    //get state
    lightStatus = lightStatus === "on" ? "off" : "on";
    statusButton.visibility = "visible";
    statusButton.label = `Light:${lightStatus}`;
    statusButton.icon = "solar:lamp-bold";
    updateState(statusButton);
    console.log("Toggling light", Tag, lightStatus);
  }
  fragments.onFragmentsDisposed.add(() => {
    updatePropsTable();
  });

  highlighter.events.select.onHighlight.add((fragmentIdMap) => {
    if (!viewportGrid) return;
    viewportGrid.layout = "second";
    propsTable.expanded = false;
    updatePropsTable({ fragmentIdMap });

    propsTable.dataAsync.then((data) => {
      const groupArray = Array.isArray(data) ? data : Object.values(data as BUI.TableGroupData);
      const groupAttribute = groupArray[0].children.filter((children: { data: { Name: string; }; }) =>
        children.data.Name === "Attributes");
      let classattr = "";
      let tag = "";
      groupAttribute[0].children.forEach((elem: { data: { Name: string, Value: string } }) => {
        switch (elem.data.Name) {
          case "Class":
            classattr = elem.data.Value;
            break;
          case "Tag":
            tag = elem.data.Value;
            break;
        }
      });


      switch (classattr) {
        case "IFCFLOWTERMINAL":
          toggleLight(tag);
          break;
        default:
          statusButton.visibility = "hidden";
          updateState(statusButton);
      }
    });
  });





  highlighter.events.select.onClear.add(() => {
    updatePropsTable({ fragmentIdMap: {} });
    if (!viewportGrid) return;
    viewportGrid.layout = "main";
  });
  return panel;
};