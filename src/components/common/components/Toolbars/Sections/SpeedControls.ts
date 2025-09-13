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
  // Set up global functions immediately
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
    const speedButtons = document.querySelectorAll('.speed-button');
    speedButtons.forEach((button: any) => {
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

  (window as any).moveDirection = (direction: string) => {
    console.log(`Manual movement: ${direction}`);
    
    // Dispatch custom event to trigger movement in WorldViewer
    const moveEvent = new CustomEvent('manualMovement', { 
      detail: { 
        direction: direction,
        speed: getCurrentSpeed()
      } 
    });
    window.dispatchEvent(moveEvent);
  };

  // Return inline content for the tab
  return BUI.html`
    <bim-toolbar-group>
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
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
          gap: 16px;
          align-items: center;
        ">
          <!-- Speed Control Buttons -->
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
          
          <!-- Directional Movement Buttons -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr 1fr 1fr;
            gap: 4px;
            width: 120px;
            height: 120px;
          ">
            <!-- Empty top-left -->
            <div></div>
            <!-- Up button -->
            <button 
              class="direction-button"
              onclick="window.moveDirection('up')"
              title="Move Up"
              style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
              ↑
            </button>
            <!-- Empty top-right -->
            <div></div>
            
            <!-- Left button -->
            <button 
              class="direction-button"
              onclick="window.moveDirection('left')"
              title="Move Left"
              style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
              ←
            </button>
            <!-- Empty center -->
            <div></div>
            <!-- Right button -->
            <button 
              class="direction-button"
              onclick="window.moveDirection('right')"
              title="Move Right"
              style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
              →
            </button>
            
            <!-- Empty bottom-left -->
            <div></div>
            <!-- Down button -->
            <button 
              class="direction-button"
              onclick="window.moveDirection('down')"
              title="Move Down"
              style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
              ↓
            </button>
            <!-- Empty bottom-right -->
            <div></div>
          </div>
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
    </bim-toolbar-group>
  `;
}
