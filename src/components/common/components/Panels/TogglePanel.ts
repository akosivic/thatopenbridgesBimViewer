import * as BUI from "@thatopen/ui";

export default () => {
  interface PanelState {
    isActive: boolean;
  }

  const [panel, updateState, getState] = BUI.Component.create<HTMLElement, PanelState>(
    (state) => BUI.html`
      <bim-panel>
        <bim-panel-section name="toggle" label="Toggle Example" icon="solar:switch-bold">
          <bim-toggle 
            .checked=${state.isActive}
            @change=${() => updateState({isActive: !state.isActive})}
            label="${state.isActive ? 'On' : 'Off'}">
          </bim-toggle>
        </bim-panel-section>
      </bim-panel>
    `,
    { isActive: false }
  );

  return panel;
};