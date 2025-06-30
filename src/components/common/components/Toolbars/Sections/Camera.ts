import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import i18n from "../../../utils/i18n";

export default (world: OBC.World) => {
  const { camera } = world;

  const onFitModel = () => {
    if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
      camera.fit(world.meshes, 0.5);
    }
  };

  const onLock = (e: Event) => {
    const button = e.target as BUI.Button;
    camera.enabled = !camera.enabled;
    button.active = !camera.enabled;
    button.label = camera.enabled ? i18n.t('disable') : i18n.t('enable');
    button.icon = camera.enabled
      ? "tabler:lock-filled"
      : "majesticons:unlock-open";
  };

  // const onProjectionDropdownCreated = (e?: Element) => {
  //   if (!(e && camera instanceof OBC.OrthoPerspectiveCamera)) return;
  //   const dropdown = e as BUI.Dropdown
  //   dropdown.value = [camera.projection.current]
  // }

  // const onProjectionChange = (e: Event) => {
  //   if (!(camera instanceof OBC.OrthoPerspectiveCamera)) return
  //   const dropdown = e.target as BUI.Dropdown
  //   const value = dropdown.value[0]
  //   console.log(value)
  //   camera.projection.set(value)
  // }

  return BUI.Component.create<BUI.PanelSection>(() => {
    const t = (key: string) => i18n.t(key);
    return BUI.html`
      <bim-toolbar-section label="${t('camera')}" icon="ph:camera-fill" style="pointer-events: auto">
        <bim-button label="${t('fitModel')}" icon="material-symbols:fit-screen-rounded" @click=${onFitModel}></bim-button>
        <bim-button label="${t('disable')}" icon="tabler:lock-filled" @click=${onLock} .active=${!camera.enabled}></bim-button>
        <!-- <bim-dropdown required>
          <bim-option label="Perspective"></bim-option>
          <bim-option label="Orthographic"></bim-option>
        </bim-dropdown> -->
      </bim-toolbar-section>
    `;
  });
};
