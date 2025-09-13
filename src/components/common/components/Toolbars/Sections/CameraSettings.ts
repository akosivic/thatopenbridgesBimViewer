import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";

// Global reference to FPS controls - will be set from WorldViewer
export let fpControls: PointerLockControls | null = null;
export const setFPControls = (controls: PointerLockControls | null) => {
    fpControls = controls;
};

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

export default (world: OBC.World) => {

    // FPS Camera movement controls
    const moveStep = 1.0;

    const moveCamera = (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
        if (!fpControls) {
            console.log('FPS controls not initialized');
            return;
        }

        const camera3js = world.camera.three;
        const currentPos = camera3js.position.clone();

        console.log(`=== FPS CAMERA MOVEMENT: ${direction.toUpperCase()} ===`);
        console.log('Current position:', currentPos);

        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);

        camera3js.getWorldDirection(forward);
        forward.normalize();
        right.crossVectors(forward, up).normalize();

        let newPosition = currentPos.clone();

        switch (direction) {
            case 'forward':
                newPosition.add(forward.multiplyScalar(moveStep * getCurrentSpeed()));
                break;
            case 'backward':
                newPosition.add(forward.multiplyScalar(-moveStep * getCurrentSpeed()));
                break;
            case 'left':
                newPosition.add(right.multiplyScalar(-moveStep * getCurrentSpeed()));
                break;
            case 'right':
                newPosition.add(right.multiplyScalar(moveStep * getCurrentSpeed()));
                break;
            case 'up':
                newPosition.y += moveStep * getCurrentSpeed();
                break;
            case 'down':
                newPosition.y -= moveStep * getCurrentSpeed();
                break;
        }

        newPosition.y = Math.max(0.1, newPosition.y);
        camera3js.position.copy(newPosition);
        console.log('New position:', newPosition);
    };

    // Rotation controls
    const rotationStep = 0.1; // radians for FPS rotation

    const rotateCamera = (direction: 'left' | 'right' | 'up' | 'down') => {
        if (!fpControls) {
            console.log('FPS controls not initialized');
            return;
        }

        const camera3js = world.camera.three;
        console.log(`=== FPS CAMERA ROTATION: ${direction.toUpperCase()} ===`);

        const euler = new THREE.Euler().setFromQuaternion(camera3js.quaternion, 'YXZ');

        switch (direction) {
            case 'left':
                euler.y -= rotationStep; // Rotate left (counter-clockwise around Y)
                break;
            case 'right':
                euler.y += rotationStep; // Rotate right (clockwise around Y)
                break;
            case 'up':
                euler.x = Math.max(-Math.PI / 2 + 0.1, euler.x - rotationStep); // Look up (clamp to prevent flip)
                break;
            case 'down':
                euler.x = Math.min(Math.PI / 2 - 0.1, euler.x + rotationStep); // Look down (clamp to prevent flip)
                break;
        }

        // Apply rotation to camera
        camera3js.setRotationFromEuler(euler);

        console.log('New rotation (degrees):', {
            x: euler.x * 180 / Math.PI,
            y: euler.y * 180 / Math.PI,
            z: euler.z * 180 / Math.PI
        });
    };


    // Speed control functions
    const setSpeed = (multiplier: number) => {
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
        const speedButtons = document.querySelectorAll('.camera-speed-button');
        speedButtons.forEach((button: any) => {
            const buttonSpeed = parseInt(button.dataset.speed);
            if (buttonSpeed === multiplier) {
                button.style.background = '#6528d7';
            } else {
                button.style.background = 'rgba(255, 255, 255, 0.2)';
            }
        });

        // Update display
        const display = document.getElementById('camera-speed-display');
        if (display) {
            display.textContent = `Current: x${multiplier}`;
        }
    };

    // Set up global function for speed control access
    (window as any).setCameraSpeed = setSpeed;

    return BUI.Component.create<BUI.PanelSection>(() => {
        return BUI.html`
      <bim-toolbar-section label="Camera Settings" icon="ph:camera-fill" style="pointer-events: auto">
        <!-- Position Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Position Controls</div>
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto auto; gap: 2px; align-items: center;">
            <div></div>
                <bim-button icon="material-symbols:keyboard-arrow-up" @click=${() => moveCamera('forward')} style="width: 30px; height: 30px;"></bim-button>
            <div></div>
            <bim-button icon="material-symbols:keyboard-arrow-left" @click=${() => moveCamera('left')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-down" @click=${() => moveCamera('backward')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-right" @click=${() => moveCamera('right')} style="width: 30px; height: 30px;"></bim-button>
            
          </div>
        </div>

        <!-- Rotation Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Rotation Controls</div>
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; gap: 2px; align-items: center;">
            <div></div>
            <bim-button icon="material-symbols:keyboard-arrow-up" @click=${() => rotateCamera('down')} style="width: 30px; height: 30px;" title="Look Up"></bim-button>
            <div></div>
            
            <bim-button icon="material-symbols:keyboard-arrow-left" @click=${() => rotateCamera('right')} style="width: 30px; height: 30px;" title="Turn Left"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-down" @click=${() => rotateCamera('up')} style="width: 30px; height: 30px;" title="Look Down"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-right" @click=${() => rotateCamera('left')} style="width: 30px; height: 30px;" title="Turn Right"></bim-button>
          </div>
        </div>

        <!-- Speed Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Movement Speed</div>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button 
              class="camera-speed-button"
              data-speed="1"
              onclick="window.setCameraSpeed(1)"
              title="Normal Speed (x1)"
              style="
                background: #6528d7;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 600;
                min-width: 40px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 11px;
              ">
              x1
            </button>
            <button 
              class="camera-speed-button"
              data-speed="2"
              onclick="window.setCameraSpeed(2)"
              title="Double Speed (x2)"
              style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 600;
                min-width: 40px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 11px;
              ">
              x2
            </button>
            <button 
              class="camera-speed-button"
              data-speed="3"
              onclick="window.setCameraSpeed(3)"
              title="Triple Speed (x3)"
              style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 600;
                min-width: 40px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 11px;
              ">
              x3
            </button>
          </div>
          <div style="
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            margin-top: 4px;
          " id="camera-speed-display">
            Current: x1
          </div>
        </div>
      </bim-toolbar-section>
    `;
    });
};