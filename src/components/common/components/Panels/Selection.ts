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
  const getData = async (tag: string | null) => {
    const response = await fetch("/api/getDataPoint?key=" + tag);
    if (!response.ok) {
      console.error("Failed to fetch data for tag:", tag);
      return;
    }
    const dp = await response.json();
    const value = await fetch("/api/getDpValue?dp=" + dp.id);
    if (!value.ok) {
      console.error("Failed to fetch value for tag:", tag);
      return;
    }
    return await value.json();
  }
  const toggleLight = async (Tag: string | null) => {
    const value = await getData(Tag);
    if (value !== undefined && value !== null) {
      lightStatus = value.value === false ? "off" : "on";
      statusButton.visibility = "visible";
      statusButton.label = `Light:${lightStatus}`;
      statusButton.icon = "solar:lamp-bold";
      statusButton.click = () => {
        lightStatus = value.value === false ? "on" : "off";
        statusButton.visibility = "visible";
        statusButton.label = `Light:${lightStatus}`;
        statusButton.icon = "solar:lamp-bold";
        updateState(statusButton);
      }
      updateState(statusButton);
      console.log("Toggling light", Tag, lightStatus);
    }
    else {
      statusButton.visibility = "hidden";
      updateState(statusButton);
    }

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