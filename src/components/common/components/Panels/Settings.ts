import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import i18n from "../../utils/i18n";

export default (components: OBC.Components) => {

  const setTheme = () => {
    const dropdown = document.querySelector('[data-name="theme-color-scheme"]') as BUI.Dropdown;
    const colorScheme = dropdown?.value as unknown as string;
    if (colorScheme === "auto") {
      document.documentElement.style.colorScheme = ""
    } else {
      document.documentElement.style.colorScheme = colorScheme;
    }
  }

  const worldsTable = CUI.tables.worldsConfiguration({ components });

  return BUI.html`
    <bim-panel>
      <bim-panel-section label="${i18n.t('aspect')}" icon="solar:palette-2-bold">
        <bim-option label="${i18n.t('theme')}" icon="solar:palette-2-bold">
          <bim-dropdown @change=${setTheme} data-name="theme-color-scheme" required>
            <bim-option value="auto" label="${i18n.t('system')}" icon="solar:settings-bold"></bim-option>
            <bim-option value="dark" label="${i18n.t('dark')}" icon="solar:moon-bold"></bim-option>
            <bim-option value="light" label="${i18n.t('light')}" icon="solar:sun-bold"></bim-option>
          </bim-dropdown>
        </bim-option>
      </bim-panel-section>
      <bim-panel-section icon="tabler:world" label="${i18n.t('worlds')}">
        ${worldsTable}
      </bim-panel-section>
    </bim-panel>
  `;
};