import { html } from "@thatopen/ui";
import { FloatingWarningPanel } from "../../FloatingWarningPanel";

let warningPanelInstance: FloatingWarningPanel | null = null;

export default function warningControls() {
  const toggleConfigMode = () => {
    if (warningPanelInstance) {
      warningPanelInstance.toggleConfigMode();
    }
  };

  const addNewWarning = () => {
    if (warningPanelInstance) {
      warningPanelInstance.addWarning();
    }
  };

  const loadSampleConfig = () => {
    if (warningPanelInstance) {
      warningPanelInstance.resetToSampleConfiguration();
    }
  };

  return html`
    <bim-toolbar-group>
      <div style="display: flex; gap: 8px; align-items: center; padding: 4px;">
        <bim-button 
          @click=${toggleConfigMode}
          tooltip-title="Toggle Warning Configuration Mode"
          tooltip-text="Enable/disable configuration mode for warning panels"
          icon="solar:settings-bold"
          style="background: var(--bim-ui-bg-contrast-20);">
        </bim-button>
        <bim-button 
          @click=${addNewWarning}
          tooltip-title="Add Warning Panel"
          tooltip-text="Add a new warning panel to the scene"
          icon="material-symbols:add-circle"
          style="background: var(--bim-ui-bg-contrast-20);">
        </bim-button>
        <bim-button 
          @click=${loadSampleConfig}
          tooltip-title="Load Sample Configuration"
          tooltip-text="Reset to sample configuration with 6 example warning panels"
          icon="material-symbols:refresh"
          style="background: var(--bim-ui-bg-contrast-20);">
        </bim-button>
        <span style="font-size: 11px; color: var(--bim-ui-text-secondary); margin-left: 4px;">
          Warning Panels
        </span>
      </div>
    </bim-toolbar-group>
  `;
}

/**
 * Set the warning panel instance for the controls
 */
export function setWarningPanelInstance(instance: FloatingWarningPanel): void {
  warningPanelInstance = instance;
}

/**
 * Get the current warning panel instance
 */
export function getWarningPanelInstance(): FloatingWarningPanel | null {
  return warningPanelInstance;
}
