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
      const hasAttributesWithTag = (data as BUI.TableGroupData).some(group =>
        group.children.some(p =>
          p.data.Name === "Attributes" &&
          p.children?.some((attr: { data: { Name: string, Value: string } }) =>
            attr.data.Name === "Tag" && attr.data.Value === "315866"
          )
        )
      );

      if (hasAttributesWithTag) {
        updatepropsviewTable({ fragmentIdMap });
      }
    });
  });

  highlighter.events.select.onClear.add(() => {
    updatePropsTable({ fragmentIdMap: {} });
    updatepropsviewTable({ fragmentIdMap: {} });
    if (!viewportGrid) return;
    viewportGrid.layout = "main";
  });

  return BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section name="selection" label="Selection Information" icon="solar:document-bold" fixed>
          ${propsviewTable}
        </bim-panel-section>
      </bim-panel> 
    `;
  });
};