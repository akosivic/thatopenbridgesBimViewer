import { html } from "@thatopen/ui";
import { debugLog } from "../../../../../utils/debugLogger";

// Speed multiplier state
let currentSpeed = 1;

// Speed control functions
export default function speedControls() {

  // Create and inject the floating speed control panel
  // setTimeout(() => {
  //   const existingPanel = document.getElementById('speed-control-panel');
  //   if (!existingPanel) {
  //     const panelElement = document.createElement('div');
  //     panelElement.id = 'speed-control-panel';
  //     panelElement.innerHTML = `
  //       <div style="
  //         position: fixed;
  //         top: 50%;
  //         left: 50%;
  //         transform: translate(-50%, -50%);
  //         z-index: 99999;
  //         background: rgba(0, 0, 0, 0.8);
  //         backdrop-filter: blur(4px);
  //         border: 1px solid rgba(255, 255, 255, 0.2);
  //         border-radius: 12px;
  //         padding: 16px 20px;
  //         display: flex;
  //         flex-direction: column;
  //         align-items: center;
  //         gap: 12px;
  //         box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  //         min-width: 200px;
  //         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  //       ">
  //         <div style="
  //           font-size: 14px;
  //           font-weight: 600;
  //           color: white;
  //           text-align: center;
  //           margin-bottom: 8px;
  //         ">
  //           Movement Speed
  //         </div>
  //         <div style="
  //           display: flex;
  //           gap: 12px;
  //           align-items: center;
  //         ">
  //           <button 
  //             class="speed-button"
  //             data-speed="1"
  //             onclick="window.setMovementSpeedControl(1)"
  //             title="Normal Speed (x1)"
  //             style="
  //               background: #6528d7;
  //               color: white;
  //               border: none;
  //               border-radius: 8px;
  //               padding: 8px 16px;
  //               font-weight: 600;
  //               min-width: 50px;
  //               cursor: pointer;
  //               transition: all 0.2s ease;
  //               font-size: 12px;
  //             ">
  //             x1
  //           </button>
  //           <button 
  //             class="speed-button"
  //             data-speed="2"
  //             onclick="window.setMovementSpeedControl(2)"
  //             title="Double Speed (x2)"
  //             style="
  //               background: rgba(255, 255, 255, 0.2);
  //               color: white;
  //               border: none;
  //               border-radius: 8px;
  //               padding: 8px 16px;
  //               font-weight: 600;
  //               min-width: 50px;
  //               cursor: pointer;
  //               transition: all 0.2s ease;
  //               font-size: 12px;
  //             ">
  //             x2
  //           </button>
  //           <button 
  //             class="speed-button"
  //             data-speed="3"
  //             onclick="window.setMovementSpeedControl(3)"
  //             title="Triple Speed (x3)"
  //             style="
  //               background: rgba(255, 255, 255, 0.2);
  //               color: white;
  //               border: none;
  //               border-radius: 8px;
  //               padding: 8px 16px;
  //               font-weight: 600;
  //               min-width: 50px;
  //               cursor: pointer;
  //               transition: all 0.2s ease;
  //               font-size: 12px;
  //             ">
  //             x3
  //           </button>
  //         </div>
  //         <div style="
  //           font-size: 11px;
  //           color: rgba(255, 255, 255, 0.7);
  //           text-align: center;
  //           margin-top: 4px;
  //         " id="current-speed-display">
  //           Current: x1
  //         </div>
  //       </div>
  //     `;
  //     document.body.appendChild(panelElement);

  //     // Add hover effects
  //     const buttons = panelElement.querySelectorAll('.speed-button');
  //     buttons.forEach((button: any) => {
  //       button.addEventListener('mouseenter', () => {
  //         button.style.transform = 'scale(1.05)';
  //       });
  //       button.addEventListener('mouseleave', () => {
  //         button.style.transform = 'scale(1)';
  //       });
  //     });

  //     // Expose the speed setter globally
  //     (window as any).setMovementSpeedControl = (speed: number) => {
  //       setSpeedMultiplier(speed);
  //       const display = document.getElementById('current-speed-display');
  //       if (display) {
  //         display.textContent = `Current: x${speed}`;
  //       }
  //     };
  //   }
  // }, 100);

  return html`
    <bim-toolbar-group style="display: none;">
      <!-- Speed control panel is rendered as floating element -->
    </bim-toolbar-group>
  `;
}

/**
 * Get the current movement speed multiplier
 */
export function getCurrentSpeed(): number {
  return currentSpeed;
}

/**
 * Set movement speed programmatically
 */
export function setMovementSpeed(speed: number): void {
  if ([1, 2, 3].includes(speed)) {
    currentSpeed = speed;
    debugLog(`Movement speed set to: x${speed}`);
    
    // Update active button styling
    const buttons = document.querySelectorAll('.speed-button');
    buttons.forEach((button: any) => {
      const buttonSpeed = parseInt(button.dataset.speed);
      if (buttonSpeed === speed) {
        button.style.background = 'var(--bim-ui_main-base)';
        button.style.color = 'white';
      } else {
        button.style.background = 'var(--bim-ui_bg-contrast-20)';
        button.style.color = 'var(--bim-ui_color-text)';
      }
    });
    
    // Dispatch the speed change event
    const speedChangeEvent = new CustomEvent('movementSpeedChange', { 
      detail: { speed } 
    });
    window.dispatchEvent(speedChangeEvent);
  }
}

