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

  interface statusButtonState { label: string; icon: string, visibility: string, click: () => void, isLightOn: boolean, tag: string | null }
  const statusButton: statusButtonState = {
    isLightOn: false,
    label: "Light:false",
    icon: "solar:lamp-bold",
    visibility: "hidden",
    tag: null,
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

  const zoomToTag = async (tag: string | null) => {
    if (!tag) return;
    // Find all fragments with this tag
    const fragmentIds: string[] = [];
    const allFragments = fragments.list;
    for (const fragment of allFragments) {
      // If Tag is a custom property on fragment.data, use fragment[1]?.data?.Tag
      if ((fragment[1] as any)?.data?.Tag === tag) {
        fragmentIds.push(fragment[0]);
      }
    }
    if (fragmentIds.length > 0 && appManager.viewer) {
      await appManager.viewer.zoomToFragments(fragmentIds);
    }
  };
  
  const toggleLight = async (Tag: string | null) => {
    const value = await getData(Tag);
    if (value !== undefined && value !== null) {
      value.value = !value.value; // Toggle the value
      statusButton.isLightOn = value.value; // Update the state
      statusButton.visibility = "visible";
      const lightStatus = value.value === false ? "off" : "on";
      statusButton.label = `Light:${lightStatus}`;
      statusButton.icon = "solar:lamp-bold";
      statusButton.tag = Tag;
      statusButton.click = () => {
        value.value = !value.value; // Toggle the value
        const lightStatus = value.value === false ? "off" : "on";
        statusButton.label = `Light:${lightStatus}`;
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
    if (fragmentIdMap !== undefined && Object.keys(fragmentIdMap).length !== 0) {
      if (!viewportGrid) return;
      viewportGrid.layout = "second";
      propsTable.expanded = false;
      console.log("onHighlight", fragmentIdMap);
      updatePropsTable({ fragmentIdMap });

      propsTable.dataAsync.then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const groupArray = data;
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
    }
  });





  highlighter.events.select.onClear.add(() => {
    updatePropsTable({ fragmentIdMap: {} });
    if (!viewportGrid) return;
    viewportGrid.layout = "main";
  });
  return panel;
};