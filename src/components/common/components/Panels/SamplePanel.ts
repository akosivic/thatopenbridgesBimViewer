import * as BUI from "@thatopen/ui";

// Define the StatefullComponent type
type StatefullComponent<S> = (state: S) => string | HTMLElement;
type UpdateFunction<S> = (newState: Partial<S>) => void;

// Sample panel component using the constructor pattern
export default () => {
  // Define the state interface
  interface PanelState {
    title: string;
    isVisible: boolean;
    items: string[];
  }

  // Initial state
  const initialState: PanelState = {
    title: "Sample Panel",
    isVisible: true,
    items: ["Item 1", "Item 2", "Item 3"]
  };

  // Template function that renders based on state
  const template = (state: PanelState) => {
    const itemsHtml = state.items.map(item => `<div class="panel-item">${item}</div>`).join("");
    
    return BUI.html`
      <bim-panel visibility="${state.isVisible ? 'visible' : 'hidden'}">
        <bim-panel-section name="sample" label="${state.title}" icon="solar:document-bold" fixed>
          <div class="panel-content">
            ${itemsHtml}
          </div>
        </bim-panel-section>
      </bim-panel>
    `;
  };

  // Create the component using the constructor pattern
  const [panel, updatePanel, getState] = BUI.Component.create<HTMLElement, PanelState>(
    template,
    initialState
  );

  // Example of updating the state
  setTimeout(() => {
    updatePanel({ 
      items: [...getState().items, "New Item"] 
    });
  }, 2000);

  return panel;
};