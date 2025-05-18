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

  const [propsviewTable, updatepropsviewTable] = CUI.tables.elementProperties({
    components,
    fragmentIdMap: {},
  });

  propsTable.preserveStructureOnFilter = true;
  propsviewTable.preserveStructureOnFilter = true;
  fragments.onFragmentsDisposed.add(() => {
    updatePropsTable();
    updatepropsviewTable();
  });

  highlighter.events.select.onHighlight.add((fragmentIdMap) => {
    if (!viewportGrid) return;
    viewportGrid.layout = "second";
    propsTable.expanded = false;
    updatePropsTable({ fragmentIdMap });
    propsTable.dataAsync.then((data) => {
      const d = data as BUI.TableGroupData;
      for (const group of d) {
        const attributes = group.children.find((p: { data: { Name: string; }; }) => p.data.Name === "Attributes");
        if (attributes) {
          if (attributes.children.find((p: { data: { Name: string, Value: string; }; }) => p.data.Name === "Tag" && p.data.Value === "315866")) {
            updatepropsviewTable({ fragmentIdMap });
            break;
          }
        }
      }
    });
  });

  highlighter.events.select.onClear.add(() => {
    updatePropsTable({ fragmentIdMap: {} });
    updatepropsviewTable({ fragmentIdMap: {} });
    if (!viewportGrid) return;
    viewportGrid.layout = "main";
  });

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    propsTable.queryString = input.value;
  };

  const toggleExpanded = () => {
    propsTable.expanded = !propsTable.expanded;
  };

  return BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section name="selection" label="Selection Information" icon="solar:document-bold" fixed>
          <div style="display: flex; gap: 0.375rem;">
            <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
            <bim-button style="flex: 0;" @click=${toggleExpanded} icon="eva:expand-fill"></bim-button>
            <bim-button style="flex: 0;" @click=${() => propsTable.downloadData("ElementData", "tsv")} icon="ph:export-fill" tooltip-title="Export Data" tooltip-text="Export the shown properties to TSV."></bim-button>
          </div>
          ${propsviewTable}
        </bim-panel-section>
      </bim-panel> 
    `;
  });
};