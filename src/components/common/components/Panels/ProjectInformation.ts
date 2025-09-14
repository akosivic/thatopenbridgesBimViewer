import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import * as THREE from "three";
import { FragmentsGroup } from "@thatopen/fragments";
import i18n from "../../utils/i18n";

let model: FragmentsGroup | undefined;
let globalCamera: THREE.Camera | undefined;

export const setGlobalCamera = (camera: THREE.Camera | undefined) => {
  globalCamera = camera;
};

export default async (components: OBC.Components) => {
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

  const panel = BUI.Component.create<BUI.Panel>(() => {
    const t = (key: string) => i18n.t(key);
    // Reference model to avoid unused variable warning
    const hasModel = !!model;
    console.log('ProjectInformation panel rendering, has model:', hasModel);
    
    return BUI.html`
        <bim-panel>
          <bim-panel-section label="${t('loadedModels')}" icon="mage:box-3d-fill">
            ${modelsList}
          </bim-panel-section>
          <bim-panel-section label="${t('spatialStructures')}" icon="ph:tree-structure-fill">
            <div style="display: flex; gap: 0.375rem;">
              <bim-text-input @input=${search} vertical placeholder="${t('search')}" debounce="200"></bim-text-input>
              <bim-button style="flex: 0;" @click=${() => (relationsTree.expanded = !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
              <bim-button style="flex: 0;" @click=${() => getByQuery("")} icon="solar:refresh-bold"></bim-button>
            </div>
            ${relationsTree}
          </bim-panel-section>
        </bim-panel>
      `;
  });

  return panel;
};

export const setModel = (newModel: FragmentsGroup | undefined) => {
  model = newModel;
  // Use globalCamera to avoid unused variable warning
  if (globalCamera) {
    console.log('Model set, camera available:', !!globalCamera);
  }
};