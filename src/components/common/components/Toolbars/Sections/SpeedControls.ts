import * as BUI from "@thatopen/ui";

// Global variables to track speed
let baseSpeed = 5.0; // Default base speed from WorldViewer
let currentMultiplier = 1; // Current speed multiplier

// Function to set the base speed from WorldViewer
export const setBaseSpeed = (speed: number) => {
  baseSpeed = speed;
  console.log(`Base speed set to: ${speed}`);
};

// Function to get current effective speed
export const getCurrentSpeed = () => baseSpeed * currentMultiplier;

// Function to get current multiplier
export const getCurrentMultiplier = () => currentMultiplier;

export default function speedControls() {
  // Create speed control panel
  const createSpeedPanel = () => {
    // Remove existing panel if it exists
    const existingPanel = document.getElementById('speed-control-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panelElement = document.createElement('div');
    panelElement.id = 'speed-control-panel';
    panelElement.innerHTML = `
      <div style="
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        min-width: 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          font-size: 14px;
          font-weight: 600;
          color: white;
          text-align: center;
          margin-bottom: 8px;
        ">
          Movement Speed
        </div>
        <div style="
          display: flex;
          gap: 12px;
          align-items: center;
        ">
          <button 
            class="speed-button"
            data-speed="1"
            onclick="window.setSpeed(1)"
            title="Normal Speed (x1)"
            style="
              background: #6528d7;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              font-weight: 600;
              min-width: 50px;
              cursor: pointer;
              transition: all 0.2s ease;
              font-size: 12px;
            ">
            x1
          </button>
          <button 
            class="speed-button"
            data-speed="2"
            onclick="window.setSpeed(2)"
            title="Double Speed (x2)"
            style="
              background: rgba(255, 255, 255, 0.2);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              font-weight: 600;
              min-width: 50px;
              cursor: pointer;
              transition: all 0.2s ease;
              font-size: 12px;
            ">
            x2
          </button>
          <button 
            class="speed-button"
            data-speed="3"
            onclick="window.setSpeed(3)"
            title="Triple Speed (x3)"
            style="
              background: rgba(255, 255, 255, 0.2);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              font-weight: 600;
              min-width: 50px;
              cursor: pointer;
              transition: all 0.2s ease;
              font-size: 12px;
            ">
            x3
          </button>
        </div>
        <div style="
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin-top: 4px;
        " id="current-speed-display">
          Current: x1
        </div>
      </div>
    `;
    document.body.appendChild(panelElement);

    // Add hover effects
    const buttons = panelElement.querySelectorAll('.speed-button');
    buttons.forEach((button: any) => {
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
      });
    });

    // Global speed setter function
    (window as any).setSpeed = (multiplier: number) => {
      console.log(`Setting movement speed multiplier to: x${multiplier}`);
      currentMultiplier = multiplier;
      const effectiveSpeed = getCurrentSpeed();
      
      // Dispatch custom event to update WorldViewer moveSpeed
      const speedChangeEvent = new CustomEvent('moveSpeedChange', { 
        detail: { 
          multiplier: multiplier,
          baseSpeed: baseSpeed,
          effectiveSpeed: effectiveSpeed
        } 
      });
      window.dispatchEvent(speedChangeEvent);
      
      // Update button states
      buttons.forEach((button: any) => {
        const buttonSpeed = parseInt(button.dataset.speed);
        if (buttonSpeed === multiplier) {
          button.style.background = '#6528d7';
        } else {
          button.style.background = 'rgba(255, 255, 255, 0.2)';
        }
      });
      
      // Update display
      const display = document.getElementById('current-speed-display');
      if (display) {
        display.textContent = `Current: x${multiplier} (${effectiveSpeed.toFixed(1)})`;
      }
    };
  };

  // Create the panel after a short delay to ensure DOM is ready
  setTimeout(() => {
    createSpeedPanel();
  }, 100);

  // Return empty toolbar group (panel is rendered as floating element)
  return BUI.html`
    <bim-toolbar-group style="display: none;">
      <!-- Speed control panel is rendered as floating element -->
    </bim-toolbar-group>
  `;
}
