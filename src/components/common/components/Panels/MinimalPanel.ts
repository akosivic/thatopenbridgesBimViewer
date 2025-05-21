import * as BUI from "@thatopen/ui";

export default () => {
  // Simple state interface
  interface PanelState {
    count: number;
    label: string;
  }

  // Initial state
  const initialState: PanelState = {
    count: 0,
    label: "Click me"
  };

  // Create the component using the constructor pattern
  const [panel, updateState, getState] = BUI.Component.create<HTMLElement, PanelState>(
    (state) => BUI.html`
      <bim-panel>
        <bim-panel-section name="counter" label="Counter Example" icon="solar:add-circle-bold">
          <div>${state.count}</div>
          <bim-button @click=${() => updateState({count: state.count + 1})} label="${state.label}"></bim-button>
        </bim-panel-section>
      </bim-panel>
    `,
    initialState
  );

  return panel;
};