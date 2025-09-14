import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import i18n from "../../utils/i18n";

export default (components: OBC.Components) => {
  // Theme change handler temporarily removed while debugging theme selector visibility

  const worldsTable = CUI.tables.worldsConfiguration({ components });

  // const onWorldConfigSearch = (e: Event) => {
  //   const input = e.target as BUI.TextInput;
  //   // worldsTable.queryString = input.value;
  // };

  const panel = BUI.Component.create<BUI.Panel>(() => {
    const t = (key: string) => i18n.t(key);

    return BUI.html`
      <bim-panel>
        <bim-panel-section label="${t('worlds')}" icon="tabler:world">
          ${worldsTable}
        </bim-panel-section>
      </bim-panel> 
    `;
  });

  // // Listen for language changes
  // i18n.on('languageChanged', () => {
  //   updatePanel();
  // });

  return panel;
};