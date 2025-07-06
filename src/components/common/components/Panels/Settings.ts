import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import i18n from "../../utils/i18n";

export default (components: OBC.Components, isDebug: boolean) => {
  const html = document.querySelector("html")!;
  const onThemeChange = (event: Event) => {
    const selector = event.target as BUI.Selector;
    if (
      selector.value === undefined ||
      selector.value === null ||
      selector.value === 0
    ) {
      html.classList.remove("bim-ui-dark", "bim-ui-light");
    } else if (selector.value === 1) {
      html.className = "bim-ui-dark";
    } else if (selector.value === 2) {
      html.className = "bim-ui-light";
    }
  };

  const worldsTable = CUI.tables.worldsConfiguration({ components });

  // const onWorldConfigSearch = (e: Event) => {
  //   const input = e.target as BUI.TextInput;
  //   // worldsTable.queryString = input.value;
  // };

  const panel = BUI.Component.create<BUI.Panel>(() => {
    const t = (key: string) => i18n.t(key);

    if (isDebug) {
      return BUI.html`
      <bim-panel>
        <bim-panel-section label="${t('aspect')}" icon="mage:box-3d-fill">
          <bim-selector vertical @change=${onThemeChange}>
            <bim-option
              value="0"
              label="${t('system')}"
              icon="majesticons:laptop"
              .checked=${!html.classList.contains("bim-ui-dark") &&
        !html.classList.contains("bim-ui-light")
        }>
            </bim-option>
            <bim-option value="1" label="${t('dark')}" icon="solar:moon-bold" .checked=${html.classList.contains("bim-ui-dark")}></bim-option>
            <bim-option value="2" label="${t('light')}" icon="solar:sun-bold" .checked=${html.classList.contains("bim-ui-light")}></bim-option>
          </bim-selector>
        </bim-panel-section>
        <bim-panel-section label="${t('worlds')}" icon="tabler:world">
          ${worldsTable}
        </bim-panel-section>
      </bim-panel> 
    `;
    }
    else {
      return BUI.html`
      <bim-panel>
        <bim-panel-section label="${t('aspect')}" icon="mage:box-3d-fill">
          <bim-selector vertical @change=${onThemeChange}>
            <bim-option
              value="0"
              label="${t('system')}"
              icon="majesticons:laptop"
              .checked=${!html.classList.contains("bim-ui-dark") &&
        !html.classList.contains("bim-ui-light")
        }>
            </bim-option>
            <bim-option value="1" label="${t('dark')}" icon="solar:moon-bold" .checked=${html.classList.contains("bim-ui-dark")}></bim-option>
            <bim-option value="2" label="${t('light')}" icon="solar:sun-bold" .checked=${html.classList.contains("bim-ui-light")}></bim-option>
          </bim-selector>
        </bim-panel-section>
      </bim-panel> 
    `;
    }
  });

  // // Listen for language changes
  // i18n.on('languageChanged', () => {
  //   updatePanel();
  // });

  return panel;
};